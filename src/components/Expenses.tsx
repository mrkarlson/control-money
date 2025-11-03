import { useState, useEffect } from 'react';
import { Expense } from '../db/config';
import { Box } from '@mui/material';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import AnnualOverview from './AnnualOverview';

export default function Expenses() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsExpenseFormOpen(true);
  };

  const handleExpenseDeleted = () => {
    const event = new Event('expenseAdded');
    document.dispatchEvent(event);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  useEffect(() => {
    const handleBalanceUpdate = () => {
      handleExpenseDeleted(); // Reutilizamos esta función para actualizar los datos
    };

    document.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => {
      document.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

  return (
    <Box>
      <div className="mb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gastos</h1>
            <button
              onClick={() => {
              setSelectedExpense(null);
              setIsExpenseFormOpen(true);
            }}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
            >
              Añadir Gasto
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'monthly' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-0.5' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500'
              }`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'annual' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-0.5' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500'
              }`}
            >
              Vista Anual
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <>
          <ExpenseList
            currentMonth={currentMonth}
            onEditExpense={handleEditExpense}
            onExpenseDeleted={handleExpenseDeleted}
            onMonthChange={handleMonthChange}
          />

          <ExpenseForm
            open={isExpenseFormOpen}
            onClose={() => {
              setIsExpenseFormOpen(false);
              setSelectedExpense(null);
            }}
            onExpenseAdded={handleExpenseDeleted}
            expense={selectedExpense}
            selectedMonth={currentMonth}
          />
        </>
      ) : (
        <AnnualOverview />
      )}
    </Box>
  );
}