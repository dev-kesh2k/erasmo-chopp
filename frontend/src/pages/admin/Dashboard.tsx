import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Settings, Truck } from 'lucide-react';
import { useApi, type Order } from '../../api';
import { useAuth } from '../../auth';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Loading, PageHead } from '../../ui';
import { brl, fmtLong, STATUS } from '../../util';
import { OrderCard } from './OrderCard';

interface Summary {
  today: string;
  counts: Record<'received' | 'confirmed' | 'out_for_delivery', number>;
  todayOrders: Order[];
  todayRevenueCents: number;
  todayDelivered: number;
  monthRevenueCents: number;
  monthDelivered: number;
  lowStock: { id: string; name: string; stock: number; unit: string }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const config = useConfig();
  const { data, error, loading, reload, setData } = useApi<Summary>('/admin/summary');

  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error || 'Erro'} onRetry={reload} />;

  const tiles = [
    { label: 'Novos', value: data.counts.received, tone: STATUS.received.text },
    { label: 'Confirmados', value: data.counts.confirmed, tone: STATUS.confirmed.text },
    { label: 'Em rota', value: data.counts.out_for_delivery, tone: STATUS.out_for_delivery.text },
  ];

  return (
    <div>
      <PageHead
        eyebrow={fmtLong(data.today)}
        title={`Olá, ${user?.name.split(' ')[0] || ''}`}
        action={
          <Link to="/admin/config" className="icon-btn md:hidden" aria-label="Configurações">
            <Settings size={22} />
          </Link>
        }
      />
      {config && !config.acceptingOrders && (
        <Link to="/admin/config" className="mb-4 block rounded-2xl bg-warnbg px-4 py-3 text-sm font-medium text-warn">
          A loja está fechada para pedidos. Toque para abrir.
        </Link>
      )}
      <div className="grid grid-cols-3 gap-2 min-[380px]:gap-3">
        {tiles.map((t) => (
          <Link key={t.label} to="/admin/pedidos" className="card p-3 min-[380px]:p-4">
            <p className={`font-display text-3xl font-extrabold ${t.tone}`}>{t.value}</p>
            <p className="truncate text-sm text-muted">{t.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 min-[380px]:gap-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Vendido hoje</p>
          <p className="break-words text-xl font-bold">{brl(data.todayRevenueCents)}</p>
          <p className="text-sm text-muted">{data.todayDelivered} entregas</p>
        </div>
        <Link to="/admin/financeiro" className="card p-4">
          <p className="text-sm text-muted">No mês</p>
          <p className="break-words text-xl font-bold">{brl(data.monthRevenueCents)}</p>
          <p className="text-sm text-muted">{data.monthDelivered} entregas</p>
        </Link>
      </div>

      {data.lowStock.length > 0 && (
        <Link to="/admin/produtos" className="card mt-3 flex items-start gap-3 border-warn/40 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-warn" size={20} />
          <div className="min-w-0 text-sm">
            <p className="font-bold text-warn">Estoque baixo</p>
            <p className="text-soft">{data.lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}</p>
          </div>
        </Link>
      )}

      <h2 className="h2 mb-3 mt-8">Entregas de hoje</h2>
      {!data.todayOrders.length ? (
        <Empty icon={Truck} title="Nenhuma entrega pendente hoje" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.todayOrders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              storeName={config?.storeName || ''}
              onChange={(u) => {
                setData((s) => (s ? { ...s, todayOrders: s.todayOrders.map((x) => (x.id === u.id ? u : x)) } : s));
                reload();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
