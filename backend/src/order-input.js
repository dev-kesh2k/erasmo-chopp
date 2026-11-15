// Validação dos dados que o cliente manda no pedido (sem banco nem configurações da loja: testável).
// Data/horário de entrega, estoque e pedido mínimo dependem da loja e ficam no createOrder.
import { HttpError, int, mobile, oneOf, text } from './validate.js';
import { PAYMENT_METHODS } from './store-rules.js';

/** Cliente, endereço, voltagem, ponto no mapa, pagamento e itens (somando o mesmo produto repetido). */
export function parseOrderInput(body = {}) {
  const { raw, key } = mobile(body.phone);
  const customerName = text(body.customerName, 'Nome', { required: true, max: 80 });
  const district = text(body.district, 'Bairro', { required: true, max: 80 });
  const street = text(body.street, 'Endereço', { required: true, max: 160 });
  const houseNumber = text(body.houseNumber, 'Número', { required: true, max: 20 });
  const complement = text(body.complement, 'Complemento', { max: 80 });
  const reference = text(body.reference, 'Ponto de referência', { max: 160 });
  const voltage = Number(body.voltage);
  if (![127, 220].includes(voltage)) throw new HttpError(400, 'Informe a voltagem da máquina: 127 V ou 220 V');
  const hasPin = body.latitude !== null && body.latitude !== undefined && body.latitude !== '';
  let latitude = null;
  let longitude = null;
  if (hasPin) {
    latitude = Number(body.latitude);
    longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new HttpError(400, 'Localização no mapa inválida');
  }
  const notes = text(body.notes, 'Observações', { max: 500 });
  const paymentMethod = oneOf(body.paymentMethod, 'Forma de pagamento', PAYMENT_METHODS);

  if (!Array.isArray(body.items) || !body.items.length) throw new HttpError(400, 'O carrinho está vazio');
  if (body.items.length > 50) throw new HttpError(400, 'Itens demais no pedido');
  const wanted = new Map();
  for (const it of body.items) {
    const id = String(it?.productId || '');
    const qty = int(it?.quantity, 'Quantidade', { min: 1, max: 999 });
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }

  return { phone: raw, phoneKey: key, customerName, district, street, houseNumber, complement, reference, voltage, latitude, longitude, notes, paymentMethod, wanted };
}
