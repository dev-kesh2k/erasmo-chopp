import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addressLine, fmtLong, fmtRelative, fmtShort, fmtWindow, mapsLink, parseMoney, waLink } from '../src/util.ts';

test('parseMoney: vírgula, milhar e ponto decimal', () => {
  assert.equal(parseMoney('350'), 35000);
  assert.equal(parseMoney('350,00'), 35000);
  assert.equal(parseMoney('R$ 12,5'), 1250);
  assert.equal(parseMoney('1.234,56'), 123456);
  assert.equal(parseMoney('1.234'), 123400);
  assert.equal(parseMoney('350.50'), 35050);
  assert.equal(parseMoney('350.5'), 35050);
  assert.equal(parseMoney('1.234.56'), 123456);
  assert.equal(parseMoney(''), null);
  assert.equal(parseMoney('abc'), null);
});

test('datas: soma, extenso e relativo', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(fmtLong('2026-11-15'), 'Domingo, 15 de novembro');
  assert.equal(fmtShort('2026-11-16'), 'Seg 16 nov');
  assert.equal(fmtRelative('2026-11-15', '2026-11-15'), 'Hoje');
  assert.equal(fmtRelative('2026-11-16', '2026-11-15'), 'Amanhã');
  assert.equal(fmtRelative('2026-11-18', '2026-11-15'), 'Qua 18 nov');
  assert.equal(fmtWindow('14:00-16:00'), '14:00 às 16:00');
});

test('endereço e mapa', () => {
  const o = { street: 'Rua A', houseNumber: '10', complement: '', district: 'Centro', latitude: null, longitude: null };
  assert.equal(addressLine(o), 'Rua A, 10 · Centro');
  assert.equal(addressLine({ ...o, complement: 'Casa 2' }), 'Rua A, 10 · Casa 2 · Centro');
  assert.equal(mapsLink(o), 'https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%2010%20-%20Centro');
  assert.equal(mapsLink({ ...o, latitude: -24.9, longitude: -53.4 }), 'https://www.google.com/maps/search/?api=1&query=-24.9,-53.4');
});

test('waLink: põe o 55 e codifica a mensagem', () => {
  assert.equal(waLink('(45) 99999-8888'), 'https://wa.me/5545999998888');
  assert.equal(waLink('5545999998888', 'oi & tchau'), 'https://wa.me/5545999998888?text=oi%20%26%20tchau');
});
