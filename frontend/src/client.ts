import { useCallback, useEffect, useState } from 'react';
import { STORAGE_NS } from './api';

// O cliente não tem conta: celular, endereço e carrinho ficam salvos neste aparelho.
const PHONE_KEY = `${STORAGE_NS}:phone`;
const CUSTOMER_KEY = `${STORAGE_NS}:customer`;
const CART_KEY = `${STORAGE_NS}:cart`;

export const phoneDigits = (v: string) => {
  let d = v.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
};
export const isValidPhone = (v: string) => {
  const d = phoneDigits(v);
  return d.length === 10 || d.length === 11;
};

/** (11) 91234-5678 enquanto digita */
export function maskPhone(v: string) {
  let d = v.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular salvo no aparelho, com setter que persiste. */
export function useSavedPhone() {
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || '');
  const save = useCallback((p: string) => {
    const v = p ? maskPhone(phoneDigits(p)) : '';
    if (v) localStorage.setItem(PHONE_KEY, v);
    else localStorage.removeItem(PHONE_KEY);
    setPhone(v);
  }, []);
  return [phone, save] as const;
}

export interface SavedCustomer {
  customerName: string;
  phone: string;
  street: string;
  houseNumber: string;
  complement: string;
  reference: string;
  district: string;
}

export function getCustomer(): Partial<SavedCustomer> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveCustomer(c: SavedCustomer) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  localStorage.setItem(PHONE_KEY, maskPhone(phoneDigits(c.phone)));
}

// ---------- Carrinho ----------
export type Cart = Record<string, number>; // productId -> quantidade

const listeners = new Set<(c: Cart) => void>();

function readCart(): Cart {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    const out: Cart = {};
    for (const [k, n] of Object.entries(v || {})) if (typeof n === 'number' && n > 0) out[k] = Math.min(999, Math.floor(n));
    return out;
  } catch {
    return {};
  }
}

function writeCart(c: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(c));
  listeners.forEach((l) => l(c));
}

export function setQty(productId: string, qty: number) {
  const c = { ...readCart() };
  if (qty > 0) c[productId] = Math.min(999, qty);
  else delete c[productId];
  writeCart(c);
}

export const clearCart = () => writeCart({});

/**
 * "Pedir de novo": soma ao carrinho os itens de um pedido antigo. Itens sem produto (apagado) ficam de fora;
 * o carrinho já descarta o que não estiver mais no cardápio e o servidor confere o estoque no checkout.
 * Devolve quantos itens entraram.
 */
export function addItemsToCart(items: { productId: string | null; quantity: number }[]): number {
  const c = { ...readCart() };
  let added = 0;
  for (const i of items) {
    if (!i.productId || !(i.quantity > 0)) continue;
    c[i.productId] = Math.min(999, (c[i.productId] || 0) + Math.floor(i.quantity));
    added += 1;
  }
  if (added) writeCart(c);
  return added;
}

export function useCart() {
  const [cart, setCart] = useState<Cart>(readCart);
  useEffect(() => {
    listeners.add(setCart);
    const onStorage = (e: StorageEvent) => e.key === CART_KEY && setCart(readCart());
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(setCart);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return cart;
}

export const cartCount = (c: Cart) => Object.values(c).reduce((a, b) => a + b, 0);
