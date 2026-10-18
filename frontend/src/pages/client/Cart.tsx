import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { productPhoto, useApi, type Catalog } from '../../api';
import { clearCart, setQty, useCart } from '../../client';
import { useConfig } from '../../config';
import { Empty, ErrorBox, Loading, PageHead, ProductThumb, Stepper } from '../../ui';
import { brl } from '../../util';

export default function Cart() {
  const config = useConfig();
  const cart = useCart();
  const { data, error, loading, reload } = useApi<Catalog>('/catalog');

  // Remove do carrinho o que saiu do cardápio.
  useEffect(() => {
    if (!data) return;
    for (const id of Object.keys(cart)) if (!data.products.some((p) => p.id === id)) setQty(id, 0);
  }, [data, cart]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const lines = (data?.products || []).filter((p) => cart[p.id]).map((p) => ({ p, qty: cart[p.id] }));
  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const min = config?.minOrderCents || 0;
  const overStock = lines.find((l) => l.p.stock !== null && l.qty > l.p.stock);

  return (
    <div>
      <PageHead
        title="Carrinho"
        action={
          lines.length > 0 && (
            <button type="button" className="icon-btn" aria-label="Esvaziar carrinho" onClick={() => confirm('Esvaziar o carrinho?') && clearCart()}>
              <Trash2 size={20} />
            </button>
          )
        }
      />
      {!lines.length ? (
        <Empty
          icon={ShoppingCart}
          title="Seu carrinho está vazio"
          text="Escolha os produtos no cardápio."
          action={
            <Link to="/" className="btn-primary">
              Ver cardápio
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-start">
          <div className="flex flex-col gap-3">
            {lines.map(({ p, qty }) => (
              <div key={p.id} className="card flex items-center gap-3 p-3 min-[380px]:p-4">
                <ProductThumb src={productPhoto(p)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold leading-tight">{p.name}</p>
                  <p className="text-sm text-muted">
                    {brl(p.priceCents)} · {p.unit}
                  </p>
                  {p.stock !== null && qty > p.stock && <p className="text-sm font-medium text-bad">Restam só {p.stock}</p>}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <Stepper value={qty} max={p.stock} onChange={(n) => setQty(p.id, n)} />
                    <span className="font-bold">{brl(p.priceCents * qty)}</span>
                  </div>
                </div>
              </div>
            ))}
            <Link to="/" className="btn-secondary">
              Adicionar mais itens
            </Link>
          </div>
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex justify-between text-base">
              <span className="text-soft">Subtotal</span>
              <span className="font-bold">{brl(subtotal)}</span>
            </div>
            <p className="text-sm text-muted">Entrega grátis. Na próxima etapa você escolhe o dia e o horário.</p>
            {min > subtotal && <p className="rounded-xl bg-warnbg px-4 py-3 text-sm text-warn">Pedido mínimo de {brl(min)}. Faltam {brl(min - subtotal)}.</p>}
            {config && !config.acceptingOrders && <p className="rounded-xl bg-warnbg px-4 py-3 text-sm text-warn">A loja não está recebendo pedidos agora.</p>}
            <Link
              to="/finalizar"
              aria-disabled={min > subtotal || !!overStock || !config?.acceptingOrders}
              className={`btn-primary ${min > subtotal || overStock || !config?.acceptingOrders ? 'pointer-events-none opacity-50' : ''}`}
            >
              Continuar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
