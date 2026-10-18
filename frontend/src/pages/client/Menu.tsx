import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, Store } from 'lucide-react';
import { productPhoto, useApi, type Catalog, type Product } from '../../api';
import { cartCount, setQty, useCart } from '../../client';
import { useConfig } from '../../config';
import { Logo } from '../../layout';
import { Empty, ErrorBox, Loading, ProductThumb, Stepper, toast } from '../../ui';
import { brl } from '../../util';

function ProductCard({ p, qty }: { p: Product; qty: number }) {
  const out = p.stock !== null && p.stock <= 0;
  return (
    <div className="card flex gap-3 p-3 min-[380px]:gap-4 min-[380px]:p-4">
      <ProductThumb src={productPhoto(p)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="break-words text-base font-bold leading-tight">{p.name}</p>
        <p className="mt-0.5 text-sm text-muted">{p.unit}</p>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-soft">{p.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="text-lg font-bold text-accent">{brl(p.priceCents)}</span>
          {out ? (
            <span className="rounded-full bg-surface2 px-3 py-1.5 text-sm font-bold text-muted">Esgotado</span>
          ) : qty ? (
            <Stepper value={qty} max={p.stock} onChange={(n) => setQty(p.id, n)} />
          ) : (
            <button
              type="button"
              className="btn-pill min-h-[44px] px-4"
              onClick={() => {
                setQty(p.id, 1);
                toast(`${p.name} no carrinho`);
              }}
            >
              Adicionar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Menu() {
  const config = useConfig();
  const { data, error, loading, reload } = useApi<Catalog>('/catalog');
  const cart = useCart();
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.products || []).filter((p) => (!cat || p.categoryId === cat) && (!term || `${p.name} ${p.description}`.toLowerCase().includes(term)));
  }, [data, cat, q]);

  const featured = (data?.products || []).filter((p) => p.featured);
  const count = cartCount(cart);
  const total = (data?.products || []).reduce((s, p) => s + (cart[p.id] || 0) * p.priceCents, 0);

  return (
    <div>
      <div className="md:hidden">
        <Logo />
      </div>
      <h1 className="h1 mt-6 md:mt-0">{config?.tagline || 'Faça seu pedido'}</h1>
      {config && !config.acceptingOrders && (
        <p className="mt-4 rounded-2xl bg-warnbg px-4 py-3 text-sm font-medium text-warn">No momento não estamos recebendo pedidos. Volte mais tarde!</p>
      )}

      <div className="relative mt-5">
        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-12" placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <div className="mt-6">
          <ErrorBox message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          {!!data?.categories.length && (
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 min-[380px]:-mx-6 min-[380px]:px-6 md:mx-0 md:flex-wrap md:px-0">
              <button className={`chip ${!cat ? 'chip-on' : ''}`} onClick={() => setCat('')}>
                Todos
              </button>
              {data.categories.map((c) => (
                <button key={c.id} className={`chip ${cat === c.id ? 'chip-on' : ''}`} onClick={() => setCat(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {!cat && !q && featured.length > 0 && (
            <section className="mt-6">
              <h2 className="h2 mb-3">Destaques</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {featured.map((p) => (
                  <ProductCard key={p.id} p={p} qty={cart[p.id] || 0} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            {!cat && !q && featured.length > 0 && <h2 className="h2 mb-3">Todos os produtos</h2>}
            {list.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((p) => (
                  <ProductCard key={p.id} p={p} qty={cart[p.id] || 0} />
                ))}
              </div>
            ) : (
              <Empty icon={Store} title="Nenhum produto encontrado" text={q ? 'Tente outra busca.' : 'O cardápio ainda está sendo montado.'} />
            )}
          </section>
        </>
      )}

      {count > 0 && (
        <Link
          to="/carrinho"
          className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto flex min-h-[56px] max-w-xl items-center gap-3 rounded-2xl bg-accent px-5 font-bold text-bg shadow-2xl md:bottom-8 md:left-[calc(16rem+2rem)]"
        >
          <ShoppingCart size={22} />
          <span className="min-w-0 flex-1 truncate">
            Ver carrinho · {count} {count === 1 ? 'item' : 'itens'}
          </span>
          <span>{brl(total)}</span>
        </Link>
      )}
      {count > 0 && <div className="h-20" />}
    </div>
  );
}
