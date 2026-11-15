// Pedidos do mês em CSV para a contabilidade/planilha da loja (sem banco: testável).

const STATUS = { received: 'recebido', confirmed: 'confirmado', out_for_delivery: 'saiu para entrega', delivered: 'entregue', cancelled: 'cancelado' };
const METHOD = { pix: 'Pix', cash: 'dinheiro', card: 'cartão' };

/** Célula CSV: aspas quando precisa e bloqueio de fórmula (= + - @ no início viram texto). */
export function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Centavos no formato do Excel em português (1234 → 12,34). */
export const money = (cents) => (cents / 100).toFixed(2).replace('.', ',');

/** Um pedido por linha, em ordem de entrega e número; ponto e vírgula + BOM para abrir certo no Excel. */
export function ordersCsv(orders) {
  const header = ['pedido', 'entrega', 'janela', 'cliente', 'telefone', 'bairro', 'itens', 'subtotal', 'total', 'pagamento', 'pago', 'status'];
  const rows = [...orders]
    .sort((a, b) => (a.deliveryDate === b.deliveryDate ? a.number - b.number : a.deliveryDate < b.deliveryDate ? -1 : 1))
    .map((o) => [
      o.number,
      o.deliveryDate,
      o.deliveryWindow,
      o.customerName,
      o.phone,
      o.district,
      (o.items || []).map((i) => `${i.quantity}× ${i.name}`).join(', '),
      money(o.subtotalCents),
      money(o.totalCents),
      METHOD[o.paymentMethod] || o.paymentMethod,
      o.paid ? 'sim' : 'não',
      STATUS[o.status] || o.status,
    ]);
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`;
}
