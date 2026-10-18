import { useState } from 'react';
import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { api, type Order, type OrderStatus } from '../../api';
import { useAuth } from '../../auth';
import { Checkbox, Field, Sheet, StatusPill, toast } from '../../ui';
import { addressLine, brl, fmtShort, fmtWindow, mapsLink, METHOD, waLink } from '../../util';

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  received: { to: 'confirmed', label: 'Confirmar pedido' },
  confirmed: { to: 'out_for_delivery', label: 'Saiu para entrega' },
  out_for_delivery: { to: 'delivered', label: 'Marcar como entregue' },
};

const CLIENT_MSG: Partial<Record<OrderStatus, string>> = {
  confirmed: 'seu pedido #{n} foi confirmado! Entrega {w}.',
  out_for_delivery: 'seu pedido #{n} saiu para entrega!',
  delivered: 'seu pedido #{n} foi entregue. Obrigado pela preferência!',
};

export function OrderCard({ order, onChange, storeName }: { order: Order; onChange: (o: Order) => void; storeName: string }) {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const o = order;
  const next = NEXT[o.status];

  async function move(to: OrderStatus, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const u = await api.patch<Order>(`/admin/orders/${o.id}/status`, { status: to, ...extra });
      onChange(u);
      refresh();
      toast(`Pedido #${o.number}: ${to === 'cancelled' ? 'cancelado' : 'atualizado'}`);
      setCancelOpen(false);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  async function togglePaid() {
    try {
      onChange(await api.patch<Order>(`/admin/orders/${o.id}/paid`, { paid: !o.paid }));
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  const msg = CLIENT_MSG[o.status];
  const waText = msg
    ? `Olá, ${o.customerName.split(' ')[0]}! ${msg.replace('{n}', String(o.number)).replace('{w}', `${fmtShort(o.deliveryDate)}, ${fmtWindow(o.deliveryWindow)}`)} — ${storeName}`
    : `Olá, ${o.customerName.split(' ')[0]}! Sobre o seu pedido #${o.number} — ${storeName}`;

  return (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">#{o.number}</span>
        <StatusPill status={o.status} />
        <span className="ml-auto text-sm font-bold text-accent">
          {fmtShort(o.deliveryDate)} · {fmtWindow(o.deliveryWindow)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="break-words font-bold">{o.customerName}</p>
        <p className="break-words text-sm text-soft">{addressLine(o)}</p>
        {o.reference && <p className="text-sm text-muted">Ref.: {o.reference}</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-tint2 px-3 py-1 text-sm font-bold text-accent">⚡ Máquina {o.voltage} V</span>
          {o.latitude !== null && <span className="inline-flex items-center gap-1 rounded-full bg-okbg px-3 py-1 text-sm font-bold text-ok">📍 Local no mapa</span>}
        </div>
      </div>
      <ul className="flex flex-col gap-1 rounded-2xl bg-surface2 p-3 text-sm">
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">
              {i.quantity}× {i.name}
            </span>
            <span className="shrink-0 text-soft">{brl(i.unitPriceCents * i.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 text-muted">
          <span>Entrega</span>
          <span>Grátis</span>
        </li>
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold">{brl(o.totalCents)}</p>
          <p className="text-sm text-muted">
            {METHOD[o.paymentMethod]}
            {o.changeForCents ? ` · troco p/ ${brl(o.changeForCents)} (${brl(o.changeForCents - o.totalCents)})` : ''}
          </p>
        </div>
        {o.status !== 'cancelled' && (
          <button type="button" onClick={togglePaid} className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
            <Checkbox on={o.paid} /> Pago
          </button>
        )}
      </div>
      {o.notes && <p className="rounded-xl bg-warnbg px-3 py-2 text-sm text-warn">Obs.: {o.notes}</p>}
      {o.status === 'cancelled' && o.cancelReason && <p className="text-sm text-bad">{o.cancelReason}</p>}

      <div className="grid grid-cols-3 gap-2">
        <a className="btn-secondary min-h-[44px] px-2 text-sm" href={waLink(o.phone, waText)} target="_blank" rel="noreferrer" aria-label="WhatsApp do cliente">
          <MessageCircle size={18} /> <span className="hidden min-[400px]:inline">WhatsApp</span>
        </a>
        <a className="btn-secondary min-h-[44px] px-2 text-sm" href={`tel:${o.phone.replace(/\D/g, '')}`} aria-label="Ligar">
          <Phone size={18} /> <span className="hidden min-[400px]:inline">Ligar</span>
        </a>
        <a className="btn-secondary min-h-[44px] px-2 text-sm" href={mapsLink(o)} target="_blank" rel="noreferrer" aria-label="Abrir no mapa">
          <MapPin size={18} /> <span className="hidden min-[400px]:inline">Mapa</span>
        </a>
      </div>
      {(next || o.status === 'received' || o.status === 'confirmed' || o.status === 'out_for_delivery') && (
        <div className="flex flex-col gap-2 min-[480px]:flex-row">
          {next && (
            <button className="btn-primary flex-1" disabled={busy} onClick={() => move(next.to, next.to === 'delivered' && !o.paid ? { paid: confirm('O pagamento foi recebido na entrega?') } : {})}>
              {next.label}
            </button>
          )}
          <button className="btn-danger min-[480px]:w-40" disabled={busy} onClick={() => setCancelOpen(true)}>
            Cancelar
          </button>
        </div>
      )}

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancelar #${o.number}`}>
        <div className="flex flex-col gap-4">
          <p className="text-soft">Os itens com controle de estoque voltam para o estoque.</p>
          <Field label="Motivo (aparece para o cliente)">
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Ex.: sem entrega no bairro" />
          </Field>
          <button className="btn-danger" disabled={busy} onClick={() => move('cancelled', { reason })}>
            Cancelar pedido
          </button>
        </div>
      </Sheet>
    </article>
  );
}
