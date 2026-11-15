import express from 'express';
import {
  prisma,
  HttpError,
  wrap,
  requireAuth,
  requireAdmin,
  todayStr,
  addDays,
  isDay,
  isMonth,
  monthRange,
  text,
  int,
  oneOf,
  image,
  url,
  getSettings,
  checkWindows,
  STATUSES,
  OPEN_STATUSES,
} from './util.js';
import { ordersCsv } from './orders-csv.js';
import { orderInclude, serializeOrder, restock } from './orders.js';

export const admin = express.Router();
admin.use(requireAuth, requireAdmin);

// ---------- Painel ----------
admin.get('/summary', wrap(async (_req, res) => {
  const today = todayStr();
  const month = today.slice(0, 7);
  const [byStatus, todayOrders, monthAgg, todayAgg, lowStock] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: { status: { in: OPEN_STATUSES } }, _count: true }),
    prisma.order.findMany({
      where: { deliveryDate: today, status: { in: OPEN_STATUSES } },
      include: orderInclude,
      orderBy: [{ deliveryWindow: 'asc' }, { number: 'asc' }],
    }),
    prisma.order.aggregate({ where: { status: 'delivered', deliveryDate: { startsWith: month } }, _sum: { totalCents: true }, _count: true }),
    prisma.order.aggregate({ where: { status: 'delivered', deliveryDate: today }, _sum: { totalCents: true }, _count: true }),
    prisma.product.findMany({ where: { active: true, stock: { not: null, lte: 3 } }, select: { id: true, name: true, stock: true, unit: true }, orderBy: { stock: 'asc' } }),
  ]);
  const counts = Object.fromEntries(OPEN_STATUSES.map((s) => [s, 0]));
  for (const r of byStatus) counts[r.status] = r._count;
  res.json({
    today,
    counts,
    todayOrders: todayOrders.map(serializeOrder),
    todayRevenueCents: todayAgg._sum.totalCents || 0,
    todayDelivered: todayAgg._count,
    monthRevenueCents: monthAgg._sum.totalCents || 0,
    monthDelivered: monthAgg._count,
    lowStock,
  });
}));

// ---------- Pedidos ----------
admin.get('/orders', wrap(async (req, res) => {
  const where = {};
  const status = String(req.query.status || 'open');
  if (status === 'open') where.status = { in: OPEN_STATUSES };
  else if (status !== 'all') where.status = oneOf(status, 'Situação', STATUSES);
  if (req.query.date) {
    if (!isDay(req.query.date)) throw new HttpError(400, 'Data inválida');
    where.deliveryDate = req.query.date;
  }
  const q = text(req.query.q, 'Busca', { max: 80 });
  if (q) {
    const n = Number(q.replace(/^#/, ''));
    const digitsOnly = q.replace(/\D/g, '');
    where.OR = [
      { customerName: { contains: q, mode: 'insensitive' } },
      ...(Number.isInteger(n) && n > 0 && n < 2 ** 31 ? [{ number: n }] : []),
      ...(digitsOnly.length >= 4 ? [{ phoneKey: { contains: digitsOnly } }] : []),
    ];
  }
  const list = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: status === 'open' ? [{ deliveryDate: 'asc' }, { deliveryWindow: 'asc' }, { number: 'asc' }] : [{ createdAt: 'desc' }],
    take: 200,
  });
  res.json(list.map(serializeOrder));
}));

admin.get('/orders/:id', wrap(async (req, res) => {
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!o) throw new HttpError(404, 'Pedido não encontrado');
  res.json(serializeOrder(o));
}));

const NEXT = { received: ['confirmed', 'cancelled'], confirmed: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered', 'confirmed', 'cancelled'], delivered: [], cancelled: [] };

admin.patch('/orders/:id/status', wrap(async (req, res) => {
  const to = oneOf(req.body?.status, 'Situação', STATUSES);
  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
    if (!o) throw new HttpError(404, 'Pedido não encontrado');
    if (!NEXT[o.status].includes(to)) throw new HttpError(409, 'Mudança de situação não permitida');
    const data = { status: to };
    if (to === 'cancelled') {
      data.cancelReason = text(req.body?.reason, 'Motivo', { max: 300 }) || 'Cancelado pela loja';
      await restock(tx, o);
    }
    if (to === 'delivered') {
      data.deliveredAt = new Date();
      if (req.body?.paid) data.paid = true;
    }
    const r = await tx.order.updateMany({ where: { id: o.id, status: o.status }, data });
    if (!r.count) throw new HttpError(409, 'O pedido mudou de situação. Atualize a tela.');
    return tx.order.findUnique({ where: { id: o.id }, include: orderInclude });
  });
  res.json(serializeOrder(updated));
}));

