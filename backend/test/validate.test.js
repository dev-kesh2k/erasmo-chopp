import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, email, formatPhone, image, int, mobile, oneOf, password, phoneKey, text, url } from '../src/validate.js';

const erro = (status, re) => (e) => e instanceof HttpError && e.status === status && re.test(e.message);

test('text: corta espaços, obrigatório e tamanho máximo', () => {
  assert.equal(text('  oi  ', 'Nome'), 'oi');
  assert.equal(text(42, 'Nome'), '');
  assert.throws(() => text(' ', 'Nome', { required: true }), erro(400, /Nome é obrigatório/));
  assert.throws(() => text('abc', 'Nome', { max: 2 }), erro(400, /no máximo 2/));
});

test('email: minúsculo e formato válido', () => {
  assert.equal(email(' Ana@Exemplo.COM '), 'ana@exemplo.com');
  assert.throws(() => email('ana@exemplo'), erro(400, /inválido/));
  assert.throws(() => email(''), erro(400, /obrigatório/));
});

test('password: entre 8 e 200 caracteres', () => {
  assert.equal(password('12345678'), '12345678');
  assert.throws(() => password('1234567'), erro(400, /8 caracteres/));
  assert.throws(() => password(12345678), erro(400, /8 caracteres/));
  assert.throws(() => password('x'.repeat(201)), erro(400, /longa/));
});

test('phoneKey, mobile e formatPhone', () => {
  assert.equal(phoneKey('+55 (45) 99999-8888'), '45999998888');
  assert.equal(phoneKey('(45) 3333-4444'), '4533334444');
  assert.deepEqual(mobile('45 99999-8888'), { raw: '45 99999-8888', key: '45999998888' });
  assert.throws(() => mobile('99999-8888'), erro(400, /DDD/));
  assert.equal(formatPhone('45999998888'), '(45) 99999-8888');
  assert.equal(formatPhone('4533334444'), '(45) 3333-4444');
  assert.equal(formatPhone('123'), '123');
});

test('int: aceita número e texto numérico dentro da faixa', () => {
  assert.equal(int('12', 'Qtd'), 12);
  assert.equal(int(0, 'Qtd'), 0);
  assert.throws(() => int(1.5, 'Qtd'), erro(400, /Qtd inválido/));
  assert.throws(() => int('', 'Qtd'), erro(400, /inválido/));
  assert.throws(() => int(11, 'Qtd', { max: 10 }), erro(400, /entre 0 e 10/));
});

test('oneOf e url', () => {
  assert.equal(oneOf('pix', 'Pagamento', ['pix', 'cash']), 'pix');
  assert.throws(() => oneOf('boleto', 'Pagamento', ['pix']), erro(400, /Pagamento inválido/));
  assert.equal(url('https://instagram.com/x', 'Instagram'), 'https://instagram.com/x');
  assert.equal(url('', 'Instagram'), '');
  assert.throws(() => url('javascript:alert(1)', 'Instagram'), erro(400, /https:\/\//));
});

test('image: data URL JPG/PNG/WebP até 2,5 MB', () => {
  const png = `data:image/png;base64,${Buffer.from('abc').toString('base64')}`;
  const r = image(png);
  assert.equal(r.mime, 'image/png');
  assert.equal(r.data.toString(), 'abc');
  assert.throws(() => image('data:image/gif;base64,AAAA'), erro(400, /Imagem inválida/));
  assert.throws(() => image('nao é imagem'), erro(400, /Imagem inválida/));
  const grande = `data:image/jpeg;base64,${Buffer.alloc(2_600_000).toString('base64')}`;
  assert.throws(() => image(grande), erro(413, /grande/));
});
