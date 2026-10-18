import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, useApi, type Settings } from '../../api';
import { reloadConfig } from '../../config';
import { ErrorBox, Field, FormError, Loading, PageHead, Switch, toast } from '../../ui';
import { fmtWindow, moneyInput, parseMoney, WEEKDAYS_SHORT } from '../../util';

function Schedule() {
  const { data, error, loading, reload } = useApi<Settings>('/admin/settings');
  const [s, setS] = useState<Settings | null>(null);
  const [newWin, setNewWin] = useState({ from: '', to: '' });
  const [min, setMin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setS(data);
      setMin(moneyInput(data.minOrderCents));
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !s) return <ErrorBox message={error || 'Erro'} onRetry={reload} />;

  async function save() {
    if (!s) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.put<Settings>('/admin/settings', {
        deliveryDays: s.deliveryDays,
        windows: s.windows,
        cutoffTime: s.cutoffTime,
        leadDays: s.leadDays,
        maxDays: s.maxDays,
        minOrderCents: parseMoney(min || '0') ?? 0,
      });
      setS(r);
      reloadConfig();
      toast('Entrega atualizada');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const addWindow = () => {
    if (!newWin.from || !newWin.to) return;
    setS({ ...s, windows: [...s.windows, `${newWin.from}-${newWin.to}`].sort() });
    setNewWin({ from: '', to: '' });
  };

  return (
    <section className="flex flex-col gap-5">
      <h2 className="h2">Dias e horários</h2>
      <p className="-mt-3 text-sm text-muted">A entrega é grátis. O cliente escolhe o dia no calendário e uma das faixas de horário abaixo.</p>
      <div>
        <p className="label">Dias com entrega</p>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              className={`flex min-h-[48px] items-center justify-center rounded-xl border text-sm font-bold ${s.deliveryDays[d] ? 'border-accent bg-accent text-bg' : 'border-line2 text-muted'}`}
              onClick={() => setS({ ...s, deliveryDays: s.deliveryDays.map((v, i) => (i === d ? !v : v)) })}
            >
              {WEEKDAYS_SHORT[d]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Faixas de horário</p>
        <div className="flex flex-wrap gap-2">
          {s.windows.map((w) => (
            <span key={w} className="flex min-h-[44px] items-center gap-1 rounded-full border border-line2 pl-4 pr-1">
              {fmtWindow(w)}
              <button type="button" aria-label={`Remover ${w}`} className="flex h-10 w-10 items-center justify-center text-muted" onClick={() => setS({ ...s, windows: s.windows.filter((x) => x !== w) })}>
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input type="time" className="input" value={newWin.from} onChange={(e) => setNewWin({ ...newWin, from: e.target.value })} aria-label="Início" />
          <input type="time" className="input" value={newWin.to} onChange={(e) => setNewWin({ ...newWin, to: e.target.value })} aria-label="Fim" />
          <button type="button" className="btn-pill" aria-label="Adicionar faixa" onClick={addWindow}>
            <Plus size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <Field label="Pedidos para hoje até" hint="Depois disso, só para os próximos dias">
          <input type="time" className="input" value={s.cutoffTime} onChange={(e) => setS({ ...s, cutoffTime: e.target.value })} />
        </Field>
        <Field label="Antecedência mínima (dias)" hint="0 = entrega no mesmo dia">
          <input className="input" inputMode="numeric" value={String(s.leadDays)} onChange={(e) => setS({ ...s, leadDays: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        </Field>
        <Field label="Agendar até (dias à frente)">
          <input className="input" inputMode="numeric" value={String(s.maxDays)} onChange={(e) => setS({ ...s, maxDays: Number(e.target.value.replace(/\D/g, '')) || 1 })} />
        </Field>
        <Field label="Pedido mínimo (R$)" hint="Sem contar a entrega; 0 = sem mínimo">
          <input className="input" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
        </Field>
      </div>
      <FormError message={err} />
      <button className="btn-primary" disabled={busy} onClick={save}>
        {busy ? 'Salvando…' : 'Salvar dias e horários'}
      </button>
    </section>
  );
}

export default function Delivery() {
  const settings = useApi<Settings>('/admin/settings');
  async function toggle(v: boolean) {
    try {
      await api.put('/admin/settings', { acceptingOrders: v });
      settings.reload();
      reloadConfig();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  return (
    <div>
      <PageHead title="Entrega" />
      {settings.data && (
        <div className="card mb-6 flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-bold">{settings.data.acceptingOrders ? 'Recebendo pedidos' : 'Loja fechada para pedidos'}</p>
            <p className="text-sm text-muted">Desligue para pausar novos pedidos.</p>
          </div>
          <Switch checked={settings.data.acceptingOrders} onChange={toggle} label="Recebendo pedidos" />
        </div>
      )}
      <div className="max-w-2xl">
        <Schedule />
      </div>
    </div>
  );
}
