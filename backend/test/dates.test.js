import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, isDay, isMonth, monthRange, nowTime, toMin, todayStr, weekday } from '../src/dates.js';

test('todayStr e nowTime: fuso de São Paulo', () => {
  const d = new Date('2026-11-15T02:30:00Z');
  assert.equal(todayStr(d), '2026-11-14');
  assert.equal(nowTime(d), '23:30');
  assert.equal(nowTime(new Date('2026-11-15T03:05:00Z')), '00:05');
});

test('isDay e isMonth', () => {
  assert.equal(isDay('2026-11-15'), true);
  assert.equal(isDay('2026-11-31x'), false);
  assert.equal(isMonth('2026-11'), true);
  assert.equal(isMonth('2026-13'), false);
  assert.equal(isMonth('2026-1'), false);
});

test('addDays e weekday', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(weekday('2026-11-15'), 0); // domingo
  assert.equal(weekday('2026-11-16'), 1);
});

test('monthRange: primeiro e último dia, inclusive dezembro e fevereiro', () => {
  assert.deepEqual(monthRange('2026-11'), { from: '2026-11-01', to: '2026-11-30' });
  assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', to: '2026-12-31' });
  assert.deepEqual(monthRange('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
});

test('toMin: HH:MM em minutos', () => {
  assert.equal(toMin('00:00'), 0);
  assert.equal(toMin('17:30'), 1050);
});
