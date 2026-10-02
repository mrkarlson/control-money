import { useState, useEffect, useRef, useCallback } from 'react';
import { Balance } from '../db/config';
import {
  useBalance,
  ensureBalanceLoaded,
  refreshBalance,
  setBalance as setBalanceStore,
  getBalanceSnapshot,
} from '../hooks/useBalanceStore';

const AMOUNT_VISIBLE_KEY = 'balance_amount_visible';
const INCOME_VISIBLE_KEY = 'balance_income_visible';
const SAVE_DELAY_MS = 800;

type Field = 'amount' | 'monthlyIncome';

const readVisibility = (key: string): boolean => {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
};

const toInputString = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return String(value);
};

const parseInput = (raw: string): number => {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function BalanceForm() {
  const storeBalance = useBalance();
  const [amountText, setAmountText] = useState('');
  const [incomeText, setIncomeText] = useState('');
  const [amountVisible, setAmountVisible] = useState(() => readVisibility(AMOUNT_VISIBLE_KEY));
  const [incomeVisible, setIncomeVisible] = useState(() => readVisibility(INCOME_VISIBLE_KEY));

  const focusedFieldRef = useRef<Field | null>(null);
  const amountTextRef = useRef('');
  const incomeTextRef = useRef('');
  const saveTimers = useRef<{ amount?: number; income?: number }>({});

  // Carga inicial del store compartido
  useEffect(() => {
    ensureBalanceLoaded();
    const handler = () => refreshBalance();
    window.addEventListener('dbTypeChanged', handler);
    return () => window.removeEventListener('dbTypeChanged', handler);
  }, []);

  // Sincroniza los inputs con el store, sin pisar una edición en curso
  useEffect(() => {
    const next = storeBalance || { amount: 0, monthlyIncome: 0, date: new Date() };

    const isEditingAmount =
      focusedFieldRef.current === 'amount' &&
      (Boolean(saveTimers.current.amount) || parseInput(amountTextRef.current) !== next.amount);
    const isEditingIncome =
      focusedFieldRef.current === 'monthlyIncome' &&
      (Boolean(saveTimers.current.income) || parseInput(incomeTextRef.current) !== next.monthlyIncome);

    if (!isEditingAmount) {
      const text = toInputString(next.amount);
      amountTextRef.current = text;
      setAmountText(text);
    }
    if (!isEditingIncome) {
      const text = toInputString(next.monthlyIncome);
      incomeTextRef.current = text;
      setIncomeText(text);
    }
  }, [storeBalance]);

  // Persistir el estado de visibilidad (el ojito) entre sesiones y montajes
  useEffect(() => {
    try {
      localStorage.setItem(AMOUNT_VISIBLE_KEY, String(amountVisible));
    } catch {
      /* ignore */
    }
  }, [amountVisible]);

  useEffect(() => {
    try {
      localStorage.setItem(INCOME_VISIBLE_KEY, String(incomeVisible));
    } catch {
      /* ignore */
    }
  }, [incomeVisible]);

  const commit = useCallback(async (field: Field, raw: string) => {
    const current = getBalanceSnapshot();
    if (!current) return;

    const parsed = parseInput(raw);
    const value = Number.isFinite(parsed) ? parsed : 0;

    if (current[field] === value) return;

    const updated: Balance = { ...current, [field]: value, date: new Date() };
    await setBalanceStore(updated);
  }, []);

  const scheduleCommit = useCallback((field: Field, raw: string) => {
    const key = field === 'amount' ? 'amount' : 'income';
    if (saveTimers.current[key]) {
      window.clearTimeout(saveTimers.current[key]);
    }
    saveTimers.current[key] = window.setTimeout(() => {
      saveTimers.current[key] = undefined;
      commit(field, raw);
    }, SAVE_DELAY_MS);
  }, [commit]);

  const flushCommit = useCallback((field: Field, raw: string) => {
    const key = field === 'amount' ? 'amount' : 'income';
    if (saveTimers.current[key]) {
      window.clearTimeout(saveTimers.current[key]);
      saveTimers.current[key] = undefined;
    }
    commit(field, raw);
  }, [commit]);

  const handleChange = (field: Field, raw: string) => {
    // Permitir vacío mientras se escribe y solo dígitos (opcionalmente negativos) con un separador decimal
    if (!/^-?\d*[.,]?\d*$/.test(raw)) return;

    if (field === 'amount') {
      amountTextRef.current = raw;
      setAmountText(raw);
    } else {
      incomeTextRef.current = raw;
      setIncomeText(raw);
    }
    scheduleCommit(field, raw);
  };

  const handleBlur = (field: Field, raw: string) => {
    focusedFieldRef.current = null;
    flushCommit(field, raw);
    if (raw.trim() === '') {
      const fallback = '0';
      if (field === 'amount') {
        amountTextRef.current = fallback;
        setAmountText(fallback);
      } else {
        incomeTextRef.current = fallback;
        setIncomeText(fallback);
      }
    }
  };

  // Al desmontar (p. ej. cerrar el panel móvil), guardar cualquier cambio pendiente
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      if (timers.amount) {
        window.clearTimeout(timers.amount);
        timers.amount = undefined;
        commit('amount', amountTextRef.current);
      }
      if (timers.income) {
        window.clearTimeout(timers.income);
        timers.income = undefined;
        commit('monthlyIncome', incomeTextRef.current);
      }
    };
  }, [commit]);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Balance Global</h2>
        <button
          onClick={() => refreshBalance()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          title="Actualizar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="currentBalance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Balance Actual
            </label>
            <button
              onClick={() => setAmountVisible(v => !v)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              aria-label={amountVisible ? 'Ocultar balance actual' : 'Mostrar balance actual'}
              title={amountVisible ? 'Ocultar balance actual' : 'Mostrar balance actual'}
            >
              {amountVisible ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-7-11-7a19.817 19.817 0 015.06-5.954m3.14-1.67A10.05 10.05 0 0112 5c7 0 11 7 11 7a19.823 19.823 0 01-4.21 4.653M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
            <input
              id="currentBalance"
              type={amountVisible ? 'text' : 'password'}
              inputMode="decimal"
              autoComplete={amountVisible ? 'off' : 'new-password'}
              placeholder="0"
              value={amountText}
              onFocus={() => { focusedFieldRef.current = 'amount'; }}
              onChange={(e) => handleChange('amount', e.target.value)}
              onBlur={(e) => handleBlur('amount', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className={`pl-8 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${amountVisible ? '' : 'select-none'}`}
              readOnly={!amountVisible}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="monthlyIncome" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ingresos Mensuales
            </label>
            <button
              onClick={() => setIncomeVisible(v => !v)}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              aria-label={incomeVisible ? 'Ocultar ingreso mensual' : 'Mostrar ingreso mensual'}
              title={incomeVisible ? 'Ocultar ingreso mensual' : 'Mostrar ingreso mensual'}
            >
              {incomeVisible ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-7-11-7a19.817 19.817 0 015.06-5.954m3.14-1.67A10.05 10.05 0 0112 5c7 0 11 7 11 7a19.823 19.823 0 01-4.21 4.653M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
            <input
              id="monthlyIncome"
              type={incomeVisible ? 'text' : 'password'}
              inputMode="decimal"
              autoComplete={incomeVisible ? 'off' : 'new-password'}
              placeholder="0"
              value={incomeText}
              onFocus={() => { focusedFieldRef.current = 'monthlyIncome'; }}
              onChange={(e) => handleChange('monthlyIncome', e.target.value)}
              onBlur={(e) => handleBlur('monthlyIncome', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className={`pl-8 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${incomeVisible ? '' : 'select-none'}`}
              readOnly={!incomeVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
