import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import { api, useApi, type Settings, type Zone } from '../../api';
import { reloadConfig } from '../../config';
import { Checkbox, Empty, ErrorBox, Field, FormError, Loading, PageHead, Sheet, Switch, toast } from '../../ui';
import { brl, fmtWindow, moneyInput, parseMoney, WEEKDAYS_SHORT } from '../../util';

function Zones() {
  const { data, error, loading, reload } = useApi<Zone[]>('/admin/zones');
  const [draft, setDraft] = useState<{ id?: string; name: string; fee: string; active: boolean } | null>(null);
  const [err, setErr] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const fee = parseMoney(draft.fee || '0');
    if (fee === null) return setErr('Taxa inválida');
    try {
      const body = { name: draft.name, feeCents: fee, active: draft.active };
      if (draft.id) await api.put(`/admin/zones/${draft.id}`, body);
      else await api.post('/admin/zones', body);
      setDraft(null);
      reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }

  async function remove() {
    if (!draft?.id || !confirm(`Excluir o bairro ${draft.name}?`)) return;
    await api.del(`/admin/zones/${draft.id}`).catch((e) => toast((e as Error).message, true));
    setDraft(null);
    reload();
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="h2 flex-1">Bairros e taxas</h2>
        <button
          className="btn-pill"
          onClick={() => {
            setErr('');
            setDraft({ name: '', fee: '', active: true });
          }}
        >
          <Plus size={20} /> <span className="hidden min-[400px]:inline">Bairro</span>
        </button>
      </div>
      {!data?.length ? (
        <Empty icon={MapPin} title="Nenhum bairro" text="Sem bairros cadastrados o cliente não consegue finalizar o pedido." />
      ) : (
        <div className="card divide-y divide-line">
          {data.map((z) => (
            <button
              key={z.id}
              className={`flex min-h-[56px] w-full items-center gap-3 px-4 text-left ${z.active ? '' : 'opacity-50'}`}
              onClick={() => {
                setErr('');
                setDraft({ id: z.id, name: z.name, fee: moneyInput(z.feeCents), active: z.active !== false });
              }}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{z.name}</span>
              <span className="text-soft">{z.feeCents ? brl(z.feeCents) : 'Grátis'}</span>
            </button>
          ))}
        </div>
      )}
      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Editar bairro' : 'Novo bairro'}>
        {draft && (
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Bairro / região">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={80} />
            </Field>
            <Field label="Taxa de entrega (R$)" hint="0 = entrega grátis">
              <input className="input" inputMode="decimal" value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />
            </Field>
            <button type="button" className="flex min-h-[44px] items-center gap-3" onClick={() => setDraft({ ...draft, active: !draft.active })}>
              <Checkbox on={draft.active} /> Entregamos neste bairro
            </button>
            <FormError message={err} />
            <button className="btn-primary">Salvar</button>
            {draft.id && (
              <button type="button" className="btn-danger" onClick={remove}>
                <Trash2 size={18} /> Excluir
              </button>
            )}
          </form>
        )}
      </Sheet>
    </section>
  );
}

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
      <div className="grid gap-8 lg:grid-cols-2">
        <Zones />
        <Schedule />
      </div>
    </div>
  );
}
