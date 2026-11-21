// Regras da loja: horários e dias de entrega, configurações públicas e status (sem banco: testáveis).
import { addDays, nowTime, todayStr, toMin, weekday } from './dates.js';
import { HttpError } from './validate.js';

export const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
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
  return JSON.stringify([...new Set(out)].sort((a, b) => a.localeCompare(b)));
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