admin.patch('/orders/:id/paid', wrap(async (req, res) => {
  const o = await prisma.order.update({ where: { id: req.params.id }, data: { paid: !!req.body?.paid }, include: orderInclude });
  res.json(serializeOrder(o));
}));

// ---------- Categorias ----------
admin.get('/categories', wrap(async (_req, res) => {
  const list = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { products: true } } } });
  res.json(list.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, products: c._count.products })));
}));

admin.post('/categories', wrap(async (req, res) => {
  const name = text(req.body?.name, 'Nome', { required: true, max: 60 });
  const sortOrder = (await prisma.category.count()) + 1;
  res.status(201).json(await prisma.category.create({ data: { name, sortOrder } }));
}));

admin.put('/categories/:id', wrap(async (req, res) => {
  const data = { name: text(req.body?.name, 'Nome', { required: true, max: 60 }) };
  if (req.body?.sortOrder !== undefined) data.sortOrder = int(req.body.sortOrder, 'Ordem', { max: 9999 });
  res.json(await prisma.category.update({ where: { id: req.params.id }, data }));
}));

admin.delete('/categories/:id', wrap(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ---------- Produtos ----------
admin.get('/products', wrap(async (_req, res) => {
  const list = await prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  res.json(list);
}));

async function productData(body) {
  const data = {
    name: text(body.name, 'Nome', { required: true, max: 80 }),
    description: text(body.description, 'Descrição', { max: 400 }),
    unit: text(body.unit, 'Unidade', { max: 30 }) || 'un',
    priceCents: int(body.priceCents, 'Preço', { min: 0, max: 100_000_000 }),
    stock: body.stock === null || body.stock === '' || body.stock === undefined ? null : int(body.stock, 'Estoque', { min: 0, max: 1_000_000 }),
    active: body.active !== false,
    featured: !!body.featured,
    sortOrder: body.sortOrder === undefined ? 0 : int(body.sortOrder, 'Ordem', { max: 9999 }),
  };
  const categoryId = String(body.categoryId || '');
  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) throw new HttpError(400, 'Categoria inválida');
  data.categoryId = categoryId || null;
  return data;
}

admin.post('/products', wrap(async (req, res) => {
  res.status(201).json(await prisma.product.create({ data: await productData(req.body || {}) }));
}));

admin.put('/products/:id', wrap(async (req, res) => {
  res.json(await prisma.product.update({ where: { id: req.params.id }, data: await productData(req.body || {}) }));
}));

admin.delete('/products/:id', wrap(async (req, res) => {
  // Mantém o histórico dos pedidos (o item guarda nome e preço).
  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

admin.post('/products/:id/photo', wrap(async (req, res) => {
  const { mime, data } = image(req.body?.data);
  const p = await prisma.product.update({ where: { id: req.params.id }, data: { photo: data, photoMime: mime, photoVersion: { increment: 1 } } });
  res.json({ photoVersion: p.photoVersion });
}));

admin.delete('/products/:id/photo', wrap(async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { photo: null, photoMime: '', photoVersion: 0 } });
  res.json({ photoVersion: 0 });
}));

// ---------- Financeiro ----------
admin.get('/finance', wrap(async (req, res) => {
  const month = String(req.query.month || todayStr().slice(0, 7));
  if (!isMonth(month)) throw new HttpError(400, 'Mês inválido');
  const { from, to } = monthRange(month);
  const orders = await prisma.order.findMany({
    where: { status: 'delivered', deliveryDate: { gte: from, lte: to } },
    include: { items: true },
  });
  const byDay = {};
  for (let d = from; d <= to; d = addDays(d, 1)) byDay[d] = 0;
  const byMethod = { pix: 0, cash: 0, card: 0 };
  const products = new Map();
  let total = 0;
  let unpaid = 0;
  for (const o of orders) {
    total += o.totalCents;
    if (!o.paid) unpaid += o.totalCents;
    byDay[o.deliveryDate] = (byDay[o.deliveryDate] || 0) + o.totalCents;
    byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] || 0) + o.totalCents;
    for (const i of o.items) {
      const p = products.get(i.name) || { name: i.name, quantity: 0, totalCents: 0 };
      p.quantity += i.quantity;
      p.totalCents += i.quantity * i.unitPriceCents;
      products.set(i.name, p);
    }
  }
  const cancelled = await prisma.order.count({ where: { status: 'cancelled', deliveryDate: { gte: from, lte: to } } });
  res.json({
    month,
    totalCents: total,
    unpaidCents: unpaid,
    orders: orders.length,
    cancelled,
    averageCents: orders.length ? Math.round(total / orders.length) : 0,
    byDay: Object.entries(byDay).map(([day, cents]) => ({ day, cents })),
    byMethod,
    topProducts: [...products.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 10),
  });
}));

