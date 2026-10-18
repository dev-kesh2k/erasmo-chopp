import type { Order, OrderStatus, PaymentMethod } from './api';

export function brl(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parts = (day: string) => day.split('-').map(Number) as [number, number, number];
export const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const dayNum = (day: string) => parts(day)[2];
export const monthShort = (day: string) => MONTHS_SHORT[parts(day)[1] - 1];

/** "Sexta, 16 de outubro" */
export function fmtLong(day: string) {
  const [, m, d] = parts(day);
  return `${WEEKDAYS[weekdayOf(day)]}, ${d} de ${MONTHS[m - 1]}`;
}

/** "Sex 16 out" */
export function fmtShort(day: string) {
  return `${WEEKDAYS_SHORT[weekdayOf(day)]} ${dayNum(day)} ${monthShort(day)}`;
}

/** Hoje / Amanhã / "Sex 16 out" */
export function fmtRelative(day: string, today: string) {
  if (day === today) return 'Hoje';
  if (day === addDays(today, 1)) return 'Amanhã';
  return fmtShort(day);
}

export const fmtWindow = (w: string) => w.replace('-', ' às ');

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');
}

export const STATUS: Record<OrderStatus, { label: string; text: string; bg: string }> = {
  received: { label: 'Recebido', text: 'text-warn', bg: 'bg-warnbg' },
  confirmed: { label: 'Confirmado', text: 'text-accent', bg: 'bg-tint2' },
  out_for_delivery: { label: 'Saiu para entrega', text: 'text-ok', bg: 'bg-okbg' },
  delivered: { label: 'Entregue', text: 'text-soft', bg: 'bg-surface2' },
  cancelled: { label: 'Cancelado', text: 'text-bad', bg: 'bg-badbg' },
};

export const FLOW: OrderStatus[] = ['received', 'confirmed', 'out_for_delivery', 'delivered'];

export const METHOD: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão na entrega',
};

export const addressLine = (o: Pick<Order, 'street' | 'houseNumber' | 'complement' | 'district'>) =>
  [`${o.street}, ${o.houseNumber}`, o.complement, o.district].filter(Boolean).join(' · ');

export const mapsLink = (o: Pick<Order, 'street' | 'houseNumber' | 'district'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.street}, ${o.houseNumber} - ${o.district}`)}`;

/** Converte "350,00" / "350" em centavos. */
export function parseMoney(v: string): number | null {
  const s = v.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const moneyInput = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const waLink = (phone: string, text = '') => {
  let d = phone.replace(/\D/g, '');
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/** Texto do pedido para enviar no WhatsApp. */
export function orderText(o: Order, storeName: string) {
  const lines = [
    `*Pedido #${o.number}* — ${storeName}`,
    ...o.items.map((i) => `• ${i.quantity}× ${i.name} (${brl(i.unitPriceCents * i.quantity)})`),
    `Entrega: ${brl(o.feeCents)}`,
    `*Total: ${brl(o.totalCents)}* · ${METHOD[o.paymentMethod]}${o.changeForCents ? ` (troco para ${brl(o.changeForCents)})` : ''}`,
    `📅 ${fmtLong(o.deliveryDate)}, ${fmtWindow(o.deliveryWindow)}`,
    `📍 ${addressLine(o)}${o.reference ? ` (${o.reference})` : ''}`,
    `👤 ${o.customerName} · ${o.phone}`,
  ];
  if (o.notes) lines.push(`Obs.: ${o.notes}`);
  return lines.join('\n');
}

/** Reduz a imagem no navegador (máx. 1280 px, JPEG) antes de enviar. */
export function resizeImage(file: File, max = 1280, type = 'image/jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type && !file.type.startsWith('image/')) return reject(new Error('Escolha uma imagem'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(type, 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem'));
    };
    img.src = url;
  });
}
