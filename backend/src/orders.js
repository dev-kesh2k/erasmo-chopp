import {
  prisma,
  HttpError,
  text,
  int,
  oneOf,
  mobile,
  isDay,
  getSettings,
  deliveryDates,
  windowsFor,
  brl,
  PAYMENT_METHODS,
} from './util.js';

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
    zoneName: o.zoneName,
    deliveryDate: o.deliveryDate,
    deliveryWindow: o.deliveryWindow,
    subtotalCents: o.subtotalCents,
    feeCents: o.feeCents,
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

  const { raw, key } = mobile(body.phone);
  const customerName = text(body.customerName, 'Nome', { required: true, max: 80 });
  const street = text(body.street, 'Endereço', { required: true, max: 160 });
  const houseNumber = text(body.houseNumber, 'Número', { required: true, max: 20 });
  const complement = text(body.complement, 'Complemento', { max: 80 });
  const reference = text(body.reference, 'Ponto de referência', { max: 160 });
  const notes = text(body.notes, 'Observações', { max: 500 });
  const paymentMethod = oneOf(body.paymentMethod, 'Forma de pagamento', PAYMENT_METHODS);

  if (!isDay(body.deliveryDate) || !deliveryDates(s).includes(body.deliveryDate)) throw new HttpError(400, 'Escolha uma data de entrega disponível');
  if (!windowsFor(s, body.deliveryDate).includes(body.deliveryWindow)) throw new HttpError(400, 'Escolha um horário de entrega disponível');

  const zone = await prisma.deliveryZone.findFirst({ where: { id: String(body.zoneId || ''), active: true } });
  if (!zone) throw new HttpError(400, 'Escolha o bairro de entrega');

  if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'O carrinho está vazio');
  if (body.items.length > 50) throw new HttpError(400, 'Itens demais no pedido');
  const wanted = new Map();
  for (const it of body.items) {
    const id = String(it?.productId || '');
    const qty = int(it?.quantity, 'Quantidade', { min: 1, max: 999 });
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

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
    const total = subtotal + zone.feeCents;

    let changeForCents = 0;
    if (paymentMethod === 'cash' && body.changeForCents) {
      changeForCents = int(body.changeForCents, 'Troco para', { min: 0, max: 10_000_000 });
      if (changeForCents && changeForCents < total) throw new HttpError(400, `O troco deve ser para um valor maior que ${brl(total)}`);
    }

    return tx.order.create({
      data: {
        customerName,
        phone: raw,
        phoneKey: key,
        street,
        houseNumber,
        complement,
        district: zone.name,
        reference,
        zoneId: zone.id,
        zoneName: zone.name,
        deliveryDate: body.deliveryDate,
        deliveryWindow: body.deliveryWindow,
        subtotalCents: subtotal,
        feeCents: zone.feeCents,
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
