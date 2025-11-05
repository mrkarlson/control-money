import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { format, startOfYear, eachMonthOfInterval, endOfYear, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Expense } from '../db/config';
// Usar adaptador de repositorio para respetar la BD activa
import { getExpensesByMonth, getCurrentBalance } from '../db';

interface MonthlyExpenses {
  [key: string]: {
    total: number;
    totalPaid: number;
    byCategory: { [category: string]: number };
    byCategoryPaid: { [category: string]: number };
  };
}

export default function AnnualOverview() {
  const [currentYear] = useState(new Date());
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenses>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [balance, setBalance] = useState<{ amount: number; monthlyIncome: number } | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const months = eachMonthOfInterval({
    start: startOfYear(currentYear),
    end: endOfYear(currentYear)
  });

  // Definir loadExpenses antes de los useEffect para evitar ReferenceError en arrays de dependencias
  const loadExpenses = useCallback(async () => {
    try {
      const monthlyData: MonthlyExpenses = {};
      const allCategories = new Set<string>();
      let allExpenses: Expense[] = [];

      // Obtener gastos para cada mes y calcular totales
      for (const month of months) {
        const monthKey = format(month, 'yyyy-MM');
        const monthExpenses = await getExpensesByMonth(month);
        allExpenses = [...allExpenses, ...monthExpenses];

        // Extraer categorías y calcular totales
        monthlyData[monthKey] = {
          total: 0,
          totalPaid: 0,
          byCategory: {},
          byCategoryPaid: {}
        };

        monthExpenses.forEach(expense => {
          const { category, amount } = expense;
          allCategories.add(category);

          // Verificar si el gasto está pagado en este mes
          const paymentRecord = expense.paymentHistory?.find((record: any) => 
            format(new Date(record.date), 'yyyy-MM') === monthKey
          );
          const isPaid = paymentRecord?.isPaid || false;

          // Actualizar totales generales
          monthlyData[monthKey].total += amount;
          if (isPaid) monthlyData[monthKey].totalPaid += amount;

          // Actualizar totales por categoría
          monthlyData[monthKey].byCategory[category] = 
            (monthlyData[monthKey].byCategory[category] || 0) + amount;
          
          if (isPaid) {
            monthlyData[monthKey].byCategoryPaid[category] = 
              (monthlyData[monthKey].byCategoryPaid[category] || 0) + amount;
          }
        });
      }

      setCategories(Array.from(allCategories));
      setMonthlyExpenses(monthlyData);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }, [months]);

  useEffect(() => {
    // Inicializar todos los meses como seleccionados
    setSelectedMonths(months.map(month => format(month, 'yyyy-MM')));
  }, [currentYear]);

  useEffect(() => {
    const loadData = async () => {
      await loadExpenses();
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    };
    loadData();
  }, [currentYear]);

  // Escuchar cambios de BD para recargar datos
  useEffect(() => {
    const handler = async () => {
      await loadExpenses();
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    };
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, [loadExpenses]);

  

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const calculateFilteredTotal = (category?: string) => {
    return selectedMonths.reduce((acc, monthKey) => {
      if (category) {
        // Asegurar acceso seguro cuando monthlyExpenses aún no está cargado
        return acc + (monthlyExpenses[monthKey]?.byCategory?.[category] || 0);
      } else {
        return acc + Object.values(monthlyExpenses[monthKey]?.byCategory || {}).reduce((sum, amount) => sum + amount, 0);
      }
    }, 0);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Resumen Anual {format(currentYear, 'yyyy')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {months.map(month => {
            const monthKey = format(month, 'yyyy-MM');
            return (
              <Chip
                key={month.toString()}
                label={format(month, 'MMM', { locale: es })}
                onClick={() => handleMonthToggle(monthKey)}
                color={selectedMonths.includes(monthKey) ? 'primary' : 'default'}
                variant={selectedMonths.includes(monthKey) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      </Box>

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
              <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
              {months.map(month => (
                <TableCell key={month.toString()} align="right">
                  {format(month, 'MMM', { locale: es })}
                </TableCell>
              ))}
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category}>
                <TableCell component="th" scope="row">
                  {category}
                </TableCell>
                {months.map(month => {
                  const monthKey = format(month, 'yyyy-MM');
                  // Encadenamiento opcional seguro para evitar errores cuando monthlyExpenses aún no está cargado
                  const amount = selectedMonths.includes(monthKey)
                    ? (monthlyExpenses[monthKey]?.byCategory?.[category] || 0)
                    : 0;
                  return (
                    <TableCell 
                      key={month.toString()} 
                      align="right"
                      sx={{
                        opacity: selectedMonths.includes(monthKey) ? 1 : 0.3,
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      {formatCurrency(amount)}
                    </TableCell>
                  );
                })}
                <TableCell align="right">
                  {formatCurrency(calculateFilteredTotal(category))}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
              <TableCell>Total Mensual</TableCell>
              {months.map(month => {
                const monthKey = format(month, 'yyyy-MM');
                const total = selectedMonths.includes(monthKey) 
                  ? Object.values(monthlyExpenses[monthKey]?.byCategory || {}).reduce((sum, amount) => sum + amount, 0)
                  : 0;
                return (
                  <TableCell 
                    key={month.toString()} 
                    align="right"
                    sx={{
                      opacity: selectedMonths.includes(monthKey) ? 1 : 0.3,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {formatCurrency(total)}
                  </TableCell>
                );
              })}
              <TableCell align="right">
                {formatCurrency(calculateFilteredTotal())}
              </TableCell>
            </TableRow>
            <TableRow sx={{ '& td': { fontWeight: 'bold', color: 'info.main' } }}>
              <TableCell>Total Pagado</TableCell>
              {months.map(month => {
                const monthKey = format(month, 'yyyy-MM');
                const totalPaid = selectedMonths.includes(monthKey)
                  ? monthlyExpenses[monthKey]?.totalPaid || 0
                  : 0;
                return (
                  <TableCell 
                    key={month.toString()} 
                    align="right"
                    sx={{
                      opacity: selectedMonths.includes(monthKey) ? 1 : 0.3,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {formatCurrency(totalPaid)}
                  </TableCell>
                );
              })}
              <TableCell align="right">
                {formatCurrency(
                  selectedMonths.reduce((acc, monthKey) => 
                    acc + (monthlyExpenses[monthKey]?.totalPaid || 0), 0
                  )
                )}
              </TableCell>
            </TableRow>
            <TableRow sx={{ '& td': { fontWeight: 'bold', color: 'primary.main' } }}>
              <TableCell>Balance Real</TableCell>
              {months.map(month => {
                const monthKey = format(month, 'yyyy-MM');
                const monthExpenses = monthlyExpenses[monthKey] || { total: 0, totalPaid: 0 };
                let realBalance = 0;
                
                if (selectedMonths.includes(monthKey)) {
                  // Si el total mensual es igual al total pagado, el balance real es 0
                  if (monthExpenses.total === monthExpenses.totalPaid) {
                    realBalance = 0;
                  } else {
                    const pendingExpenses = monthExpenses.total - monthExpenses.totalPaid;
                    realBalance = balance?.amount ? 
                      (isSameMonth(month, new Date()) ? balance.amount - pendingExpenses : balance.monthlyIncome - pendingExpenses) : 
                      0;
                  }
                }
                
                return (
                  <TableCell 
                    key={month.toString()} 
                    align="right"
                    sx={{
                      opacity: selectedMonths.includes(monthKey) ? 1 : 0.3,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {formatCurrency(realBalance)}
                  </TableCell>
                );
              })}
              <TableCell align="right">
                {formatCurrency(
                  selectedMonths.reduce((acc, monthKey) => {
                    const month = months.find(m => format(m, 'yyyy-MM') === monthKey);
                    if (!month) return acc;
                    
                    const monthExpenses = monthlyExpenses[monthKey] || { total: 0, totalPaid: 0 };
                    let realBalance = 0;
                    
                    if (monthExpenses.total === monthExpenses.totalPaid) {
                      realBalance = 0;
                    } else {
                      const pendingExpenses = monthExpenses.total - monthExpenses.totalPaid;
                      realBalance = balance?.amount ? 
                        (isSameMonth(month, new Date()) ? balance.amount - pendingExpenses : balance.monthlyIncome - pendingExpenses) : 
                        0;
                    }
                    
                    return acc + realBalance;
                  }, 0)
                )}
              </TableCell>
            </TableRow>
            <TableRow sx={{ '& td': { fontWeight: 'bold', color: 'success.main' } }}>
              <TableCell>Balance Proyectado</TableCell>
              {months.map(month => {
                const monthKey = format(month, 'yyyy-MM');
                const monthExpenses = monthlyExpenses[monthKey] || { total: 0 };
                const projectedBalance = selectedMonths.includes(monthKey)
                  ? (balance?.monthlyIncome ? balance.monthlyIncome - monthExpenses.total : 0)
                  : 0;
                return (
                  <TableCell 
                    key={month.toString()} 
                    align="right"
                    sx={{
                      opacity: selectedMonths.includes(monthKey) ? 1 : 0.3,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {formatCurrency(projectedBalance)}
                  </TableCell>
                );
              })}
              <TableCell align="right">
                {formatCurrency(
                  selectedMonths.reduce((acc, monthKey) => {
                    const monthExpenses = monthlyExpenses[monthKey] || { total: 0 };
                    const projectedBalance = balance?.monthlyIncome ? balance.monthlyIncome - monthExpenses.total : 0;
                    return acc + projectedBalance;
                  }, 0)
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}