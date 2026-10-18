import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, Info, LayoutGrid, Lock, LogOut, MapPin, Package, Receipt, Settings, ShoppingCart, Store, type LucideIcon } from 'lucide-react';
import { API_BASE } from './api';
import { useAuth } from './auth';
import { cartCount, useCart } from './client';
import { useConfig } from './config';

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: 'cart' | 'orders' };

export const CLIENT_TABS: Tab[] = [
  { to: '/', label: 'Cardápio', icon: Store, end: true },
  { to: '/carrinho', label: 'Carrinho', icon: ShoppingCart, badge: 'cart' },
  { to: '/pedidos', label: 'Pedidos', icon: Receipt },
  { to: '/sobre', label: 'Sobre', icon: Info },
];

export const ADMIN_TABS: Tab[] = [
  { to: '/admin', label: 'Painel', icon: LayoutGrid, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, badge: 'orders' },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/entrega', label: 'Entrega', icon: MapPin },
  { to: '/admin/financeiro', label: 'Financeiro', icon: BarChart3 },
];

export function Logo({ compact }: { compact?: boolean }) {
  const config = useConfig();
  const size = compact ? 'h-10 w-10' : 'h-12 w-12';
  return (
    <div className="flex min-w-0 items-center gap-3">
      {config?.logoVersion ? (
        <img src={`${API_BASE}/logo?v=${config.logoVersion}`} alt="" className={`${size} shrink-0 rounded-xl object-contain`} />
      ) : (
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className={`${size} shrink-0 rounded-xl`} />
      )}
      <p className="min-w-0 truncate font-display text-2xl font-extrabold uppercase leading-none">{config?.storeName || ''}</p>
    </div>
  );
}

function Badge({ kind }: { kind?: Tab['badge'] }) {
  const cart = useCart();
  const { unread } = useAuth();
  const n = kind === 'cart' ? cartCount(cart) : kind === 'orders' ? unread : 0;
  if (!n) return null;
  return (
    <span className="absolute -right-2 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-bg">
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Página com abas: barra inferior no celular e menu lateral a partir do md. */
export function TabsLayout({ tabs, admin }: { tabs: Tab[]; admin?: boolean }) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-[100dvh] md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-tabbar px-4 py-6 md:flex">
        <div className="px-2">
          <Logo compact />
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Menu">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium transition ${isActive ? 'bg-tint2 font-bold text-accent' : 'text-soft hover:bg-surface'}`
              }
            >
              <span className="relative">
                <t.icon size={22} />
                <Badge kind={t.badge} />
              </span>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {admin ? (
            <>
              <NavLink
                to="/admin/config"
                className={({ isActive }) =>
                  `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium ${isActive ? 'bg-tint2 text-accent' : 'text-soft hover:bg-surface'}`
                }
              >
                <Settings size={22} /> Configurações
              </NavLink>
              <button onClick={signOut} className="flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium text-bad hover:bg-surface">
                <LogOut size={22} /> Sair
              </button>
            </>
          ) : (
            <NavLink to="/admin" className="flex min-h-[44px] items-center gap-3 rounded-2xl px-4 text-sm text-muted hover:bg-surface">
              <Lock size={18} /> Área da loja
            </NavLink>
          )}
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] min-[380px]:px-6 md:px-10 md:pb-12 md:pt-10">
        <Outlet />
      </main>

      <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-tabbar pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-xl">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex min-h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[clamp(11px,3.3vw,13px)] transition ${isActive ? 'font-bold text-accent' : 'text-muted'}`
              }
            >
              <span className="relative">
                <t.icon size={24} strokeWidth={1.9} />
                <Badge kind={t.badge} />
              </span>
              <span className="max-w-full truncate">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Tela cheia sem abas (finalizar pedido). */
export function FullPage({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <div
        className={`mx-auto w-full max-w-3xl px-5 pt-[max(2rem,env(safe-area-inset-top))] min-[380px]:px-6 ${footer ? 'pb-[calc(7.5rem+env(safe-area-inset-bottom))]' : 'pb-[max(2rem,env(safe-area-inset-bottom))]'}`}
      >
        {children}
      </div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 min-[380px]:px-6">{footer}</div>
        </div>
      )}
    </div>
  );
}
