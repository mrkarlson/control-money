import { useSyncExternalStore } from 'react';
import { Balance } from '../db/config';
import { getCurrentBalance, updateBalance as persistBalance } from '../db';

/**
 * Store global mínimo para el balance.
 *
 * Evita que varios componentes (sidebar, hoja "Más", lista de gastos) mantengan
 * copias desincronizadas: todos leen de la misma fuente y se re-renderizan al
 * cambiar. Usa `useSyncExternalStore` para integrarse limpiamente con React.
 */

let balance: Balance | null = null;
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function ensureBalanceLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = getCurrentBalance()
      .then(current => {
        balance = current;
        loaded = true;
        emit();
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export async function refreshBalance(): Promise<void> {
  const current = await getCurrentBalance();
  balance = current;
  loaded = true;
  emit();
}

export async function setBalance(next: Balance): Promise<void> {
  // Actualización pesimista para respuesta inmediata en la UI
  balance = next;
  emit();
  try {
    await persistBalance(next);
    // Releer para sincronizar con el registro canónico persistido
    const persisted = await getCurrentBalance();
    if (persisted) {
      balance = persisted;
      emit();
    }
  } catch (error) {
    console.error('Error guardando el balance:', error);
    await refreshBalance();
  }
}

export async function adjustBalance(delta: number): Promise<void> {
  if (!balance) {
    await ensureBalanceLoaded();
  }
  if (!balance) return;
  const next: Balance = { ...balance, amount: balance.amount + delta, date: new Date() };
  await setBalance(next);
}

export function getBalanceSnapshot(): Balance | null {
  return balance;
}

export function useBalance(): Balance | null {
  return useSyncExternalStore(subscribe, getBalanceSnapshot, () => null);
}
