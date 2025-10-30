import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  IconButton,
  Chip,
  Stack,
  Checkbox,
  Button,
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Expense } from '../db/config';
import { getExpensesByMonth, deleteExpense, getCurrentBalance, updateExpense } from '../db/services';

interface ExpenseListProps {
  currentMonth: Date;
  onEditExpense: (expense: Expense) => void;
  onExpenseDeleted: () => void;
  onMonthChange: (month: Date) => void;
}

export default function ExpenseList({ currentMonth, onEditExpense, onExpenseDeleted, onMonthChange }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'description', direction: 'asc' });
  const [balance, setBalance] = useState<{ amount: number; monthlyIncome: number } | null>(null);

  const calculateBalances = (currentBalance: { amount: number; monthlyIncome: number } | null) => {
    if (!currentBalance) return { realBalance: 0, projectedBalance: 0 };

    const pendingExpenses = expenses.reduce((sum, expense) => {
      const currentMonthPayment = expense.paymentHistory?.find(record => 
        isSameMonth(new Date(record.date), currentMonth)
      );
      return !currentMonthPayment?.isPaid ? sum + expense.amount : sum;
    }, 0);

    const totalMonthExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Balance Real = Balance Actual - Gastos Pendientes del mes actual
    const realBalance = currentBalance.amount - (isSameMonth(currentMonth, new Date()) ? pendingExpenses : 0);
    
    // Balance Proyectado = Ingresos Mensuales - Total Gastos del mes
    const projectedBalance = isSameMonth(currentMonth, new Date()) ? realBalance : currentBalance.monthlyIncome - totalMonthExpenses;

    return { realBalance, projectedBalance };
  };

  const loadBalance = useCallback(async () => {
    try {
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const monthExpenses = await getExpensesByMonth(currentMonth);
      setExpenses(monthExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }, [currentMonth]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      try {
        await deleteExpense(id);
        await loadExpenses();
        onExpenseDeleted();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const getFrequencyLabel = (frequency: Expense['frequency']) => {
    const labels = {
      'one-time': 'Una vez',
      'monthly': 'Mensual',
      'bi-monthly': 'Cada 2 meses',
      'quarterly': 'Cada 3 meses',
      'annual': 'Anual'
    };
    return labels[frequency];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handlePaymentToggle = async (expense: Expense) => {
    if (!expense.id) return;
  
    try {
      // Find if there's an existing payment record for the current month
      const existingPaymentForMonth = expense.paymentHistory?.find(record => 
        isSameMonth(new Date(record.date), currentMonth)
      );
  
      // Create updated payment history
      const updatedPaymentHistory = [...(expense.paymentHistory || [])];
      
      const newPaymentStatus = existingPaymentForMonth ? !existingPaymentForMonth.isPaid : true;
      
      if (existingPaymentForMonth) {
        // Update existing payment record for this month
        const index = updatedPaymentHistory.findIndex(record => 
          isSameMonth(new Date(record.date), currentMonth)
        );
        updatedPaymentHistory[index] = {
          date: currentMonth,
          isPaid: newPaymentStatus,
          amount: existingPaymentForMonth.amount || expense.amount
        };
      } else {
        // Add new payment record for this month
        updatedPaymentHistory.push({
          date: currentMonth,
          isPaid: newPaymentStatus,
          amount: expense.amount
        });
      }
  
      const updatedExpense = {
        ...expense,
        isPaid: newPaymentStatus,
        paymentHistory: updatedPaymentHistory
      };
      await updateExpense(updatedExpense);
      await loadExpenses();
    } catch (error) {
      console.error('Error updating expense payment status:', error);
    }
  };



  useEffect(() => {
    const updateData = async () => {
      await loadExpenses();
      await loadBalance();
    };
    updateData();

    const handleExpenseChange = () => {
      updateData();
    };

    document.addEventListener('expenseAdded', handleExpenseChange);
    return () => {
      document.removeEventListener('expenseAdded', handleExpenseChange);
    };
  }, [currentMonth, loadExpenses, loadBalance]);

  return (
    <Box sx={{ mt: 2 }} data-testid="expense-list">
      <Box sx={{ mb: 1, width: '100%' }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          mb: 1,
          display: 'flex',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          gap: '4px',
          padding: '2px 4px',
          '&::-webkit-scrollbar': {
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
            '&:hover': {
              background: '#555'
            }
          },
          '& button': {
            minWidth: '120px',
            padding: '8px 12px'
          }
        }}>
          {eachMonthOfInterval({
            start: new Date(new Date().getFullYear() - 1, 0, 1), // Enero del año anterior
            end: new Date(new Date().getFullYear() + 1, 11, 31) // Diciembre del año siguiente
          }).map((month, index) => {
            const isCurrentYear = month.getFullYear() === new Date().getFullYear();
            return (
              <Button
                key={month.toString()}
                onClick={() => onMonthChange(month)}
                ref={isSameMonth(month, currentMonth) ? (node) => {
                  if (node) {
                    setTimeout(() => {
                      const parent = node.parentElement;
                      if (parent) {
                        const scrollLeft = node.offsetLeft - (parent.offsetWidth / 2) + (node.offsetWidth / 2);
                        parent.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                      }
                    }, 100);
                  }
                } : undefined}
                sx={{
                  px: 3,
                  py: 2,
                  border: '1px solid',
                  borderColor: isSameMonth(month, currentMonth) ? 'primary.main' : 'divider',
                  borderRadius: '8px 8px 0 0',
                  color: isSameMonth(month, currentMonth) ? 'primary.main' : 'text.secondary',
                  backgroundColor: isCurrentYear 
                    ? isSameMonth(month, currentMonth) 
                      ? 'rgba(25, 118, 210, 0.2)' 
                      : 'rgba(25, 118, 210, 0.08)'
                    : isSameMonth(month, currentMonth) 
                      ? 'rgba(25, 118, 210, 0.12)' 
                      : 'transparent',
                  fontSize: '0.875rem',
                  fontWeight: isSameMonth(month, currentMonth) ? 600 : 400,
                  boxShadow: isSameMonth(month, currentMonth) ? '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)' : 'none',
                  '&:hover': {
                    backgroundColor: isCurrentYear 
                      ? 'rgba(25, 118, 210, 0.15)'
                      : 'rgba(25, 118, 210, 0.08)',
                    borderColor: 'primary.main'
                  }
                }}
              >
                {format(month, 'MMMM', { locale: es })}
              </Button>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            {format(currentMonth, 'yyyy')}
          </Typography>
          <Typography variant="subtitle1">
            Total Gastos: {formatCurrency(expenses.reduce((sum, expense) => sum + expense.amount, 0))}
          </Typography>
          <Typography variant="subtitle1" color="success.main">
            Pagados: {formatCurrency(expenses.reduce((sum, expense) => {
              const currentMonthPayment = expense.paymentHistory?.find(record => 
                isSameMonth(new Date(record.date), currentMonth)
              );
              return currentMonthPayment?.isPaid ? sum + expense.amount : sum;
            }, 0))}
          </Typography>
          <Typography variant="subtitle1" color="error.main">
            Pendientes: {formatCurrency(expenses.reduce((sum, expense) => {
              const currentMonthPayment = expense.paymentHistory?.find(record => 
                isSameMonth(new Date(record.date), currentMonth)
              );
              return !currentMonthPayment?.isPaid ? sum + expense.amount : sum;
            }, 0))}
          </Typography>
          {balance && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography 
                variant="subtitle1" 
                sx={{
                  color: calculateBalances(balance).realBalance >= 0 ? "success.main" : "error.main",
                  fontWeight: 'bold'
                }}
              >
                Balance Real: {formatCurrency(calculateBalances(balance).realBalance)}
              </Typography>
              <Typography 
                variant="subtitle1" 
                sx={{
                  color: calculateBalances(balance).projectedBalance >= 0 ? "success.main" : "error.main",
                  fontWeight: 'bold'
                }}
              >
                Balance Proyectado: {formatCurrency(calculateBalances(balance).projectedBalance)}
              </Typography>
            </Box>
          )}
          <Typography variant="subtitle1">
            Total Filtrado: {formatCurrency(
              expenses
                .filter(expense => {
                  const matchesCategory = selectedCategory === null || expense.category === selectedCategory;
                  const matchesSearch = searchText === '' || 
                    expense.description.toLowerCase().includes(searchText.toLowerCase());
                  return matchesCategory && matchesSearch;
                })
                .reduce((sum, expense) => sum + expense.amount, 0)
            )}
          </Typography>
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom>
        Gastos de {format(currentMonth, 'MMMM yyyy', { locale: es })}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Buscar por descripción"
          variant="outlined"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip
          label="Todas"
          onClick={() => setSelectedCategory(null)}
          color={selectedCategory === null ? 'primary' : 'default'}
        />
        {Array.from(new Set(expenses.map(e => e.category))).map(category => (
          <Chip
            key={category}
            label={category}
            onClick={() => setSelectedCategory(category)}
            color={selectedCategory === category ? 'primary' : 'default'}
          />
        ))}
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ 
          '& .MuiTableCell-root': { 
            padding: '12px',
            border: '1px solid rgba(224, 224, 224, 0.3)',
            boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          },
          '& .MuiTableHead-root': {
            '& .MuiTableCell-root': {
              backgroundColor: 'rgba(245, 245, 245, 0.95)',
              fontWeight: '600',
              borderBottom: '2px solid rgba(224, 224, 224, 0.6)',
              backdropFilter: 'blur(4px)',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }
          },
          '& .MuiTableRow-root:hover': {
            '& .MuiTableCell-root': {
              backgroundColor: 'rgba(245, 245, 245, 0.6)'
            }
          }
        }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              <TableCell 
                sx={{ 
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  '&::after': {
                    content: '""',
                    display: 'inline-block',
                    width: '0.5em',
                    height: '0.5em',
                    marginLeft: '0.5em',
                    borderLeft: '0.3em solid transparent',
                    borderRight: '0.3em solid transparent',
                    borderTop: sortConfig.key === 'description' ? 
                      (sortConfig.direction === 'asc' ? '0.3em solid currentColor' : 'none') : 
                      'none',
                    borderBottom: sortConfig.key === 'description' && sortConfig.direction === 'desc' ? 
                      '0.3em solid currentColor' : 
                      'none'
                  }
                }}
                onClick={() => setSortConfig({
                  key: 'description',
                  direction: sortConfig.key === 'description' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                })}
              >
                Descripción
              </TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell 
                onClick={() => setSortConfig({
                  key: 'date',
                  direction: sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                })}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  '&::after': {
                    content: '""',
                    display: 'inline-block',
                    width: '0.5em',
                    height: '0.5em',
                    marginLeft: '0.5em',
                    borderLeft: '0.3em solid transparent',
                    borderRight: '0.3em solid transparent',
                    borderTop: sortConfig.key === 'date' ? 
                      (sortConfig.direction === 'asc' ? '0.3em solid currentColor' : 'none') : 
                      'none',
                    borderBottom: sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 
                      '0.3em solid currentColor' : 
                      'none'
                  }
                }}
              >
                Fecha
              </TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell 
                onClick={() => setSortConfig({
                  key: 'status',
                  direction: sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                })}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                  '&::after': {
                    content: '""',
                    display: 'inline-block',
                    width: '0.5em',
                    height: '0.5em',
                    marginLeft: '0.5em',
                    borderLeft: '0.3em solid transparent',
                    borderRight: '0.3em solid transparent',
                    borderTop: sortConfig.key === 'status' ? 
                      (sortConfig.direction === 'asc' ? '0.3em solid currentColor' : 'none') : 
                      'none',
                    borderBottom: sortConfig.key === 'status' && sortConfig.direction === 'desc' ? 
                      '0.3em solid currentColor' : 
                      'none'
                  }
                }}
              >
                Estado
              </TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses
              .filter(expense => {
                const matchesCategory = selectedCategory === null || expense.category === selectedCategory;
                const matchesSearch = searchText === '' || 
                  expense.description.toLowerCase().includes(searchText.toLowerCase());
                return matchesCategory && matchesSearch;
              })
              .sort((a, b) => {
                const currentMonthPaymentA = a.paymentHistory?.find(record => 
                  isSameMonth(new Date(record.date), currentMonth)
                );
                const currentMonthPaymentB = b.paymentHistory?.find(record => 
                  isSameMonth(new Date(record.date), currentMonth)
                );
                const isPaidA = currentMonthPaymentA?.isPaid || false;
                const isPaidB = currentMonthPaymentB?.isPaid || false;

                switch (sortConfig.key) {
                  case 'description':
                    return sortConfig.direction === 'asc' 
                      ? a.description.localeCompare(b.description)
                      : b.description.localeCompare(a.description);
                  case 'date':
                    return sortConfig.direction === 'asc'
                      ? new Date(a.date).getTime() - new Date(b.date).getTime()
                      : new Date(b.date).getTime() - new Date(a.date).getTime();
                  case 'status':
                    if (isPaidA === isPaidB) return 0;
                    if (sortConfig.direction === 'asc') {
                      return isPaidA ? 1 : -1;
                    } else {
                      return isPaidA ? -1 : 1;
                    }
                  default:
                    return 0;
                }
              })
              .map((expense) => {
                // Check payment status for current month
                const currentMonthPayment = expense.paymentHistory?.find(record => 
                  isSameMonth(new Date(record.date), currentMonth)
                );
                const isPaidInCurrentMonth = currentMonthPayment?.isPaid || false;

                return (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell align="right">
                      <Box
                        onClick={(e) => {
                          const input = document.createElement('input');
                          input.type = 'number';
                          input.value = expense.amount.toString();
                          input.style.width = '100px';
                          input.style.padding = '4px';
                          input.style.border = '1px solid #ccc';
                          input.style.borderRadius = '4px';
                          
                          const cell = e.currentTarget;
                          cell.innerHTML = '';
                          cell.appendChild(input);
                          input.focus();
                          
                          const handleBlur = async () => {
                            const newAmount = parseFloat(input.value);
                            if (!isNaN(newAmount) && expense.id) {
                              try {
                                const updatedExpense = { ...expense, amount: newAmount };
                                const updatedPaymentHistory = [...(expense.paymentHistory || [])];
                                const index = updatedPaymentHistory.findIndex(record => 
                                  isSameMonth(new Date(record.date), currentMonth)
                                );
                                
                                if (index >= 0) {
                                  updatedPaymentHistory[index] = {
                                    ...updatedPaymentHistory[index],
                                    amount: newAmount
                                  };
                                } else {
                                  updatedPaymentHistory.push({
                                    date: currentMonth,
                                    isPaid: false,
                                    amount: newAmount
                                  });
                                }
                                
                                updatedExpense.paymentHistory = updatedPaymentHistory;
                                await updateExpense(updatedExpense);
                                await loadExpenses();
                                cell.innerHTML = formatCurrency(newAmount);
                              } catch (error) {
                                console.error('Error updating expense amount:', error);
                                cell.innerHTML = formatCurrency(expense.amount);
                              }
                            } else {
                              cell.innerHTML = formatCurrency(expense.amount);
                            }
                          };
                          
                          input.addEventListener('blur', handleBlur);
                          input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                              input.blur();
                            }
                          });
                        }}
                      >
                        {formatCurrency(expense.amount)}
                      </Box>
                    </TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{getFrequencyLabel(expense.frequency)}</TableCell>
                    <TableCell align="left">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'start', gap: 1 }}>
                        <Checkbox
                          checked={isPaidInCurrentMonth}
                          onChange={() => handlePaymentToggle(expense)}
                          size="small"
                        />
                        <Chip
                          size="small"
                          color={isPaidInCurrentMonth ? "success" : "error"}
                          label={isPaidInCurrentMonth ? "Pagado" : "Pendiente"}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="left">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => expense.id && onEditExpense(expense)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => expense.id && handleDelete(expense.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay gastos registrados para este mes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total Filtrado</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  expenses
                    .filter(expense => {
                      const matchesCategory = selectedCategory === null || expense.category === selectedCategory;
                      const matchesSearch = searchText === '' || 
                        expense.description.toLowerCase().includes(searchText.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .reduce((sum, expense) => sum + expense.amount, 0)
                )}
              </TableCell>
              <TableCell colSpan={5}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
  );
}