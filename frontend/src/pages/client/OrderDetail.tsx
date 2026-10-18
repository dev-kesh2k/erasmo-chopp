import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { api, useApi, type Order } from '../../api';
import { phoneDigits, useSavedPhone } from '../../client';
import { useConfig } from '../../config';
import { ErrorBox, Loading, PageHead, StatusPill, toast } from '../../ui';
import { addressLine, brl, FLOW, fmtLong, fmtWindow, METHOD, orderText, STATUS, waLink } from '../../util';
import { PhoneGate } from './Orders';

function Timeline({ status }: { status: Order['status'] }) {
  if (status === 'cancelled') return null;
  const idx = FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Andamento do pedido">
      {FLOW.map((s, i) => (
        <li key={s} className="min-w-0" aria-current={i === idx ? 'step' : undefined}>
          <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-accent' : 'bg-surface2'}`} />
          <p className={`mt-2 text-[13px] leading-tight ${i === idx ? 'font-bold text-ink' : i < idx ? 'text-soft' : 'text-muted'}`}>{STATUS[s].label}</p>
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const config = useConfig();
  const [phone, setPhone] = useSavedPhone();
  const path = phone ? `/orders/${id}?phone=${phoneDigits(phone)}` : null;
  const { data: o, error, loading, reload, setData } = useApi<Order>(path);
  const [busy, setBusy] = useState(false);

  // Acompanha a entrega enquanto o pedido está em aberto.
  useEffect(() => {
    if (!o || o.status === 'delivered' || o.status === 'cancelled') return;
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [o, reload]);

  if (!phone) return <PhoneGate onPhone={setPhone} text="Informe o celular usado no pedido." />;
  if (loading && !o) return <Loading />;
  if (error || !o) return <ErrorBox message={error || 'Pedido não encontrado'} onRetry={reload} />;

  const store = config?.whatsapp || config?.phone || '';

  async function cancel() {
    if (!confirm('Cancelar este pedido?')) return;
    setBusy(true);
    try {
      setData(await api.post<Order>(`/orders/${o!.id}/cancel`, { phone: phoneDigits(phone) }));
      toast('Pedido cancelado');
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead title={`Pedido #${o.number}`} back="/pedidos" action={<StatusPill status={o.status} />} />

      {params.get('novo') && (
        <div className="card mb-5 flex items-start gap-3 border-ok/40 bg-okbg p-4">
          <CheckCircle2 className="mt-0.5 shrink-0 text-ok" />
          <div className="min-w-0">
            <p className="font-bold text-ok">Pedido enviado!</p>
            <p className="text-sm text-soft">A loja vai confirmar em breve. Você pode acompanhar por aqui.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="card p-5">
          <Timeline status={o.status} />
          {o.status === 'cancelled' && <p className="text-bad">Cancelado{o.cancelReason ? `: ${o.cancelReason}` : ''}</p>}
          <p className="mt-4 font-bold">
            {fmtLong(o.deliveryDate)}, {fmtWindow(o.deliveryWindow)}
          </p>
          <p className="mt-1 break-words text-soft">{addressLine(o)}</p>
          {o.reference && <p className="text-sm text-muted">Ref.: {o.reference}</p>}
        </div>

        <div className="card flex flex-col gap-2 p-5">
          {o.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0 break-words text-soft">
                {i.quantity}× {i.name} <span className="text-muted">({i.unit})</span>
              </span>
              <span className="shrink-0">{brl(i.unitPriceCents * i.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-soft">Entrega ({o.zoneName})</span>
            <span>{o.feeCents ? brl(o.feeCents) : 'Grátis'}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-accent">{brl(o.totalCents)}</span>
          </div>
          <p className="text-sm text-muted">
            {METHOD[o.paymentMethod]}
            {o.changeForCents ? ` · troco para ${brl(o.changeForCents)}` : ''}
            {o.paid ? ' · pago' : ''}
          </p>
          {o.paymentMethod === 'pix' && config?.pixKey && !o.paid && <p className="break-words text-sm text-soft">Chave Pix: {config.pixKey}</p>}
          {o.notes && <p className="text-sm text-muted">Obs.: {o.notes}</p>}
        </div>

        {store && (
          <a className="btn-secondary" href={waLink(store, orderText(o, config?.storeName || ''))} target="_blank" rel="noreferrer">
            <MessageCircle size={20} /> Falar com a loja no WhatsApp
          </a>
        )}
        {o.status === 'received' && (
          <button className="btn-danger" onClick={cancel} disabled={busy}>
            Cancelar pedido
          </button>
        )}
        <Link to="/" className="flex min-h-[48px] items-center justify-center text-soft">
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
