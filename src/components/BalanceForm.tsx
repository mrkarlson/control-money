import { useState, useEffect } from 'react';
import { getCurrentBalance, updateBalance } from '../db';
import { Balance } from '../db/config';

export default function BalanceForm() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [incomeVisible, setIncomeVisible] = useState(true);
  const [amountVisible, setAmountVisible] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance || {
        amount: 0,
        monthlyIncome: 0,
        date: new Date()
      });
    };
    loadBalance();

    const handler = () => loadBalance();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  const handleBalanceUpdate = async (updates: Partial<Balance>) => {
    if (!balance) return;

    const updatedBalance = {
      ...balance,
      ...updates,
      date: new Date()
    };

    await updateBalance(updatedBalance);
    setBalance(updatedBalance);
    
    // Emitir evento para actualizar el componente Expenses
    const event = new CustomEvent('balanceUpdated');
    document.dispatchEvent(event);
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Balance Global</h2>
        <button
          onClick={() => {
            const event = new CustomEvent('balanceUpdated');
            document.dispatchEvent(event);
          }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          title="Actualizar gastos"
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
              type={amountVisible ? 'number' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={amountVisible ? 'off' : 'new-password'}
              value={balance?.amount || 0}
              onChange={(e) => handleBalanceUpdate({ amount: Number(e.target.value) })}
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
                // ojo abierto
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                // ojo tachado
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
              id="monthlyIncome"
              type={incomeVisible ? 'number' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={incomeVisible ? 'off' : 'new-password'}
              value={balance?.monthlyIncome || 0}
              onChange={(e) => handleBalanceUpdate({ monthlyIncome: Number(e.target.value) })}
              className={`pl-8 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${incomeVisible ? '' : 'select-none'}`}
              readOnly={!incomeVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}