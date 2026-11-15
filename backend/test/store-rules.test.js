import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DAYS, DEFAULT_WINDOWS, brl, checkWindows, deliveryDates, parseDays, parseWindows, windowsFor } from '../src/store-rules.js';
import { HttpError } from '../src/validate.js';

// Domingo, 15/11/2026, 10:00 em São Paulo.
const DOM_10H = new Date('2026-11-15T13:00:00Z');
const loja = { leadDays: 0, maxDays: 5, cutoffTime: '17:00', deliveryDays: DEFAULT_DAYS, windows: DEFAULT_WINDOWS };

test('parseWindows e parseDays: texto salvo ou padrão', () => {
  assert.deepEqual(parseWindows('["08:00-09:00","ruim"]'), ['08:00-09:00']);
  assert.deepEqual(parseWindows('{'), DEFAULT_WINDOWS);
  assert.deepEqual(parseWindows('{}'), DEFAULT_WINDOWS);
  assert.deepEqual(parseDays('[1,0,1,0,1,0,1]'), [true, false, true, false, true, false, true]);
  assert.deepEqual(parseDays('[true]'), DEFAULT_DAYS);
});

test('checkWindows: valida, remove repetidos e ordena', () => {
  assert.equal(checkWindows(['14:00-16:00', '10:00-12:00', '14:00-16:00']), '["10:00-12:00","14:00-16:00"]');
  for (const ruim of [[], ['12:00-10:00'], ['24:00-25:00'], ['10-12']]) {
    assert.throws(() => checkWindows(ruim), HttpError, JSON.stringify(ruim));
  }
  assert.throws(() => checkWindows(Array(13).fill('10:00-11:00')), /1 a 12/);
});

test('deliveryDates: pula domingo (sem entrega) e respeita a quantidade', () => {
  assert.deepEqual(deliveryDates(loja, DOM_10H), ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
});

test('deliveryDates: hoje só antes do horário de corte', () => {
  const seg = { ...loja, maxDays: 2 };
  assert.deepEqual(deliveryDates(seg, new Date('2026-11-16T13:00:00Z')), ['2026-11-16', '2026-11-17']);
  assert.deepEqual(deliveryDates(seg, new Date('2026-11-16T21:00:00Z')), ['2026-11-17', '2026-11-18']);
});

test('deliveryDates: antecedência mínima', () => {
  const r = deliveryDates({ ...loja, leadDays: 2, maxDays: 1 }, new Date('2026-11-16T13:00:00Z'));
  assert.deepEqual(r, ['2026-11-18']);
});

test('windowsFor: hoje só janelas que ainda não começaram', () => {
  const seg11h = new Date('2026-11-16T14:00:00Z');
  assert.deepEqual(windowsFor(loja, '2026-11-16', seg11h), ['14:00-16:00', '16:00-18:00', '18:00-20:00']);
  assert.deepEqual(windowsFor(loja, '2026-11-17', seg11h), DEFAULT_WINDOWS);
});

test('brl: centavos em reais', () => {
  assert.equal(brl(1234).replace(/\s/g, ' '), 'R$ 12,34');
  assert.equal(brl(100000).replace(/\s/g, ' '), 'R$ 1.000,00');
});