/** Todos os pedidos do mês (qualquer status), pela data de entrega, em CSV. */
admin.get('/finance/export', wrap(async (req, res) => {
  const month = String(req.query.month || todayStr().slice(0, 7));
  if (!isMonth(month)) throw new HttpError(400, 'Mês inválido');
  const { from, to } = monthRange(month);
  const orders = await prisma.order.findMany({ where: { deliveryDate: { gte: from, lte: to } }, include: { items: true } });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="pedidos-${month}.csv"`);
  res.send(ordersCsv(orders));
}));

// ---------- Configurações ----------
admin.get('/settings', wrap(async (_req, res) => {
  res.json(await getSettings());
}));

admin.put('/settings', wrap(async (req, res) => {
  const b = req.body || {};
  const out = {};
  const set = (k, v) => (out[k] = String(v));
  if ('storeName' in b) set('storeName', text(b.storeName, 'Nome da loja', { required: true, max: 60 }));
  if ('tagline' in b) set('tagline', text(b.tagline, 'Frase de destaque', { max: 120 }));
  if ('phone' in b) set('phone', text(b.phone, 'Telefone', { max: 30 }));
  if ('whatsapp' in b) set('whatsapp', text(b.whatsapp, 'WhatsApp', { max: 30 }));
  if ('address' in b) set('address', text(b.address, 'Endereço', { max: 200 }));
  if ('about' in b) set('about', text(b.about, 'Sobre', { max: 1500 }));
  if ('instagram' in b) set('instagram', url(b.instagram, 'Instagram'));
  if ('pixKey' in b) set('pixKey', text(b.pixKey, 'Chave Pix', { max: 120 }));
  if ('acceptingOrders' in b) set('acceptingOrders', !!b.acceptingOrders);
  if ('minOrderCents' in b) set('minOrderCents', int(b.minOrderCents, 'Pedido mínimo', { max: 100_000_000 }));
  if ('leadDays' in b) set('leadDays', int(b.leadDays, 'Antecedência', { max: 30 }));
  if ('maxDays' in b) set('maxDays', int(b.maxDays, 'Dias à frente', { min: 1, max: 60 }));
  if ('cutoffTime' in b) {
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(String(b.cutoffTime))) throw new HttpError(400, 'Horário limite inválido');
    set('cutoffTime', b.cutoffTime);
  }
  if ('windows' in b) set('windows', checkWindows(b.windows));
  if ('deliveryDays' in b) {
    if (!Array.isArray(b.deliveryDays) || b.deliveryDays.length !== 7) throw new HttpError(400, 'Dias de entrega inválidos');
    if (!b.deliveryDays.some(Boolean)) throw new HttpError(400, 'Marque pelo menos um dia de entrega');
    out.deliveryDays = JSON.stringify(b.deliveryDays.map(Boolean));
  }
  await prisma.$transaction(Object.entries(out).map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
  res.json(await getSettings());
}));

admin.post('/logo', wrap(async (req, res) => {
  const { mime, data } = image(req.body?.data);
  const cur = Number((await prisma.setting.findUnique({ where: { key: 'logoVersion' } }))?.value) || 0;
  const version = String(cur + 1);
  const value = `data:${mime};base64,${data.toString('base64')}`;
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: 'logo' }, update: { value }, create: { key: 'logo', value } }),
    prisma.setting.upsert({ where: { key: 'logoVersion' }, update: { value: version }, create: { key: 'logoVersion', value: version } }),
  ]);
  res.json({ logoVersion: Number(version) });
}));

admin.delete('/logo', wrap(async (_req, res) => {
  await prisma.setting.deleteMany({ where: { key: { in: ['logo', 'logoVersion'] } } });
  res.json({ logoVersion: 0 });
}));
