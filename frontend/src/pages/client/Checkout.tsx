import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MapPin } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, useApi, type Catalog, type Order, type PaymentMethod } from '../../api';
import { clearCart, getCustomer, isValidPhone, maskPhone, saveCustomer, useCart } from '../../client';
import { useConfig, reloadConfig } from '../../config';
import { FullPage } from '../../layout';
import { ErrorBox, Field, FormError, Loading, PageHead, Radio } from '../../ui';
import { Calendar } from '../../calendar';
import { MapPicker, type Pin } from '../../MapPicker';
import { brl, fmtLong, fmtWindow, METHOD, parseMoney } from '../../util';

export default function Checkout() {
  const nav = useNavigate();
  const config = useConfig();
  const cart = useCart();
  const { data, error, loading, reload } = useApi<Catalog>('/catalog');
  const saved = getCustomer();
  const [f, setF] = useState({
    customerName: saved.customerName || '',
    phone: saved.phone || '',
    street: saved.street || '',
    houseNumber: saved.houseNumber || '',
    complement: saved.complement || '',
    reference: saved.reference || '',
    district: saved.district || '',
    notes: '',
  });
  const [day, setDay] = useState('');
  const [win, setWin] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [change, setChange] = useState('');
  const [voltage, setVoltage] = useState<127 | 220 | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // Depois do pedido o carrinho fica vazio: não redirecionar para o carrinho no lugar do ticket.
  const placed = useRef(false);
  const firstPending = useRef('');

  function closeAlert() {
    setErr('');
    const el = firstPending.current && document.getElementById(firstPending.current);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  }

  useEffect(() => {
    reloadConfig().catch(() => {});
  }, []);

  const dates = config?.deliveryDates || [];
  const windows = dates.find((d) => d.day === day)?.windows || [];
  useEffect(() => {
    if (win && !windows.includes(win)) setWin('');
  }, [windows, win]);

  if (!placed.current && !Object.keys(cart).length) return <Navigate to="/carrinho" replace />;
  if ((loading && !data) || !config) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const lines = (data?.products || []).filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] }));
  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const total = subtotal;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const changeFor = method === 'cash' ? parseMoney(change) || 0 : 0;
    // Tudo o que falta, na ordem da tela; ao fechar o alerta, vai para o primeiro campo pendente.
    const pending: [string, string][] = [];
    if (!isValidPhone(f.phone)) pending.push(['ck-phone', 'Celular com DDD']);
    if (!f.customerName.trim()) pending.push(['ck-name', 'Nome']);
    if (!f.street.trim()) pending.push(['ck-street', 'Rua']);
    if (!f.houseNumber.trim()) pending.push(['ck-number', 'Número']);
    if (!f.district.trim()) pending.push(['ck-district', 'Bairro']);
    if (!voltage) pending.push(['ck-voltage', 'Voltagem da máquina (127 V ou 220 V)']);
    if (!day) pending.push(['ck-when', 'Dia da entrega']);
    else if (!win) pending.push(['ck-when', 'Horário da entrega']);
    if (changeFor && changeFor < total) pending.push(['ck-change', `Troco para mais de ${brl(total)}`]);
    if (pending.length) {
      firstPending.current = pending[0][0];
      return setErr(pending.length === 1 ? `Falta preencher: ${pending[0][1]}.` : pending.map((p) => p[1]).join('\n'));
    }
    firstPending.current = '';
    setErr('');
    setBusy(true);
    try {
      const o = await api.post<Order>('/orders', {
        ...f,
        deliveryDate: day,
        deliveryWindow: win,
        voltage,
        latitude: pin?.lat ?? null,
        longitude: pin?.lng ?? null,
        paymentMethod: method,
        changeForCents: changeFor,
        items: lines.map((l) => ({ productId: l.p.id, quantity: l.qty })),
      });
      placed.current = true;
      saveCustomer({ ...f });
      clearCart();
      nav(`/pedidos/${o.id}/ticket`, { replace: true });
    } catch (e2) {
      setErr((e2 as Error).message);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <FullPage
      footer={
        <button form="checkout" className="btn-primary w-full" disabled={busy || !config.acceptingOrders}>
          {busy ? 'Enviando…' : `Fazer pedido · ${brl(total)}`}
        </button>
      }
    >
      <PageHead title="Finalizar pedido" back="/carrinho" />
      <form id="checkout" onSubmit={submit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="h2">Seus dados</h2>
          <Field label="Celular (WhatsApp)" hint="Use o mesmo número para acompanhar o pedido.">
            <input
              className="input"
              id="ck-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              value={f.phone}
              onChange={(e) => setF((s) => ({ ...s, phone: maskPhone(e.target.value) }))}
              required
            />
          </Field>
          <Field label="Nome">
            <input id="ck-name" className="input" autoComplete="name" value={f.customerName} onChange={set('customerName')} required maxLength={80} />
          </Field>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="h2">Endereço de entrega</h2>
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <Field label="Rua">
              <input id="ck-street" className="input" autoComplete="address-line1" value={f.street} onChange={set('street')} required maxLength={160} />
            </Field>
            <Field label="Número">
              <input id="ck-number" className="input" value={f.houseNumber} onChange={set('houseNumber')} required maxLength={20} />
            </Field>
          </div>
          <Field label="Bairro">
            <input id="ck-district" className="input" value={f.district} onChange={set('district')} required maxLength={80} />
          </Field>
          <Field label="Complemento (opcional)">
            <input className="input" autoComplete="address-line2" value={f.complement} onChange={set('complement')} maxLength={80} placeholder="Apto, bloco, casa…" />
          </Field>
          <Field label="Ponto de referência (opcional)">
            <input className="input" value={f.reference} onChange={set('reference')} maxLength={160} />
          </Field>
          <div className="flex flex-col gap-3">
            <button type="button" className={`card flex min-h-[56px] items-center gap-3 px-4 text-left ${pin ? 'border-accent' : ''}`} onClick={() => setMapOpen((v) => !v)} aria-expanded={mapOpen}>
              <MapPin size={22} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{pin ? 'Local marcado no mapa' : 'Marcar o local no mapa'}</span>
                <span className="block text-sm text-muted">Opcional, ajuda o entregador a achar você</span>
              </span>
            </button>
            {mapOpen && <MapPicker value={pin} onChange={setPin} addressQuery={[f.street, f.houseNumber, f.district].filter(Boolean).join(', ')} />}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 id="ck-voltage" className="h2">Voltagem da máquina</h2>
          <p className="text-sm text-muted">Informe a tomada onde a chopeira será ligada. Obrigatório.</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Voltagem da máquina">
            {([127, 220] as const).map((v) => (
              <button
                type="button"
                key={v}
                role="radio"
                aria-checked={voltage === v}
                onClick={() => setVoltage(v)}
                className={`card flex min-h-[64px] items-center justify-center gap-3 text-lg font-bold ${voltage === v ? 'border-accent text-accent' : ''}`}
              >
                <Radio on={voltage === v} /> {v} V
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 id="ck-when" className="h2">Quando entregar</h2>
          {!dates.length ? (
            <p className="rounded-xl bg-warnbg px-4 py-3 text-sm text-warn">Não há datas de entrega disponíveis no momento.</p>
          ) : (
            <>
              <Calendar available={dates.map((d) => d.day)} value={day} today={config.today} onChange={setDay} />
              {day && (
                <>
                  <p className="font-medium">
                    {fmtLong(day)} — escolha o horário
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {windows.map((w) => (
                      <button type="button" key={w} className={`chip ${win === w ? 'chip-on' : ''}`} onClick={() => setWin(w)}>
                        {fmtWindow(w)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="h2">Pagamento na entrega</h2>
          {(Object.keys(METHOD) as PaymentMethod[]).map((m) => (
            <button type="button" key={m} onClick={() => setMethod(m)} className={`card flex min-h-[56px] items-center gap-3 px-4 text-left ${method === m ? 'border-accent' : ''}`}>
              <Radio on={method === m} />
              <span className="font-medium">{METHOD[m]}</span>
            </button>
          ))}
          {method === 'pix' && config.pixKey && (
            <p className="break-words rounded-xl bg-surface2 px-4 py-3 text-sm text-soft">
              Chave Pix: <strong className="text-ink">{config.pixKey}</strong>
            </p>
          )}
          {method === 'cash' && (
            <Field label="Troco para (opcional)">
              <input id="ck-change" className="input" inputMode="decimal" placeholder="Ex.: 500,00" value={change} onChange={(e) => setChange(e.target.value)} />
            </Field>
          )}
          <Field label="Observações (opcional)">
            <textarea className="input min-h-[96px]" value={f.notes} onChange={set('notes')} maxLength={500} />
          </Field>
        </section>

        <section className="card flex flex-col gap-2 p-5">
          {lines.map((l) => (
            <div key={l.p.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 break-words text-soft">
                {l.qty}× {l.p.name}
              </span>
              <span className="shrink-0">{brl(l.p.priceCents * l.qty)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-soft">Entrega</span>
            <span className="font-medium text-ok">Grátis</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-accent">{brl(total)}</span>
          </div>
        </section>
        <FormError message={err} onClose={closeAlert} title={firstPending.current ? 'Faltam informações' : 'Atenção'} />
      </form>
    </FullPage>
  );
}
