import { useState, useEffect } from 'react';
import { getCurrentBalance, updateBalance } from '../db/services';
import { Balance } from '../db/config';

export default function BalanceForm() {
  const [balance, setBalance] = useState<Balance | null>(null);

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
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Balance Global</h2>
        <button
          onClick={() => {
            const event = new CustomEvent('balanceUpdated');
            document.dispatchEvent(event);
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          title="Actualizar gastos"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="currentBalance" className="block text-sm font-medium text-gray-700 mb-1">
            Balance Actual
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
            <input
              id="currentBalance"
              type="number"
              value={balance?.amount || 0}
              onChange={(e) => handleBalanceUpdate({ amount: Number(e.target.value) })}
              className="pl-8 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-700 mb-1">
            Ingresos Mensuales
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
            <input
              id="monthlyIncome"
              type="number"
              value={balance?.monthlyIncome || 0}
              onChange={(e) => handleBalanceUpdate({ monthlyIncome: Number(e.target.value) })}
              className="pl-8 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}