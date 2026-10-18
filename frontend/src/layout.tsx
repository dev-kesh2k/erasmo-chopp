import type { ComponentType, ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, ClipboardList, LayoutGrid, Lock, LogOut, MapPin, Package, Receipt, Settings, ShoppingCart, Store, type LucideProps } from 'lucide-react';
import { API_BASE } from './api';
import { useAuth } from './auth';
import { cartCount, useCart } from './client';
import { useConfig } from './config';
import { toast } from './ui';
import { waLink } from './util';

type Icon = ComponentType<LucideProps>;
/** support: em vez de abrir uma página, leva ao WhatsApp da loja (Configurações → WhatsApp da loja). */
type Tab = { to: string; label: string; icon: Icon; end?: boolean; badge?: 'cart' | 'orders'; support?: boolean };

/** Ícone do WhatsApp (o lucide não tem ícones de marca). */
export function WhatsAppIcon({ size = 24, className }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.77 6.68c0 5.2-4.24 9.43-9.46 9.43zm8.04-17.47A11.3 11.3 0 0 0 12.04.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.6l6-1.57a11.33 11.33 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z" />
    </svg>
  );
}

export const CLIENT_TABS: Tab[] = [
  { to: '/', label: 'Cardápio', icon: Store, end: true },
  { to: '/carrinho', label: 'Carrinho', icon: ShoppingCart, badge: 'cart' },
  { to: '/pedidos', label: 'Pedidos', icon: Receipt },
  { to: '/suporte', label: 'Suporte', icon: WhatsAppIcon, support: true },
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

/** Item do menu: link de página ou, na aba de suporte, link direto para o WhatsApp da loja. */
function TabLink({ tab, className, children }: { tab: Tab; className: (active: boolean) => string; children: ReactNode }) {
  const config = useConfig();
  if (tab.support) {
    const number = config?.whatsapp || config?.phone || '';
    if (!number)
      return (
        <button type="button" className={className(false)} onClick={() => toast('A loja ainda não cadastrou o WhatsApp de suporte.', true)}>
          {children}
        </button>
      );
    return (
      <a className={className(false)} href={waLink(number, `Olá! Preciso de suporte${config?.storeName ? ` — ${config.storeName}` : ''}.`)} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <NavLink to={tab.to} end={tab.end} className={({ isActive }) => className(isActive)}>
      {children}
    </NavLink>
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
            <TabLink
              key={t.to}
              tab={t}
              className={(isActive) =>
                `flex min-h-[48px] items-center gap-3 rounded-2xl px-4 text-base font-medium transition ${isActive ? 'bg-tint2 font-bold text-accent' : 'text-soft hover:bg-surface'}`
              }
            >
              <span className="relative">
                <t.icon size={22} />
                <Badge kind={t.badge} />
              </span>
              {t.label}
            </TabLink>
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
            <TabLink
              key={t.to}
              tab={t}
              className={(isActive) =>
                `flex min-h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[clamp(11px,3.3vw,13px)] transition ${isActive ? 'font-bold text-accent' : 'text-muted'}`
              }
            >
              <span className="relative">
                <t.icon size={24} strokeWidth={1.9} />
                <Badge kind={t.badge} />
              </span>
              <span className="max-w-full truncate">{t.label}</span>
            </TabLink>
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
