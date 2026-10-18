import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, X } from 'lucide-react';

export interface Pin {
  lat: number;
  lng: number;
}

const BRAZIL: [number, number] = [-14.2, -51.9];

const icon = L.divIcon({
  className: '',
  html: '<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><path d="M17 1C8.7 1 2 7.6 2 15.8 2 27 17 43 17 43s15-16 15-27.2C32 7.6 25.3 1 17 1z" fill="#F59E0B" stroke="#0F0D0A" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="#0F0D0A"/></svg>',
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

/** Mapa (OpenStreetMap) para o cliente marcar o ponto de entrega: toque no mapa, arraste o pino, use a localização do aparelho ou busque o endereço digitado. */
export function MapPicker({ value, onChange, addressQuery }: { value: Pin | null; onChange: (p: Pin | null) => void; addressQuery: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: value ? [value.lat, value.lng] : BRAZIL, zoom: value ? 17 : 4, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const pos: L.LatLngExpression = [value.lat, value.lng];
    if (!marker.current) {
      marker.current = L.marker(pos, { icon, draggable: true }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else marker.current.setLatLng(pos);
  }, [value]);

  function focus(p: Pin) {
    onChange(p);
    map.current?.setView([p.lat, p.lng], 17);
  }

  function locate() {
    setMsg('');
    if (!navigator.geolocation) return setMsg('Este aparelho não permite usar a localização. Toque no mapa para marcar.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        focus({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setMsg('Não consegui obter a localização. Permita o acesso ou toque no mapa para marcar.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function search() {
    setMsg('');
    if (addressQuery.trim().length < 5) return setMsg('Preencha rua, número e bairro para buscar no mapa.');
    setBusy(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(addressQuery)}`, { headers: { 'Accept-Language': 'pt-BR' } });
      const list = (await r.json()) as { lat: string; lon: string }[];
      if (!list.length) setMsg('Endereço não encontrado. Toque no mapa para marcar o ponto.');
      else focus({ lat: Number(list[0].lat), lng: Number(list[0].lon) });
    } catch {
      setMsg('Não foi possível buscar agora. Toque no mapa para marcar o ponto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <button type="button" className="btn-secondary min-h-[48px] text-sm" onClick={locate} disabled={busy}>
          <LocateFixed size={18} /> Usar minha localização
        </button>
        <button type="button" className="btn-secondary min-h-[48px] text-sm" onClick={search} disabled={busy}>
          <Search size={18} /> Buscar pelo endereço
        </button>
      </div>
      <div ref={el} className="h-[300px] w-full overflow-hidden rounded-2xl border border-line" role="application" aria-label="Mapa para marcar o local de entrega" />
      <p className="text-sm text-muted">{value ? 'Pino marcado. Arraste para ajustar.' : 'Toque no mapa para marcar o local exato da entrega.'}</p>
      {msg && <p className="rounded-xl bg-warnbg px-4 py-3 text-sm text-warn">{msg}</p>}
      {value && (
        <button type="button" className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-bad" onClick={() => onChange(null)}>
          <X size={16} /> Remover localização do mapa
        </button>
      )}
    </div>
  );
}
