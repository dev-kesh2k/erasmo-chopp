import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, ChevronLeft, Eye, EyeOff, Loader2, Minus, Package, Plus, X, type LucideIcon } from 'lucide-react';
import type { OrderStatus } from './api';
import { STATUS } from './util';

export function PageHead({ title, subtitle, action, back, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; back?: string | true; eyebrow?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        {back && (
          <button type="button" aria-label="Voltar" onClick={() => (back === true ? nav(-1) : nav(back))} className="icon-btn border-transparent">
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-1 text-sm font-bold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>}
          <h1 className="h1">{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="mt-3 text-base text-muted">{subtitle}</p>}
    </header>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-surface2'}`}
    >
      <span className={`absolute top-[4px] h-[22px] w-[22px] rounded-full transition-all ${checked ? 'left-[26px] bg-bg' : 'left-[4px] bg-muted'}`} />
      <span className="absolute -inset-2" />
    </button>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
}

/** Foto do produto ou ícone listrado. */
export function ProductThumb({ src, size = 'md' }: { src?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const box = size === 'lg' ? 'aspect-[4/3] w-full rounded-[16px]' : size === 'sm' ? 'h-12 w-12 rounded-xl' : 'h-16 w-16 rounded-2xl min-[380px]:h-20 min-[380px]:w-20';
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className={`shrink-0 bg-surface2 object-cover ${box}`} />;
  return (
    <div className={`stripes flex shrink-0 items-center justify-center text-accent ${box}`}>
      <Package size={size === 'sm' ? 20 : 28} />
    </div>
  );
}

/** Seletor de quantidade − n + */
export function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max?: number | null }) {
  const limit = max ?? 999;
  return (
    <div className="flex shrink-0 items-center rounded-2xl border border-line2">
      <button type="button" aria-label="Diminuir" onClick={() => onChange(value - 1)} className="flex h-11 w-11 items-center justify-center text-ink">
        <Minus size={18} />
      </button>
      <span className="min-w-[2ch] text-center text-base font-bold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Aumentar"
        disabled={value >= limit}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center text-accent disabled:text-dis"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="animate-spin" size={20} /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <AlertCircle className="text-bad" />
      <p className="text-soft">{message}</p>
      {onRetry && (
        <button className="btn-secondary min-h-[44px]" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: I, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface2 text-accent">
        <I size={26} />
      </div>
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="max-w-sm text-muted">{text}</p>}
      {action && <div className="mt-3 w-full max-w-xs">{action}</div>}
    </div>
  );
}

/**
 * Alerta na tela (sobre a página) para informação pendente ou erro do formulário.
 * Várias linhas (separadas por \n) viram uma lista. onClose deve limpar a mensagem.
 */
export function FormError({ message, onClose, title = 'Atenção' }: { message: string; onClose?: () => void; title?: string }) {
  const [dismissed, setDismissed] = useState('');
  const open = !!message && dismissed !== message;
  const close = () => (onClose ? onClose() : setDismissed(message));
  useEffect(() => {
    if (!message) setDismissed('');
  }, [message]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && (e.preventDefault(), close());
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  if (!open) return null;
  const lines = message.split('\n').filter(Boolean);
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="form-alert-title">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70" onClick={close} />
      <div className="relative max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-[24px] border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint2 text-accent">
            <AlertCircle size={26} />
          </span>
          <h2 id="form-alert-title" className="h2 min-w-0 break-words">
            {title}
          </h2>
        </div>
        {lines.length > 1 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {lines.map((l) => (
              <li key={l} className="flex gap-2 break-words text-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0">{l}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 break-words text-soft">{lines[0]}</p>
        )}
        <button type="button" className="btn-primary mt-6 w-full" onClick={close} autoFocus>
          Entendi
        </button>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function IconInput({ icon: I, ...props }: { icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <I size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input {...props} className="input pl-12" />
    </div>
  );
}

export function PasswordInput({ icon: I, ...props }: { icon?: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {I && <I size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />}
      <input {...props} type={show ? 'text' : 'password'} className={`input pr-14 ${I ? 'pl-12' : ''}`} />
      <button
        type="button"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted"
      >
        {show ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}

export function Radio({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-accent' : 'border-line2'}`}>
      {on && <span className="h-3 w-3 rounded-full bg-accent" />}
    </span>
  );
}

export function Checkbox({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-bg' : 'border-line2'}`}>
      {on && <Check size={16} strokeWidth={3} />}
    </span>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-line bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 md:max-w-lg md:rounded-[24px]">
        <div className="mb-5 flex items-center gap-3">
          <h2 className="h2 min-w-0 flex-1 break-words">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="icon-btn h-11 w-11 bg-surface2">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ToastMsg = { id: number; text: string; error?: boolean };
let pushToast: (t: ToastMsg) => void = () => {};
export const toast = (text: string, error = false) => pushToast({ id: Date.now() + Math.random(), text, error });

export function Toaster() {
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => {
    pushToast = (t) => {
      setList((l) => [...l, t]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3200);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl ${t.error ? 'border-bad/50 bg-badbg text-bad' : 'border-line bg-surface2 text-ink'}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
