import express from 'express';
import bcrypt from 'bcryptjs';
import {
  prisma,
  HttpError,
  wrap,
  todayStr,
  nowTime,
  signToken,
  publicUser,
  requireAuth,
  tooManyAttempts,
  recordFailure,
  clearFailures,
  limit,
  text,
  email,
  password,
  mobile,
  getSettings,
  deliveryDates,
  windowsFor,
} from './util.js';
import { createOrder, orderInclude, serializeOrder, restock } from './orders.js';
import { admin } from './admin.js';

// Clientes não têm conta: pedem e acompanham pelo celular. Só a loja (admin) faz login.
export const api = express.Router();

api.get('/health', wrap(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, db: 'up' });
}));

api.get('/config', wrap(async (_req, res) => {
  const s = await getSettings();
  const dates = deliveryDates(s);
  res.json({
    ...s,
    deliveryDates: dates.map((day) => ({ day, windows: windowsFor(s, day) })).filter((d) => d.windows.length),
    today: todayStr(),
    now: nowTime(),
  });
}));

api.get('/logo', wrap(async (_req, res) => {
  const row = await prisma.setting.findUnique({ where: { key: 'logo' } });
  const m = row && /^data:([\w/+.-]+);base64,(.+)$/.exec(row.value);
  if (!m) throw new HttpError(404, 'Sem logo');
  res.set('Content-Type', m[1]).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(m[2], 'base64'));
}));

// ---------- Cardápio ----------
api.get('/catalog', wrap(async (_req, res) => {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  ]);
  const catOrder = new Map(categories.map((c, i) => [c.id, i]));
  const rank = (p) => catOrder.get(p.categoryId) ?? categories.length;
  res.json({
    categories: categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name })),
    products: products.sort((a, b) => rank(a) - rank(b)).map(({ createdAt, sortOrder, ...p }) => p),
  });
}));

api.get('/products/:id/photo', wrap(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id }, select: { photo: true, photoMime: true } });
  if (!p?.photo || !p.photoMime) throw new HttpError(404, 'Sem foto');
  res.set('Content-Type', p.photoMime).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(p.photo));
}));

// ---------- Pedidos do cliente (pelo celular) ----------
api.post('/orders', wrap(async (req, res) => {
  limit(req.ip, 'order', 20);
  const order = await createOrder(req.body || {});
  res.status(201).json(serializeOrder(order));
}));

api.get('/orders', wrap(async (req, res) => {
  limit(req.ip, 'lookup', 60);
  const { key } = mobile(req.query.phone);
  const list = await prisma.order.findMany({ where: { phoneKey: key }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(list.map(serializeOrder));
}));

async function ownOrder(req) {
  limit(req.ip, 'lookup', 60);
  const { key } = mobile(req.query.phone || req.body?.phone);
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!o || o.phoneKey !== key) throw new HttpError(404, 'Pedido não encontrado');
  return o;
}

api.get('/orders/:id', wrap(async (req, res) => {
  res.json(serializeOrder(await ownOrder(req)));
}));

api.post('/orders/:id/cancel', wrap(async (req, res) => {
  const o = await ownOrder(req);
  if (o.status !== 'received') throw new HttpError(409, 'O pedido já foi confirmado pela loja. Fale com a loja para cancelar.');
  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: o.id, status: 'received' }, data: { status: 'cancelled', cancelReason: 'Cancelado pelo cliente' } });
    if (!r.count) throw new HttpError(409, 'O pedido mudou de situação. Atualize a tela.');
    await restock(tx, o);
    return tx.order.findUnique({ where: { id: o.id }, include: orderInclude });
  });
  res.json(serializeOrder(updated));
}));

// ---------- Login da loja ----------
api.post('/auth/login', wrap(async (req, res) => {
  const mail = email(req.body?.email);
  const key = `${req.ip}|${mail}`;
  if (tooManyAttempts(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
  const user = await prisma.user.findUnique({ where: { email: mail } });
  if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.passwordHash))) {
    recordFailure(key);
    throw new HttpError(401, 'E-mail ou senha incorretos');
  }
  clearFailures(key);
  res.json({ token: signToken(user), user: publicUser(user) });
}));

api.get('/auth/me', requireAuth, wrap(async (req, res) => {
  const pending = await prisma.order.count({ where: { status: 'received' } });
  res.json({ user: publicUser(req.user), unread: pending });
}));

api.put('/auth/me', requireAuth, wrap(async (req, res) => {
  const data = { name: text(req.body?.name, 'Nome', { required: true, max: 80 }), email: email(req.body?.email) };
  if (req.body?.newPassword) {
    if (!(await bcrypt.compare(String(req.body?.currentPassword || ''), req.user.passwordHash))) throw new HttpError(400, 'Senha atual incorreta');
    data.passwordHash = await bcrypt.hash(password(req.body.newPassword), 10);
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: publicUser(user) });
}));

api.use('/admin', admin);
