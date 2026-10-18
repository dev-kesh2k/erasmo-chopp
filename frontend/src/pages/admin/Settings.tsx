import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, LogOut } from 'lucide-react';
import { api, API_BASE, useApi, type Settings, type User } from '../../api';
import { useAuth } from '../../auth';
import { reloadConfig } from '../../config';
import { ErrorBox, Field, FormError, Loading, PageHead, PasswordInput, toast } from '../../ui';
import { resizeImage } from '../../util';

function Store() {
  const { data, error, loading, reload } = useApi<Settings>('/admin/settings');
  const [s, setS] = useState<Settings | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (data) setS(data);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !s) return <ErrorBox message={error || 'Erro'} onRetry={reload} />;

  const set = (k: keyof Settings) => (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setErr('');
    try {
      const { storeName, tagline, phone, whatsapp, address, about, instagram, pixKey } = s;
      setS(await api.put<Settings>('/admin/settings', { storeName, tagline, phone, whatsapp, address, about, instagram, pixKey }));
      reloadConfig();
      toast('Configurações salvas');
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    try {
      const data = await resizeImage(file, 512, 'image/png');
      const r = await api.post<{ logoVersion: number }>('/admin/logo', { data });
      setS((cur) => (cur ? { ...cur, logoVersion: r.logoVersion } : cur));
      reloadConfig();
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function removeLogo() {
    await api.del('/admin/logo').catch(() => {});
    setS((cur) => (cur ? { ...cur, logoVersion: 0 } : cur));
    reloadConfig();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <h2 className="h2">Loja</h2>
      <div className="flex items-center gap-4">
        <img
          src={s.logoVersion ? `${API_BASE}/logo?v=${s.logoVersion}` : `${import.meta.env.BASE_URL}icon.svg`}
          alt=""
          className="h-20 w-20 shrink-0 rounded-2xl border border-line bg-surface2 object-contain"
        />
        <div className="flex flex-col gap-1">
          <button type="button" className="flex min-h-[44px] items-center gap-2 font-medium text-accent" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={18} /> {s.logoVersion ? 'Trocar logo' : 'Enviar logo'}
          </button>
          {!!s.logoVersion && (
            <button type="button" className="min-h-[36px] text-left text-sm text-bad" onClick={removeLogo}>
              Remover logo
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
            if (f) uploadLogo(f);
          }}
        />
      </div>
      <Field label="Nome da loja">
        <input className="input" value={s.storeName} onChange={set('storeName')} required maxLength={60} />
      </Field>
      <Field label="Frase de destaque (topo do cardápio)">
        <input className="input" value={s.tagline} onChange={set('tagline')} maxLength={120} />
      </Field>
      <div className="grid gap-4 min-[480px]:grid-cols-2">
        <Field label="Telefone">
          <input className="input" inputMode="tel" value={s.phone} onChange={set('phone')} maxLength={30} />
        </Field>
        <Field label="WhatsApp da loja" hint="Recebe o resumo dos pedidos e as mensagens do botão Suporte">
          <input className="input" inputMode="tel" value={s.whatsapp} onChange={set('whatsapp')} maxLength={30} />
        </Field>
      </div>
      <Field label="Chave Pix">
        <input className="input" value={s.pixKey} onChange={set('pixKey')} maxLength={120} />
      </Field>
      <Field label="Endereço">
        <input className="input" value={s.address} onChange={set('address')} maxLength={200} />
      </Field>
      <Field label="Instagram (link)">
        <input className="input" inputMode="url" placeholder="https://instagram.com/…" value={s.instagram} onChange={set('instagram')} maxLength={300} />
      </Field>
      <Field label="Sobre a loja">
        <textarea className="input min-h-[120px]" value={s.about} onChange={set('about')} maxLength={1500} />
      </Field>
      <FormError message={err} />
      <button className="btn-primary" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}

function Account() {
  const { user, setUser, signOut } = useAuth();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [err, setErr] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const r = await api.put<{ user: User }>('/auth/me', f);
      setUser(r.user);
      setF({ ...f, currentPassword: '', newPassword: '' });
      toast('Conta atualizada');
    } catch (e2) {
      setErr((e2 as Error).message);
    }
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <h2 className="h2">Minha conta</h2>
      <Field label="Nome">
        <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} />
      </Field>
      <Field label="E-mail">
        <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      </Field>
      <Field label="Nova senha (opcional)">
        <PasswordInput autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
      </Field>
      {f.newPassword && (
        <Field label="Senha atual">
          <PasswordInput autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required />
        </Field>
      )}
      <FormError message={err} />
      <button className="btn-secondary">Salvar conta</button>
      <button type="button" className="btn-danger md:hidden" onClick={signOut}>
        <LogOut size={18} /> Sair
      </button>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHead title="Configurações" back="/admin" />
      <div className="grid gap-10 lg:grid-cols-2">
        <Store />
        <Account />
      </div>
    </div>
  );
}
