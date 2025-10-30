import { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { es } from 'date-fns/locale';
import { SavingsGoal } from '../db/config';
import {
  getAllSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  calculateEstimatedCompletion,
  calculateMonthlyContribution,
  calculateTimeRemaining
} from '../db/savingsServices';
import { formatCurrency } from '../utils/formatters';
import { SAVINGS_CONSTANTS } from '../constants/savings';
import ProgressBar from './ProgressBar';
import DateDisplay from './DateDisplay';
import SavingsSummaryRow from './SavingsSummaryRow';
import { useSavingsCalculations } from '../hooks/useSavingsCalculations';

export default function SavingsList() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState<Omit<SavingsGoal, 'id'> & { calculateByDate?: boolean }>(() => ({
    name: SAVINGS_CONSTANTS.FORM_DEFAULTS.NAME,
    description: SAVINGS_CONSTANTS.FORM_DEFAULTS.DESCRIPTION,
    targetAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.TARGET_AMOUNT,
    currentAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.CURRENT_AMOUNT,
    monthlyContribution: SAVINGS_CONSTANTS.FORM_DEFAULTS.MONTHLY_CONTRIBUTION,
    startDate: new Date(),
    completed: SAVINGS_CONSTANTS.FORM_DEFAULTS.COMPLETED,
    calculateByDate: false
  }));

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await getAllSavingsGoals();
      setGoals(savedGoals);
    } catch (error) {
      console.error(SAVINGS_CONSTANTS.MESSAGES.LOADING_ERROR, error);
    }
  };

  const handleOpenDialog = (goal?: SavingsGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setFormData({
        name: goal.name,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        monthlyContribution: goal.monthlyContribution,
        startDate: new Date(goal.startDate),
        targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
        completed: goal.completed,
        calculateByDate: false
      });
    } else {
      setSelectedGoal(null);
      setFormData({
        name: SAVINGS_CONSTANTS.FORM_DEFAULTS.NAME,
        description: SAVINGS_CONSTANTS.FORM_DEFAULTS.DESCRIPTION,
        targetAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.TARGET_AMOUNT,
        currentAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.CURRENT_AMOUNT,
        monthlyContribution: SAVINGS_CONSTANTS.FORM_DEFAULTS.MONTHLY_CONTRIBUTION,
        startDate: new Date(),
        completed: SAVINGS_CONSTANTS.FORM_DEFAULTS.COMPLETED,
        calculateByDate: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let updatedFormData = { ...formData };

      if (formData.calculateByDate && formData.targetDate) {
        // Calcular aporte mensual basado en fecha objetivo
        const calculatedContribution = calculateMonthlyContribution(
          formData.currentAmount,
          formData.targetAmount,
          formData.targetDate,
          formData.startDate
        );
        updatedFormData.monthlyContribution = calculatedContribution;
      } else {
        // Calcular fecha objetivo basado en aporte mensual
        const { estimatedDate } = calculateEstimatedCompletion(
          formData.currentAmount,
          formData.targetAmount,
          formData.monthlyContribution,
          formData.startDate
        );
        updatedFormData.targetDate = estimatedDate;
      }

      // Remover el campo calculateByDate antes de guardar
      const { calculateByDate, ...goalData } = updatedFormData;

      if (selectedGoal?.id) {
        await updateSavingsGoal({ ...goalData, id: selectedGoal.id });
      } else {
        await addSavingsGoal(goalData);
      }
      await loadGoals();
      handleCloseDialog();
    } catch (error) {
      console.error(SAVINGS_CONSTANTS.MESSAGES.SAVE_ERROR, error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(SAVINGS_CONSTANTS.MESSAGES.DELETE_CONFIRMATION)) {
      try {
        await deleteSavingsGoal(id);
        await loadGoals();
      } catch (error) {
        console.error(SAVINGS_CONSTANTS.MESSAGES.DELETE_ERROR, error);
      }
    }
  };



  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Objetivos de Ahorro</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Objetivo
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right">Objetivo</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell align="right">Aporte Mensual</TableCell>
              <TableCell>Progreso</TableCell>
              <TableCell>Fecha Actual</TableCell>
              <TableCell>Fecha Objetivo</TableCell>
              <TableCell>Tiempo Restante</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goals.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell>{goal.name}</TableCell>
                <TableCell>{goal.description}</TableCell>
                <TableCell align="right">{formatCurrency(goal.targetAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(goal.currentAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(goal.monthlyContribution)}</TableCell>
                <TableCell>
                  <ProgressBar
                    current={goal.currentAmount}
                    target={goal.targetAmount}
                    completed={goal.completed}
                  />
                </TableCell>
                <TableCell>
                  <DateDisplay date={goal.startDate} />
                </TableCell>
                <TableCell>
                  <DateDisplay date={goal.targetDate} />
                </TableCell>
                <TableCell>
                  {calculateTimeRemaining(
                    goal.currentAmount,
                    goal.targetAmount,
                    goal.monthlyContribution,
                    new Date(goal.startDate),
                    goal.targetDate ? new Date(goal.targetDate) : undefined
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenDialog(goal)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => goal.id && handleDelete(goal.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <SavingsSummaryRow goals={goals} />
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedGoal ? 'Editar Objetivo de Ahorro' : 'Nuevo Objetivo de Ahorro'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Nombre"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label="Descripción"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <TextField
                label="Cantidad Objetivo"
                type="number"
                fullWidth
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                required
              />
              <TextField
                label="Cantidad Actual"
                type="number"
                fullWidth
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: Number(e.target.value) })}
                required
              />
              <TextField
                label="Aporte Mensual"
                type="number"
                fullWidth
                value={formData.monthlyContribution}
                onChange={(e) => setFormData({
                  ...formData,
                  monthlyContribution: Number(e.target.value)
                })}
                required
                disabled={formData.calculateByDate}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.calculateByDate || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      calculateByDate: e.target.checked
                    })}
                  />
                }
                label="Calcular aporte mensual basado en fecha objetivo"
              />
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Actual"
                  value={formData.startDate}
                  onChange={(newDate) => setFormData({ ...formData, startDate: newDate || new Date() })}
                  format="dd/MM/yyyy"
                />
              </LocalizationProvider>
              {formData.calculateByDate && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha Objetivo"
                    value={formData.targetDate || null}
                    onChange={(newDate) => setFormData({ ...formData, targetDate: newDate || undefined })}
                    format="dd/MM/yyyy"
                    minDate={formData.startDate}
                  />
                </LocalizationProvider>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button type="submit" variant="contained">
              {selectedGoal ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}