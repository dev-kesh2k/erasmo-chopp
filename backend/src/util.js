import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// O Postgres do Hub é compartilhado (max_connections baixo): limita o pool deste app.
function dbUrl() {
  const raw = process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    const max = Number(process.env.DB_POOL_SIZE) || 3;
    const current = Number(u.searchParams.get('connection_limit')) || Infinity;
    u.searchParams.set('connection_limit', String(Math.min(current, max)));
    return u.toString();
  } catch {
    return raw;
  }
}

// A foto (bytes) só é lida pela rota da imagem.
export const prisma = new PrismaClient({ datasources: { db: { url: dbUrl() } }, omit: { product: { photo: true } } });

export { HttpError } from './validate.js';
import { HttpError } from './validate.js';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export { TZ, todayStr, nowTime, isDay, isMonth, addDays, weekday, monthRange, toMin } from './dates.js';

// ---------- Autenticação ----------
const SECRET = process.env.JWT_SECRET || '';
if (!SECRET) console.warn('JWT_SECRET não definido: usando segredo temporário (sessões caem ao reiniciar).');
const KEY = SECRET || crypto.randomBytes(32).toString('hex');

export const signToken = (user) => jwt.sign({ sub: user.id }, KEY, { expiresIn: '30d' });

export function publicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const { sub } = jwt.verify(token, KEY);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada' });
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Apenas administradores'));
  next();
}

// Limites simples por IP (memória do processo).
const WINDOW = 15 * 60_000;
const buckets = new Map();
function hits(key) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < WINDOW);
  buckets.set(key, list);
  return list;
}
export const tooManyAttempts = (key) => hits(`login:${key}`).length >= 10;
export const recordFailure = (key) => hits(`login:${key}`).push(Date.now());
export const clearFailures = (key) => buckets.delete(`login:${key}`);
export function limit(ip, kind, max) {
  const list = hits(`${kind}:${ip}`);
  if (list.length >= max) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  list.push(Date.now());
}

export { text, email, password, phoneKey, mobile, formatPhone, int, oneOf, image, url } from './validate.js';

// ---------- Configurações da loja ----------
export { DEFAULT_WINDOWS, DEFAULT_DAYS, parseWindows, checkWindows, parseDays, PUBLIC_SETTINGS, deliveryDates, windowsFor, brl, STATUSES, OPEN_STATUSES, PAYMENT_METHODS } from './store-rules.js';
import { HHMM, PUBLIC_SETTINGS, parseWindows, parseDays } from './store-rules.js';

export async function getSettings() {
  const rows = await prisma.setting.findMany({ where: { key: { not: 'logo' } } });
  const s = { ...PUBLIC_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key] = r.value;
  return {
    ...s,
    logoVersion: Number(s.logoVersion) || 0,
    acceptingOrders: s.acceptingOrders !== 'false',
    minOrderCents: Number(s.minOrderCents) || 0,
    leadDays: Number(s.leadDays) || 0,
    maxDays: Number(s.maxDays) || 14,
    cutoffTime: HHMM.test(s.cutoffTime) ? s.cutoffTime : '17:00',
    windows: parseWindows(s.windows),
    deliveryDays: parseDays(s.deliveryDays),
  };
}
