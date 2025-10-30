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
            <h1 className="text-2xl font-semibold text-gray-800">Gastos</h1>
            <button
              onClick={() => {
              setSelectedExpense(null);
              setIsExpenseFormOpen(true);
            }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Añadir Gasto
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'annual' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
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