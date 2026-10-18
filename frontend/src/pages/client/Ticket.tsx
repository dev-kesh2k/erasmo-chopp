import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Printer, Share2, Truck } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { maskPhone, phoneDigits, useSavedPhone } from '../../client';
import { useConfig } from '../../config';
import { Logo } from '../../layout';
import { ErrorBox, Loading, toast } from '../../ui';
import { addressLine, brl, fmtDateTime, fmtLong, fmtWindow, METHOD, orderText, STATUS, waLink } from '../../util';
import { PhoneGate } from './Orders';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-[#6b6150]">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{children}</span>
    </div>
  );
}

const Cut = () => <div className="my-4 border-t-2 border-dashed border-[#d9cdb4]" />;

/** Ticket (cupom) do pedido, mostrado logo depois de finalizar. */
export default function Ticket() {
  const { id } = useParams();
  const config = useConfig();
  const [phone, setPhone] = useSavedPhone();
  const path = phone ? `/orders/${id}?phone=${phoneDigits(phone)}` : null;
  const { data: o, error, loading, reload } = useApi<Order>(path);

  if (!phone) return <PhoneGate onPhone={setPhone} text="Informe o celular usado no pedido." />;
  if (loading && !o) return <Loading />;
  if (error || !o) return <ErrorBox message={error || 'Pedido não encontrado'} onRetry={reload} />;

  const storeName = config?.storeName || '';
  const store = config?.whatsapp || config?.phone || '';
  const text = orderText(o, storeName);

  async function share() {
    try {
      if (navigator.share) return await navigator.share({ title: `Pedido #${o!.number}`, text });
      await navigator.clipboard.writeText(text);
      toast('Ticket copiado');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Não foi possível compartilhar', true);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center gap-3 print:hidden">
        <CheckCircle2 size={32} className="shrink-0 text-ok" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold uppercase leading-none">Pedido enviado!</h1>
          <p className="mt-1 text-sm text-soft">Guarde seu ticket. A loja vai confirmar em breve.</p>
        </div>
      </div>

      <article id="ticket" className="rounded-2xl bg-[#FFF8E7] p-5 text-[#1a1712] shadow-lg sm:p-6" aria-label={`Ticket do pedido ${o.number}`}>
        <div className="flex justify-center [&_p]:text-[#1a1712]">
          <Logo compact />
        </div>
        <Cut />
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#6b6150]">Pedido</p>
          <p className="font-display text-6xl font-extrabold leading-none text-[#b45309]">#{o.number}</p>
          <p className="mt-2 text-sm text-[#6b6150]">{fmtDateTime(o.createdAt)}</p>
          <p className="mt-2 inline-block rounded-full bg-[#1a1712] px-3 py-1 text-xs font-bold uppercase text-[#FFF8E7]">{STATUS[o.status].label}</p>
        </div>
        <Cut />
        <div className="flex flex-col gap-2">
          <Row label="Cliente">{o.customerName}</Row>
          <Row label="Celular">{maskPhone(o.phone)}</Row>
        </div>
        <Cut />
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Truck size={18} className="shrink-0 text-[#b45309]" /> {fmtLong(o.deliveryDate)}, {fmtWindow(o.deliveryWindow)}
          </p>
          <p className="break-words text-sm">{addressLine(o)}</p>
          {o.reference && <p className="break-words text-sm text-[#6b6150]">Ref.: {o.reference}</p>}
          <Row label="Máquina">{o.voltage} V</Row>
        </div>
        <Cut />
        <div className="flex flex-col gap-2">
          {o.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">
                {i.quantity}× {i.name} <span className="text-[#6b6150]">({i.unit})</span>
              </span>
              <span className="shrink-0">{brl(i.unitPriceCents * i.quantity)}</span>
            </div>
          ))}
          <Row label="Entrega">Grátis</Row>
          <div className="mt-1 flex justify-between border-t border-[#d9cdb4] pt-2 text-lg font-extrabold">
            <span>Total</span>
            <span>{brl(o.totalCents)}</span>
          </div>
        </div>
        <Cut />
        <div className="flex flex-col gap-2">
          <Row label="Pagamento">{METHOD[o.paymentMethod]} · na entrega</Row>
          {o.changeForCents ? <Row label="Troco para">{brl(o.changeForCents)}</Row> : null}
          {o.paymentMethod === 'pix' && config?.pixKey && <Row label="Chave Pix">{config.pixKey}</Row>}
          {o.notes && <p className="break-words text-sm text-[#6b6150]">Obs.: {o.notes}</p>}
        </div>
        <Cut />
        <p className="text-center text-xs text-[#6b6150]">Informe o número #{o.number} ao falar com a loja.</p>
      </article>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <button className="btn-secondary" onClick={share}>
          <Share2 size={20} /> Compartilhar
        </button>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={20} /> Imprimir
        </button>
      </div>
      {store && (
        <a className="btn-secondary print:hidden" href={waLink(store, text)} target="_blank" rel="noreferrer">
          <MessageCircle size={20} /> Enviar para a loja no WhatsApp
        </a>
      )}
      <Link to={`/pedidos/${o.id}`} className="btn-primary print:hidden">
        Acompanhar pedido
      </Link>
      <Link to="/" className="flex min-h-[48px] items-center justify-center text-soft print:hidden">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
