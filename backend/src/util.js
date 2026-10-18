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

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Datas no fuso da loja ----------
export const TZ = process.env.TZ || 'America/Sao_Paulo';

export function todayStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function nowTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay();

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from: `${month}-01`, to: addDays(next, -1) };
}

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

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

// ---------- Validação ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function text(v, field, { max = 200, required = false } = {}) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new HttpError(400, `${field} é obrigatório`);
  if (s.length > max) throw new HttpError(400, `${field} deve ter no máximo ${max} caracteres`);
  return s;
}

export function email(v) {
  const s = text(v, 'E-mail', { max: 160, required: true }).toLowerCase();
  if (!EMAIL_RE.test(s)) throw new HttpError(400, 'E-mail inválido');
  return s;
}

export function password(v) {
  if (typeof v !== 'string' || v.length < 8) throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres');
  if (v.length > 200) throw new HttpError(400, 'Senha muito longa');
  return v;
}

/** Celular normalizado (DDD + número, sem o 55). */
export function phoneKey(v) {
  let d = String(v || '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

export function mobile(v) {
  const raw = text(v, 'Celular', { required: true, max: 30 });
  const key = phoneKey(raw);
  if (key.length < 10 || key.length > 11) throw new HttpError(400, 'Informe o celular com DDD (ex.: 11 91234-5678)');
  return { raw, key };
}

export const formatPhone = (key) =>
  key.length === 11 ? `(${key.slice(0, 2)}) ${key.slice(2, 7)}-${key.slice(7)}` : key.length === 10 ? `(${key.slice(0, 2)}) ${key.slice(2, 6)}-${key.slice(6)}` : key;

export function int(v, field, { min = 0, max = 1_000_000_000 } = {}) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new HttpError(400, `${field} inválido`);
  if (n < min || n > max) throw new HttpError(400, `${field} deve estar entre ${min} e ${max}`);
  return n;
}

export function oneOf(v, field, list) {
  if (!list.includes(v)) throw new HttpError(400, `${field} inválido`);
  return v;
}

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export function image(v) {
  const m = typeof v === 'string' ? /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(v) : null;
  if (!m || !IMAGE_MIMES.includes(m[1])) throw new HttpError(400, 'Imagem inválida (use JPG, PNG ou WebP)');
  const data = Buffer.from(m[2], 'base64');
  if (data.length > 2_500_000) throw new HttpError(413, 'Imagem muito grande (máx. 2,5 MB)');
  return { mime: m[1], data };
}

export function url(v, field) {
  const s = text(v, field, { max: 300 });
  if (s && !/^https?:\/\/[^\s]+$/i.test(s)) throw new HttpError(400, `${field}: informe um link começando com https://`);
  return s;
}

// ---------- Configurações da loja ----------
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
export const DEFAULT_WINDOWS = ['10:00-12:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
/** Dias de entrega (índice 0 = domingo). */
export const DEFAULT_DAYS = [false, true, true, true, true, true, true];

export function parseWindows(raw) {
  try {
    const a = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(a)) return DEFAULT_WINDOWS;
    return a.filter((w) => typeof w === 'string' && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(w));
  } catch {
    return DEFAULT_WINDOWS;
  }
}

export function checkWindows(v) {
  if (!Array.isArray(v) || !v.length || v.length > 12) throw new HttpError(400, 'Informe de 1 a 12 horários de entrega');
  const out = v.map((w) => {
    const [from, to] = String(w).split('-');
    if (!HHMM.test(from || '') || !HHMM.test(to || '') || toMin(from) >= toMin(to)) throw new HttpError(400, `Horário inválido: ${w}`);
    return `${from}-${to}`;
  });
  return JSON.stringify([...new Set(out)].sort());
}

export function parseDays(raw) {
  try {
    const a = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(a) && a.length === 7 ? a.map(Boolean) : DEFAULT_DAYS;
  } catch {
    return DEFAULT_DAYS;
  }
}

/** Visíveis para o cliente (GET /config). */
export const PUBLIC_SETTINGS = {
  storeName: "Erasmo Chopp",
  tagline: 'Peça pelo app e receba em casa',
  phone: '',
  whatsapp: '',
  address: '',
  about: '',
  instagram: '',
  pixKey: '',
  logoVersion: '0',
  acceptingOrders: 'true',
  minOrderCents: '0',
  leadDays: '0', // antecedência mínima (0 = entrega no mesmo dia)
  maxDays: '14',
  cutoffTime: '17:00', // depois deste horário, hoje não aparece mais
  windows: JSON.stringify(DEFAULT_WINDOWS),
  deliveryDays: JSON.stringify(DEFAULT_DAYS),
};

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

/** Dias disponíveis para entrega, a partir de hoje. */
export function deliveryDates(s, now = new Date()) {
  const today = todayStr(now);
  const time = nowTime(now);
  const out = [];
  for (let i = s.leadDays; i <= s.leadDays + s.maxDays && out.length < s.maxDays; i++) {
    const day = addDays(today, i);
    if (!s.deliveryDays[weekday(day)]) continue;
    if (day === today && toMin(time) >= toMin(s.cutoffTime)) continue;
    out.push(day);
  }
  return out;
}

/** Janelas ainda possíveis no dia (hoje: só as que começam depois de agora). */
export function windowsFor(s, day, now = new Date()) {
  if (day !== todayStr(now)) return s.windows;
  const t = toMin(nowTime(now));
  return s.windows.filter((w) => toMin(w.split('-')[0]) > t);
}

export const brl = (cents) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const STATUSES = ['received', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
export const OPEN_STATUSES = ['received', 'confirmed', 'out_for_delivery'];
export const PAYMENT_METHODS = ['pix', 'cash', 'card'];
