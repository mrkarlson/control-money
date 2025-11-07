import { useState, useEffect } from 'react';
import { Expense } from '../db/config';
import { Box, Fab, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">Gastos</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'monthly' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:-translate-y-0.5' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500'
              }`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
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

          {/* Botón flotante para añadir gasto (solo en vista mensual) */}
          <Tooltip title="Añadir gasto" placement="left">
            <Fab
              aria-label="Añadir gasto"
              size="small"
              onClick={() => {
                setSelectedExpense(null);
                setIsExpenseFormOpen(true);
              }}
              sx={{
                position: 'fixed',
                right: 'calc(env(safe-area-inset-right) + 16px)',
                bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) - 16px)',
                zIndex: 1000,
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                background: 'linear-gradient(90deg, #10B981, #059669)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                border: '1px solid rgba(255,255,255,0.25)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #059669, #047857)',
                  boxShadow: '0 10px 24px rgba(5, 150, 105, 0.45)'
                }
              }}
            >
              <AddIcon fontSize="small" />
            </Fab>
          </Tooltip>

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