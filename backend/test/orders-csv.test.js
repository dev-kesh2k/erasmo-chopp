import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, money, ordersCsv } from '../src/orders-csv.js';

const pedido = (p) => ({
  number: 1, deliveryDate: '2026-11-10', deliveryWindow: '14:00-16:00', customerName: 'Ana', phone: '(45) 99999-8888',
  district: 'Centro', subtotalCents: 15000, totalCents: 15000, paymentMethod: 'pix', paid: true, status: 'delivered',
  items: [{ quantity: 2, name: 'Chopp 30 L' }], ...p,
});

test('money: centavos com vírgula', () => {
  assert.equal(money(0), '0,00');
  assert.equal(money(1234), '12,34');
  assert.equal(money(100000), '1000,00');
});

test('csvCell: bloqueia fórmula e protege ponto e vírgula', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('Rua A; 10'), '"Rua A; 10"');
});

test('ordersCsv: cabeçalho, tradução de status/pagamento e itens', () => {
  const linhas = ordersCsv([pedido({})]).replace('﻿', '').trim().split('\r\n');
  assert.equal(linhas[0], 'pedido;entrega;janela;cliente;telefone;bairro;itens;subtotal;total;pagamento;pago;status');
  assert.equal(linhas[1], '1;2026-11-10;14:00-16:00;Ana;(45) 99999-8888;Centro;2× Chopp 30 L;150,00;150,00;Pix;sim;entregue');
});

test('ordersCsv: ordena por data de entrega e depois pelo número', () => {
  const csv = ordersCsv([
    pedido({ number: 3, deliveryDate: '2026-11-12' }),
    pedido({ number: 2, deliveryDate: '2026-11-10', status: 'cancelled', paid: false, paymentMethod: 'cash' }),
    pedido({ number: 1, deliveryDate: '2026-11-10' }),
  ]);
  const nums = csv.replace('﻿', '').trim().split('\r\n').slice(1).map((l) => l.split(';')[0]);
  assert.deepEqual(nums, ['1', '2', '3']);
  assert.match(csv, /2;2026-11-10;.*;dinheiro;não;cancelado/);
});
