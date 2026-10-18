import { Clock, Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useConfig } from '../../config';
import { Logo } from '../../layout';
import { Loading } from '../../ui';
import { fmtWindow, WEEKDAYS_SHORT, waLink } from '../../util';

export default function About() {
  const c = useConfig();
  if (!c) return <Loading />;
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => c.deliveryDays[d]).map((d) => WEEKDAYS_SHORT[d]);
  return (
    <div className="flex flex-col gap-5">
      <Logo />
      {c.about && <p className="whitespace-pre-line text-soft">{c.about}</p>}
      <div className="card flex flex-col divide-y divide-line">
        <div className="flex items-start gap-3 p-4">
          <Clock className="mt-0.5 shrink-0 text-accent" size={20} />
          <div className="min-w-0">
            <p className="font-bold">Entregas</p>
            <p className="text-soft">{days.join(', ')}</p>
            <p className="text-sm text-muted">{c.windows.map(fmtWindow).join(' · ')}</p>
          </div>
        </div>
        {c.address && (
          <a className="flex items-start gap-3 p-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer">
            <MapPin className="mt-0.5 shrink-0 text-accent" size={20} />
            <span className="min-w-0 break-words text-soft">{c.address}</span>
          </a>
        )}
        {c.phone && (
          <a className="flex items-center gap-3 p-4" href={`tel:${c.phone.replace(/\D/g, '')}`}>
            <Phone className="shrink-0 text-accent" size={20} />
            <span className="text-soft">{c.phone}</span>
          </a>
        )}
        {c.whatsapp && (
          <a className="flex items-center gap-3 p-4" href={waLink(c.whatsapp)} target="_blank" rel="noreferrer">
            <MessageCircle className="shrink-0 text-accent" size={20} />
            <span className="text-soft">WhatsApp {c.whatsapp}</span>
          </a>
        )}
        {c.instagram && (
          <a className="flex items-center gap-3 p-4" href={c.instagram} target="_blank" rel="noreferrer">
            <Instagram className="shrink-0 text-accent" size={20} />
            <span className="min-w-0 truncate text-soft">Instagram</span>
          </a>
        )}
      </div>
    </div>
  );
}
