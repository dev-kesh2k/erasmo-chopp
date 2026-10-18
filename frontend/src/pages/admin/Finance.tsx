import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '../../api';
import { useConfig } from '../../config';
import { ErrorBox, Loading, PageHead } from '../../ui';
import { brl, dayNum, METHOD, MONTHS } from '../../util';

interface Finance {
  month: string;
  totalCents: number;
  unpaidCents: number;
  orders: number;
  cancelled: number;
  averageCents: number;
  byDay: { day: string; cents: number }[];
  byMethod: Record<'pix' | 'cash' | 'card', number>;
  topProducts: { name: string; quantity: number; totalCents: number }[];
}

function shift(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default function FinancePage() {
  const config = useConfig();
  const [month, setMonth] = useState(() => (config?.today || new Date().toISOString()).slice(0, 7));
  const { data, error, loading, reload } = useApi<Finance>(`/admin/finance?month=${month}`);
  const [y, m] = month.split('-').map(Number);
  const max = Math.max(1, ...(data?.byDay.map((d) => d.cents) || [0]));

  return (
    <div>
      <PageHead title="Financeiro" subtitle="Pedidos entregues, pela data da entrega." />
      <div className="mb-5 flex items-center gap-2">
        <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(shift(month, -1))}>
          <ChevronLeft size={22} />
        </button>
        <p className="min-w-0 flex-1 text-center text-lg font-bold capitalize">
          {MONTHS[m - 1]} {y}
        </p>
        <button className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(shift(month, 1))}>
          <ChevronRight size={22} />
        </button>
      </div>
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox message={error || 'Erro'} onRetry={reload} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Faturamento', value: brl(data.totalCents) },
              { label: 'Pedidos entregues', value: String(data.orders) },
              { label: 'Ticket médio', value: brl(data.averageCents) },
              { label: 'Cancelados', value: String(data.cancelled) },
            ].map((t) => (
              <div key={t.label} className="card p-4">
                <p className="text-sm text-muted">{t.label}</p>
                <p className="break-words text-xl font-bold">{t.value}</p>
              </div>
            ))}
          </div>
          {(data.unpaidCents > 0 || data.cancelled > 0) && (
            <p className="text-sm text-muted">
              {data.unpaidCents > 0 && <span className="text-warn">A receber (entregues sem pagamento marcado): {brl(data.unpaidCents)}. </span>}
              {data.cancelled > 0 && `${data.cancelled} pedido(s) cancelado(s).`}
            </p>
          )}

          <div className="card p-4">
            <p className="mb-3 font-bold">Por dia</p>
            <div className="flex h-36 items-end gap-[2px]" role="img" aria-label="Faturamento por dia">
              {data.byDay.map((d) => (
                <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dayNum(d.day)}: ${brl(d.cents)}`}>
                  <div className={`rounded-t ${d.cents ? 'bg-accent' : 'bg-surface2'}`} style={{ height: `${Math.max(2, (d.cents / max) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>1</span>
              <span>{data.byDay.length}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <p className="mb-3 font-bold">Por forma de pagamento</p>
              {(Object.keys(METHOD) as (keyof typeof METHOD)[]).map((k) => (
                <div key={k} className="flex justify-between py-1.5">
                  <span className="text-soft">{METHOD[k]}</span>
                  <span className="font-medium">{brl(data.byMethod[k] || 0)}</span>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <p className="mb-3 font-bold">Mais vendidos</p>
              {!data.topProducts.length && <p className="text-muted">Sem vendas no mês.</p>}
              {data.topProducts.map((p) => (
                <div key={p.name} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0 break-words text-soft">
                    {p.quantity}× {p.name}
                  </span>
                  <span className="shrink-0 font-medium">{brl(p.totalCents)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
