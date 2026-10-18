import { useRef, useState, type FormEvent } from 'react';
import { ImagePlus, Package, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { api, productPhoto, useApi, type Product } from '../../api';
import { Checkbox, Empty, ErrorBox, Field, FormError, Loading, PageHead, ProductThumb, Sheet, Switch, toast } from '../../ui';
import { brl, moneyInput, parseMoney, resizeImage } from '../../util';

interface AdminCategory {
  id: string;
  name: string;
  sortOrder: number;
  products: number;
}

type Draft = { id?: string; name: string; description: string; unit: string; price: string; stock: string; categoryId: string; active: boolean; featured: boolean; sortOrder: string; photoVersion: number };

const blank: Draft = { name: '', description: '', unit: 'un', price: '', stock: '', categoryId: '', active: true, featured: false, sortOrder: '0', photoVersion: 0 };

function Categories({ list, reload }: { list: AdminCategory[]; reload: () => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  async function add(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/admin/categories', { name });
      setName('');
      reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }
  async function rename(c: AdminCategory) {
    const n = prompt('Nome da categoria', c.name);
    if (!n?.trim()) return;
    try {
      await api.put(`/admin/categories/${c.id}`, { name: n });
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  async function remove(c: AdminCategory) {
    if (!confirm(`Excluir a categoria ${c.name}? Os produtos ficam sem categoria.`)) return;
    try {
      await api.del(`/admin/categories/${c.id}`);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {list.map((c) => (
        <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-surface2 px-4 py-2">
          <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
          <span className="text-sm text-muted">{c.products}</span>
          <button className="icon-btn h-11 w-11 border-transparent bg-transparent" aria-label="Renomear" onClick={() => rename(c)}>
            <Pencil size={18} />
          </button>
          <button className="icon-btn h-11 w-11 border-transparent bg-transparent text-bad" aria-label="Excluir" onClick={() => remove(c)}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <input className="input" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        <button className="btn-pill" aria-label="Adicionar categoria">
          <Plus size={20} />
        </button>
      </form>
      <FormError message={err} onClose={() => setErr('')} />
    </div>
  );
}

export default function Products() {
  const products = useApi<Product[]>('/admin/products');
  const cats = useApi<AdminCategory[]>('/admin/categories');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (p?: Product) =>
    setDraft(
      p
        ? {
            id: p.id,
            name: p.name,
            description: p.description,
            unit: p.unit,
            price: moneyInput(p.priceCents),
            stock: p.stock === null ? '' : String(p.stock),
            categoryId: p.categoryId || '',
            active: p.active,
            featured: p.featured,
            sortOrder: String(p.sortOrder || 0),
            photoVersion: p.photoVersion,
          }
        : { ...blank },
    );

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const price = parseMoney(draft.price);
    if (price === null) return setErr('Informe o preço');
    setBusy(true);
    setErr('');
    const body = {
      name: draft.name,
      description: draft.description,
      unit: draft.unit,
      priceCents: price,
      stock: draft.stock.trim() === '' ? null : Number(draft.stock),
      categoryId: draft.categoryId,
      active: draft.active,
      featured: draft.featured,
      sortOrder: Number(draft.sortOrder) || 0,
    };
    try {
      if (draft.id) await api.put(`/admin/products/${draft.id}`, body);
      else await api.post('/admin/products', body);
      setDraft(null);
      products.reload();
      cats.reload();
      toast('Produto salvo');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id || !confirm(`Excluir ${draft.name}? Os pedidos antigos continuam com o nome e o preço.`)) return;
    try {
      await api.del(`/admin/products/${draft.id}`);
      setDraft(null);
      products.reload();
      cats.reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function uploadPhoto(file: File) {
    if (!draft?.id) return;
    try {
      const data = await resizeImage(file, 1000);
      const r = await api.post<{ photoVersion: number }>(`/admin/products/${draft.id}/photo`, { data });
      setDraft((d) => (d ? { ...d, photoVersion: r.photoVersion } : d));
      products.reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function removePhoto() {
    if (!draft?.id) return;
    await api.del(`/admin/products/${draft.id}/photo`).catch(() => {});
    setDraft((d) => (d ? { ...d, photoVersion: 0 } : d));
    products.reload();
  }

  async function toggleActive(p: Product) {
    try {
      await api.put(`/admin/products/${p.id}`, { ...p, active: !p.active });
      products.reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  if ((products.loading && !products.data) || (cats.loading && !cats.data)) return <Loading />;
  if (products.error || cats.error) return <ErrorBox message={products.error || cats.error} onRetry={() => (products.reload(), cats.reload())} />;

  const catName = (id: string | null) => cats.data?.find((c) => c.id === id)?.name || 'Sem categoria';
  const groups = [...(cats.data || []).map((c) => c.id), null].map((id) => ({ id, items: (products.data || []).filter((p) => p.categoryId === id) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHead
        title="Produtos"
        action={
          <div className="flex gap-2">
            <button className="icon-btn" aria-label="Categorias" onClick={() => setCatsOpen(true)}>
              <Tags size={20} />
            </button>
            <button className="btn-pill" onClick={() => open()}>
              <Plus size={20} /> <span className="hidden min-[400px]:inline">Novo</span>
            </button>
          </div>
        }
      />
      {!groups.length ? (
        <Empty icon={Package} title="Nenhum produto" text="Cadastre os produtos do seu cardápio." />
      ) : (
        groups.map((g) => (
          <section key={g.id || 'none'} className="mb-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-muted">{catName(g.id)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {g.items.map((p) => (
                <div key={p.id} className={`card flex items-center gap-3 p-3 ${p.active ? '' : 'opacity-60'}`}>
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => open(p)}>
                    <ProductThumb src={productPhoto(p)} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-bold">{p.name}</p>
                      <p className="text-sm text-soft">
                        {brl(p.priceCents)} · {p.unit}
                      </p>
                      <p className={`text-sm ${p.stock !== null && p.stock <= 3 ? 'text-warn' : 'text-muted'}`}>{p.stock === null ? 'Sem controle de estoque' : `Estoque: ${p.stock}`}</p>
                    </div>
                  </button>
                  <Switch checked={p.active} onChange={() => toggleActive(p)} label="Disponível no cardápio" />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <Sheet open={catsOpen} onClose={() => setCatsOpen(false)} title="Categorias">
        <Categories list={cats.data || []} reload={cats.reload} />
      </Sheet>

      <Sheet open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Editar produto' : 'Novo produto'}>
        {draft && (
          <form onSubmit={save} className="flex flex-col gap-4">
            {draft.id ? (
              <div className="flex items-center gap-3">
                <ProductThumb src={productPhoto({ id: draft.id, photoVersion: draft.photoVersion })} />
                <div className="flex flex-col gap-1">
                  <button type="button" className="flex min-h-[44px] items-center gap-2 font-medium text-accent" onClick={() => fileRef.current?.click()}>
                    <ImagePlus size={18} /> {draft.photoVersion ? 'Trocar foto' : 'Enviar foto'}
                  </button>
                  {!!draft.photoVersion && (
                    <button type="button" className="min-h-[36px] text-left text-sm text-bad" onClick={removePhoto}>
                      Remover foto
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) uploadPhoto(f);
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">Salve o produto para enviar a foto.</p>
            )}
            <Field label="Nome">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={80} />
            </Field>
            <Field label="Descrição">
              <textarea className="input min-h-[80px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)">
                <input className="input" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required />
              </Field>
              <Field label="Unidade">
                <input className="input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} maxLength={30} placeholder="barril 30 L" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estoque" hint="Vazio = sem controle">
                <input className="input" inputMode="numeric" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Ordem">
                <input className="input" inputMode="numeric" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/\D/g, '') })} />
              </Field>
            </div>
            <Field label="Categoria">
              <select className="input" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                <option value="">Sem categoria</option>
                {cats.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" className="flex min-h-[44px] items-center gap-3" onClick={() => setDraft({ ...draft, active: !draft.active })}>
              <Checkbox on={draft.active} /> Disponível no cardápio
            </button>
            <button type="button" className="flex min-h-[44px] items-center gap-3" onClick={() => setDraft({ ...draft, featured: !draft.featured })}>
              <Checkbox on={draft.featured} /> Mostrar em destaque
            </button>
            <FormError message={err} onClose={() => setErr('')} />
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
            {draft.id && (
              <button type="button" className="btn-danger" onClick={remove}>
                Excluir produto
              </button>
            )}
          </form>
        )}
      </Sheet>
    </div>
  );
}
