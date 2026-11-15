import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderInput } from '../src/order-input.js';
import { HttpError } from '../src/validate.js';

const base = {
  phone: '(45) 99999-8888', customerName: ' Ana ', district: 'Centro', street: 'Rua A', houseNumber: '10',
  voltage: '220', paymentMethod: 'pix', items: [{ productId: 'p1', quantity: 2 }],
};
const erro = (re, status = 400) => (e) => e instanceof HttpError && e.status === status && re.test(e.message);

test('parseOrderInput: pedido válido', () => {
  const r = parseOrderInput(base);
  assert.equal(r.customerName, 'Ana');
  assert.equal(r.phoneKey, '45999998888');
  assert.equal(r.voltage, 220);
  assert.equal(r.latitude, null);
  assert.deepEqual([...r.wanted], [['p1', 2]]);
});

test('parseOrderInput: soma o mesmo produto repetido', () => {
  const r = parseOrderInput({ ...base, items: [{ productId: 'p1', quantity: 1 }, { productId: 'p2', quantity: '3' }, { productId: 'p1', quantity: 4 }] });
  assert.deepEqual([...r.wanted], [['p1', 5], ['p2', 3]]);
});

test('parseOrderInput: campos obrigatórios e voltagem', () => {
  assert.throws(() => parseOrderInput({ ...base, customerName: '' }), erro(/Nome é obrigatório/));
  assert.throws(() => parseOrderInput({ ...base, district: ' ' }), erro(/Bairro é obrigatório/));
  assert.throws(() => parseOrderInput({ ...base, voltage: 110 }), erro(/127 V ou 220 V/));
  assert.throws(() => parseOrderInput({ ...base, phone: '123' }), erro(/DDD/));
  assert.throws(() => parseOrderInput({ ...base, paymentMethod: 'boleto' }), erro(/Forma de pagamento/));
});

test('parseOrderInput: ponto no mapa opcional e validado', () => {
  assert.equal(parseOrderInput({ ...base, latitude: '-24.95', longitude: '-53.45' }).latitude, -24.95);
  assert.throws(() => parseOrderInput({ ...base, latitude: 100, longitude: 0 }), erro(/mapa/));
  assert.throws(() => parseOrderInput({ ...base, latitude: 'x', longitude: 0 }), erro(/mapa/));
});

test('parseOrderInput: carrinho vazio, grande demais ou quantidade inválida', () => {
  assert.throws(() => parseOrderInput({ ...base, items: [] }), erro(/vazio/));
  assert.throws(() => parseOrderInput({ ...base, items: 'x' }), erro(/vazio/));
  assert.throws(() => parseOrderInput({ ...base, items: Array(51).fill({ productId: 'p', quantity: 1 }) }), erro(/Itens demais/));
  assert.throws(() => parseOrderInput({ ...base, items: [{ productId: 'p', quantity: 0 }] }), erro(/Quantidade/));
  assert.throws(() => parseOrderInput({ ...base, items: [{ productId: 'p', quantity: 1000 }] }), erro(/Quantidade/));
});
