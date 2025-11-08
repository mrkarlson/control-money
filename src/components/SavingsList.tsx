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
  Checkbox,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  Chip,
  Tooltip,
  Fab
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { es } from 'date-fns/locale';
import { SavingsGoal } from '../db/config';
import { calculateEstimatedCompletion, calculateMonthlyContribution, calculateTimeRemaining } from '../db/savingsServices';
import { getSavingsGoals as getAllSavingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from '../db';
import { formatCurrency } from '../utils/formatters';
import { SAVINGS_CONSTANTS } from '../constants/savings';
import ProgressBar from './ProgressBar';
import DateDisplay from './DateDisplay';
import SavingsSummaryRow from './SavingsSummaryRow';
// import { useSavingsCalculations } from '../hooks/useSavingsCalculations'; // No se utiliza actualmente

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

  const isTabletOrMobile = useMediaQuery('(max-width:1024px)');
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    loadGoals();
    const handler = () => loadGoals();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
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
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: isTabletOrMobile ? 'sticky' : 'static',
          top: 0,
          zIndex: 10,
          backdropFilter: isTabletOrMobile ? 'blur(6px)' : 'none',
          backgroundColor: (theme) => isTabletOrMobile
            ? (theme.palette.mode === 'dark' ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.75)')
            : 'transparent',
          borderBottom: (theme) => isTabletOrMobile ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Objetivos de Ahorro</Typography>
        <Box />
      </Paper>
      {isMobile ? (
        // Vista de tarjetas en móvil, similar a Gastos/Inversiones
        <Box>
          {goals.map((goal) => (
            <Card key={goal.id} variant="outlined" sx={{ mb: 1 }}>
              <CardContent sx={{ pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{goal.name}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatCurrency(goal.currentAmount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {goal.description && <Chip size="small" label={goal.description} />}
                  <Chip size="small" label={`Objetivo: ${formatCurrency(goal.targetAmount)}`} />
                  <Chip size="small" label={`Aporte: ${formatCurrency(goal.monthlyContribution)}`} />
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Progreso</Typography>
                    <ProgressBar current={goal.currentAmount} target={goal.targetAmount} completed={goal.completed} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Restante</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">Inicio: <DateDisplay date={goal.startDate} /></Typography>
                  <Typography variant="caption">Objetivo: <DateDisplay date={goal.targetDate} /></Typography>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <IconButton size="small" onClick={() => handleOpenDialog(goal)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => goal.id && handleDelete(goal.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          ))}
          {goals.length === 0 && (
            <Paper sx={{ p: 2, textAlign: 'center' }}>No hay objetivos de ahorro</Paper>
          )}
        </Box>
      ) : (
        <TableContainer 
          component={Paper}
          sx={{ 
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(17, 24, 39, 0.94)'
              : theme.palette.background.paper,
            borderColor: (theme) => theme.palette.divider
          }}
        >
          <Table size="small" sx={{
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'transparent' : theme.palette.background.paper,
            '& .MuiTableCell-root': {
              padding: '12px',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              color: (theme) => theme.palette.text.primary
            },
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(55, 65, 81, 0.95)'
                  : 'rgba(245, 245, 245, 0.95)',
                fontWeight: '600',
                borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                backdropFilter: 'blur(4px)',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                color: (theme) => theme.palette.text.primary
              }
            },
            '& .MuiTableRow-root:hover': {
              '& .MuiTableCell-root': {
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(75, 85, 99, 0.6)'
                  : 'rgba(245, 245, 245, 0.6)'
              }
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Objetivo</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell align="right">Aporte Mensual</TableCell>
                <TableCell align="right">Restante</TableCell>
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
                  <TableCell align="right">
                    {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}
                  </TableCell>
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
      )}

      {/* Botón flotante verde (FAB) para añadir objetivo de ahorro */}
      <Tooltip title="Nuevo objetivo" placement="left">
        <Fab
          aria-label="Nuevo objetivo"
          size="small"
          onClick={() => handleOpenDialog()}
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