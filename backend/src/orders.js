import { prisma, HttpError, int, isDay, getSettings, deliveryDates, windowsFor, brl } from './util.js';
import { parseOrderInput } from './order-input.js';

export const orderInclude = { items: { orderBy: { id: 'asc' } } };

export function serializeOrder(o) {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    phone: o.phone,
    street: o.street,
    houseNumber: o.houseNumber,
    complement: o.complement,
    district: o.district,
    reference: o.reference,
    latitude: o.latitude,
    longitude: o.longitude,
    voltage: o.voltage,
    deliveryDate: o.deliveryDate,
    deliveryWindow: o.deliveryWindow,
    subtotalCents: o.subtotalCents,
    totalCents: o.totalCents,
    paymentMethod: o.paymentMethod,
    changeForCents: o.changeForCents,
    paid: o.paid,
    status: o.status,
    notes: o.notes,
    cancelReason: o.cancelReason,
    deliveredAt: o.deliveredAt,
    createdAt: o.createdAt,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
    })),
  };
}

/** Valida o pedido, calcula os valores no servidor e baixa o estoque na mesma transação. */
export async function createOrder(body) {
  const s = await getSettings();
  if (!s.acceptingOrders) throw new HttpError(409, 'A loja não está recebendo pedidos no momento');

  const input = parseOrderInput(body);
  const { customerName, district, street, houseNumber, complement, reference, voltage, latitude, longitude, notes, paymentMethod, wanted } = input;

  if (!isDay(body.deliveryDate) || !deliveryDates(s).includes(body.deliveryDate)) throw new HttpError(400, 'Escolha uma data de entrega disponível');
  if (!windowsFor(s, body.deliveryDate).includes(body.deliveryWindow)) throw new HttpError(400, 'Escolha um horário de entrega disponível');

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: [...wanted.keys()] }, active: true } });
    if (products.length !== wanted.size) throw new HttpError(409, 'Algum produto do carrinho não está mais disponível. Revise o carrinho.');
    let subtotal = 0;
    const items = [];
    for (const p of products) {
      const qty = wanted.get(p.id);
      if (p.stock !== null) {
        // Baixa condicional: falha se outro pedido levou o estoque antes.
        const r = await tx.product.updateMany({ where: { id: p.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
        if (!r.count) throw new HttpError(409, `Estoque insuficiente de ${p.name} (restam ${p.stock})`);
      }
      subtotal += p.priceCents * qty;
      items.push({ productId: p.id, name: p.name, unit: p.unit, unitPriceCents: p.priceCents, quantity: qty });
    }
    if (subtotal < s.minOrderCents) throw new HttpError(400, `Pedido mínimo de ${brl(s.minOrderCents)} (sem a entrega)`);
    const total = subtotal; // entrega grátis

    let changeForCents = 0;
    if (paymentMethod === 'cash' && body.changeForCents) {
      changeForCents = int(body.changeForCents, 'Troco para', { min: 0, max: 10_000_000 });
      if (changeForCents && changeForCents < total) throw new HttpError(400, `O troco deve ser para um valor maior que ${brl(total)}`);
    }

    return tx.order.create({
      data: {
        customerName,
        phone: input.phone,
        phoneKey: input.phoneKey,
        street,
        houseNumber,
        complement,
        district,
        reference,
        latitude,
        longitude,
        voltage,
        deliveryDate: body.deliveryDate,
        deliveryWindow: body.deliveryWindow,
        subtotalCents: subtotal,
        totalCents: total,
        paymentMethod,
        changeForCents,
        notes,
        items: { create: items },
      },
      include: orderInclude,
    });
  });
}

/** Devolve ao estoque os itens de um pedido cancelado. */
export async function restock(tx, order) {
  for (const it of order.items) {
    if (!it.productId) continue;
    await tx.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { increment: it.quantity } } });
  }
}
