import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Phone, Receipt } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { isValidPhone, maskPhone, phoneDigits, useSavedPhone } from '../../client';
import { useConfig } from '../../config';
import { Empty, ErrorBox, FormError, IconInput, Loading, PageHead, StatusPill } from '../../ui';
import { brl, fmtRelative, fmtWindow } from '../../util';

export function PhoneGate({ onPhone, text }: { onPhone: (p: string) => void; text: string }) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(value)) return setErr('Informe o celular com DDD.');
    onPhone(value);
  };
  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
      <p className="text-soft">{text}</p>
      <IconInput icon={Phone} inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" value={value} onChange={(e) => setValue(maskPhone(e.target.value))} aria-label="Celular" />
      <FormError message={err} onClose={() => setErr('')} />
      <button className="btn-primary">Ver meus pedidos</button>
    </form>
  );
}

export default function Orders() {
  const config = useConfig();
  const [phone, setPhone] = useSavedPhone();
  const { data, error, loading, reload } = useApi<Order[]>(phone ? `/orders?phone=${phoneDigits(phone)}` : null);

  return (
    <div>
      <PageHead
        title="Meus pedidos"
        subtitle={
          phone ? (
            <span>
              Celular {phone} ·{' '}
              <button className="font-bold text-accent" onClick={() => setPhone('')}>
                trocar
              </button>
            </span>
          ) : undefined
        }
      />
      {!phone ? (
        <PhoneGate onPhone={setPhone} text="Informe o celular usado no pedido para acompanhar a entrega." />
      ) : loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty
          icon={Receipt}
          title="Nenhum pedido ainda"
          text="Os pedidos feitos com este celular aparecem aqui."
          action={
            <Link to="/" className="btn-primary">
              Fazer um pedido
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((o) => (
            <Link key={o.id} to={`/pedidos/${o.id}`} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">Pedido #{o.number}</span>
                  <StatusPill status={o.status} />
                </div>
                <p className="mt-1 text-sm text-soft">
                  {config ? fmtRelative(o.deliveryDate, config.today) : o.deliveryDate} · {fmtWindow(o.deliveryWindow)}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="font-bold">{brl(o.totalCents)}</span>
                <ChevronRight size={20} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
