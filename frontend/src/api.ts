import { useCallback, useEffect, useState } from 'react';

export const API_BASE = `${import.meta.env.BASE_URL}api`;
/** Prefixo do localStorage pelo caminho do app (/<slug>/): apps no mesmo domínio não se misturam. */
export const STORAGE_NS = import.meta.env.BASE_URL.replace(/\//g, '') || 'app';
const TOKEN_KEY = `${STORAGE_NS}:token`;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Erro ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

/** Carrega um recurso da API; `reload` busca de novo sem piscar a tela. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

export const productPhoto = (p: { id: string; photoVersion: number }) => (p.photoVersion ? `${API_BASE}/products/${p.id}/photo?v=${p.photoVersion}` : undefined);

// ---------- Tipos ----------
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  createdAt: string;
}

export interface Settings {
  storeName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  about: string;
  instagram: string;
  pixKey: string;
  logoVersion: number;
  acceptingOrders: boolean;
  minOrderCents: number;
  leadDays: number;
  maxDays: number;
  cutoffTime: string;
  windows: string[];
  deliveryDays: boolean[];
}

export interface Config extends Settings {
  deliveryDates: { day: string; windows: string[] }[];
  today: string;
  now: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  unit: string;
  priceCents: number;
  stock: number | null;
  active: boolean;
  featured: boolean;
  photoVersion: number;
  sortOrder?: number;
}

export interface Zone {
  id: string;
  name: string;
  feeCents: number;
  active?: boolean;
}

export interface Catalog {
  categories: Category[];
  products: Product[];
  zones: Zone[];
}

export type OrderStatus = 'received' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'pix' | 'cash' | 'card';

export interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  unit: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  street: string;
  houseNumber: string;
  complement: string;
  district: string;
  reference: string;
  zoneName: string;
  deliveryDate: string;
  deliveryWindow: string;
  subtotalCents: number;
  feeCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  changeForCents: number;
  paid: boolean;
  status: OrderStatus;
  notes: string;
  cancelReason: string;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderItem[];
}
