import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { Expense } from '../db/config';
import { addExpense, updateExpense } from '../db/services';

const categories = [
  'Préstamos',
  'Gastos Fijos',
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Otros'
];

const frequencies = [
  { value: 'one-time', label: 'Una vez' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'bi-monthly', label: 'Cada 2 meses' },
  { value: 'quarterly', label: 'Cada 3 meses' },
  { value: 'annual', label: 'Anual' }
];

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  expense?: Expense | null;
  selectedMonth: Date;
}

export default function ExpenseForm({ open, onClose, onExpenseAdded, expense: expenseProp, selectedMonth }: ExpenseFormProps) {
  const [expense, setExpense] = useState<Omit<Expense, 'id'>>(() => ({
    amount: 0,
    category: '',
    description: '',
    date: selectedMonth,
    frequency: 'one-time',
    isPaid: false,
    paymentHistory: []
  }));

  useEffect(() => {
    if (expenseProp) {
      const { id, ...expenseData } = expenseProp;
      setExpense({
        ...expenseData,
        date: new Date(expenseData.date),
        nextPaymentDate: expenseData.nextPaymentDate ? new Date(expenseData.nextPaymentDate) : undefined,
        paymentHistory: expenseData.paymentHistory || []
      });
    } else {
      setExpense({
        amount: 0,
        category: '',
        description: '',
        date: selectedMonth,
        frequency: 'one-time',
        isPaid: false,
        paymentHistory: []
      });
    }
  }, [expenseProp, selectedMonth]);


  const handleAmountChange = async (newAmount: number) => {
    // Actualizar el estado local primero
    setExpense(prev => ({ ...prev, amount: newAmount }));

    // Si no es un gasto recurrente o no estamos editando, no actualizamos el historial
    if (!expenseProp?.id || expense.frequency !== 'monthly') return;

    try {
      const updatedPaymentHistory = [...(expense.paymentHistory || [])];
      
      const index = updatedPaymentHistory.findIndex(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === selectedMonth.getMonth() && 
               recordDate.getFullYear() === selectedMonth.getFullYear();
      });

      if (index >= 0) {
        // Actualizar solo el monto del mes seleccionado
        updatedPaymentHistory[index] = {
          ...updatedPaymentHistory[index],
          amount: newAmount
        };
      } else {
        // Agregar nuevo registro para el mes seleccionado
        updatedPaymentHistory.push({
          date: selectedMonth,
          isPaid: false,
          amount: newAmount
        });
      }

      // Mantener el monto original en el objeto principal para futuros meses
      const updatedExpense = {
        ...expense,
        paymentHistory: updatedPaymentHistory
      };
      await updateExpense({ ...updatedExpense, id: expenseProp.id });
    } catch (error) {
      console.error('Error updating expense amount:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentDate = selectedMonth;
      if (expenseProp?.id) {
        // Si es un gasto recurrente, actualizar el registro de pago para el mes actual
        if (expense.frequency !== 'one-time') {
          const paymentRecord = expense.paymentHistory?.find(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentDate.getMonth() && 
                   recordDate.getFullYear() === currentDate.getFullYear();
          });

          if (paymentRecord) {
            // Actualizar solo el monto del mes actual
            const updatedPaymentHistory = expense.paymentHistory?.map(record => {
              if (record === paymentRecord) {
                return { ...record, amount: expense.amount };
              }
              return record;
            });
            expense.paymentHistory = updatedPaymentHistory;
          } else {
            // Agregar nuevo registro para el mes actual
            expense.paymentHistory = [
              ...(expense.paymentHistory || []),
              {
                date: currentDate,
                isPaid: false,
                amount: expense.amount
              }
            ];
          }
        }
        await updateExpense({ ...expense, id: expenseProp.id });
      } else {
        // Para nuevos gastos recurrentes, inicializar el historial de pagos para los próximos 12 meses
        if (expense.frequency !== 'one-time') {
          const nextTwelveMonths = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(currentDate);
            date.setMonth(currentDate.getMonth() + i);
            return {
              date,
              isPaid: false,
              amount: expense.amount // Cada mes se inicializa con el monto original
            };
          });
          expense.paymentHistory = nextTwelveMonths;
        }
        await addExpense(expense);
      }
      // Limpiar el formulario después de guardar
      setExpense({
        amount: 0,
        category: '',
        description: '',
        date: selectedMonth,
        frequency: 'one-time',
        isPaid: false,
        paymentHistory: []
      });
      onExpenseAdded();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{expenseProp ? 'Editar Gasto' : 'Añadir Gasto'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Cantidad"
              type="number"
              value={expense.amount}
              onChange={(e) => {
                const newAmount = Number(e.target.value);
                setExpense({ ...expense, amount: newAmount });
                handleAmountChange(newAmount);
              }}
              required
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={expense.category}
                label="Categoría"
                onChange={(e) => setExpense({ ...expense, category: e.target.value })}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Descripción"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
              required
              fullWidth
              multiline
              rows={2}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label={expense.frequency === 'one-time' ? "Fecha del gasto" : "Fecha de inicio"}
                value={expense.date}
                onChange={(newDate) => newDate && setExpense({ ...expense, date: newDate })}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                    helperText: expense.frequency === 'one-time' 
                      ? "Selecciona la fecha en que se realizó el gasto"
                      : "Selecciona la fecha de inicio para gastos recurrentes"
                  }
                }}
              />
            </LocalizationProvider>

            <FormControl fullWidth required>
              <InputLabel>Frecuencia</InputLabel>
              <Select
                value={expense.frequency}
                label="Frecuencia"
                onChange={(e) => setExpense({
                  ...expense,
                  frequency: e.target.value as Expense['frequency']
                })}
              >
                {frequencies.map((freq) => (
                  <MenuItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(expense.category === 'Préstamos' && expense.frequency !== 'one-time') && (
              <TextField
                label="Duración (meses)"
                type="number"
                value={expense.duration || ''}
                onChange={(e) => setExpense({ ...expense, duration: Number(e.target.value) })}
                fullWidth
                required
                inputProps={{ min: 1 }}
                helperText="Número de meses durante los que se realizará el pago"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" color="primary">
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}