import { useEffect, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Loading, PageHead } from '../../ui';
import { OrderCard } from './OrderCard';

const FILTERS = [
  { id: 'open', label: 'Em aberto' },
  { id: 'received', label: 'Novos' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'out_for_delivery', label: 'Em rota' },
  { id: 'delivered', label: 'Entregues' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'all', label: 'Todos' },
];

export default function AdminOrders() {
  const config = useConfig();
  const [status, setStatus] = useState('open');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const qs = new URLSearchParams({ status, ...(date ? { date } : {}), ...(term ? { q: term } : {}) });
  const { data, error, loading, reload, setData } = useApi<Order[]>(`/admin/orders?${qs}`);

  // Pedidos novos chegam sem recarregar a página.
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  const replace = (o: Order) => setData((list) => (list || []).map((x) => (x.id === o.id ? o : x)));

  return (
    <div>
      <PageHead title="Pedidos" />
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 min-[380px]:-mx-6 min-[380px]:px-6 md:mx-0 md:flex-wrap md:px-0">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${status === f.id ? 'chip-on' : ''}`} onClick={() => setStatus(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 min-[480px]:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-12" placeholder="Nome, celular ou nº" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar pedido" />
        </div>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Dia da entrega" />
      </div>
      <div className="mt-5">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data?.length ? (
          <Empty icon={ClipboardList} title="Nenhum pedido" text="Os pedidos aparecem aqui assim que os clientes enviam." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.map((o) => (
              <OrderCard key={o.id} order={o} onChange={replace} storeName={config?.storeName || ''} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
