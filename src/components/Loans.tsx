import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { Investment } from '../db/config';
import { calculateMaturityValue, calculateDaysToMaturity, calculateTotalReturn } from '../db/investmentServices';
import {
  getInvestments as getAllInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
} from '../db';

interface InvestmentFormData {
  name: string;
  type: Investment['type'];
  initialAmount: number;
  annualRate: number;
  startDate: Date;
  termMonths: number;
  compoundingFrequency: Investment['compoundingFrequency'];
  notes: string;
}

const initialFormData: InvestmentFormData = {
  name: '',
  type: 'fixed-deposit',
  initialAmount: 0,
  annualRate: 0,
  startDate: new Date(),
  termMonths: 12,
  compoundingFrequency: 'monthly',
  notes: ''
};

const investmentTypes = [
  { value: 'fixed-deposit', label: 'Depósito a Plazo Fijo' },
  { value: 'savings-account', label: 'Cuenta de Ahorros' },
  { value: 'government-bond', label: 'Bono del Estado' },
  { value: 'mutual-fund', label: 'Fondo Mutuo' },
  { value: 'other', label: 'Otro' }
];

const compoundingFrequencies = [
  { value: 'daily', label: 'Diario' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semi-annual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' }
];

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState<InvestmentFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvestments();
    const handler = () => loadInvestments();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      const updatedData = await getAllInvestments();
      setInvestments(updatedData);
    } catch (err) {
      setError('Error al cargar las inversiones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (investment?: Investment) => {
    if (investment) {
      setEditingInvestment(investment);
      setFormData({
        name: investment.name,
        type: investment.type,
        initialAmount: investment.initialAmount,
        annualRate: investment.annualRate,
        startDate: investment.startDate,
        termMonths: investment.termMonths,
        compoundingFrequency: investment.compoundingFrequency,
        notes: investment.notes || ''
      });
    } else {
      setEditingInvestment(null);
      setFormData(initialFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInvestment(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.name || formData.initialAmount <= 0 || formData.annualRate < 0 || !formData.startDate) {
        setError('Por favor, completa todos los campos requeridos');
        return;
      }

      const startDate = formData.startDate;
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + formData.termMonths);

      const investmentData: Omit<Investment, 'id'> = {
        name: formData.name,
        type: formData.type,
        initialAmount: formData.initialAmount,
        currentAmount: formData.initialAmount,
        annualRate: formData.annualRate,
        startDate,
        termMonths: formData.termMonths,
        maturityDate,
        compoundingFrequency: formData.compoundingFrequency,
        isActive: true,
        notes: formData.notes
      };

      if (editingInvestment) {
        await updateInvestment({ ...investmentData, id: editingInvestment.id! });
      } else {
        await addInvestment(investmentData);
      }

      await loadInvestments();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la inversión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta inversión?')) {
      try {
        await deleteInvestment(id);
        await loadInvestments();
      } catch (err) {
        setError('Error al eliminar la inversión');
        console.error(err);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };


  const getTypeLabel = (type: Investment['type']) => {
    return investmentTypes.find(t => t.value === type)?.label || type;
  };

  const getFrequencyLabel = (frequency: Investment['compoundingFrequency']) => {
    return compoundingFrequencies.find(f => f.value === frequency)?.label || frequency;
  };

  // Calcular totales
  const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentAmount, 0);
  const totalGains = totalCurrentValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Inversiones
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ mb: 2 }}
        >
          Nueva Inversión
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Resumen de inversiones */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Invertido</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {formatCurrency(totalInvested)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Valor Actual</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(totalCurrentValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalculateIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Ganancias</Typography>
              </Box>
              <Typography 
                variant="h4" 
                color={totalGains >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(totalGains)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Rendimiento</Typography>
              </Box>
              <Typography 
                variant="h4" 
                color={totalReturnPercentage >= 0 ? 'success.main' : 'error.main'}
              >
                {totalReturnPercentage.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de inversiones */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Inversión Inicial</TableCell>
              <TableCell align="right">Valor Actual</TableCell>
              <TableCell align="right">Tasa Anual</TableCell>
              <TableCell align="center">Fecha Inicio</TableCell>
              <TableCell align="center">Plazo</TableCell>
              <TableCell align="center">Días Restantes</TableCell>
              <TableCell align="right">Ganancia Esperada</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {investments.map((investment) => {
              const daysToMaturity = calculateDaysToMaturity(investment);
              const { totalReturn, returnPercentage } = calculateTotalReturn(investment);
              const maturityValue = calculateMaturityValue(investment);
              
              return (
                <TableRow key={investment.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {investment.name}
                      </Typography>
                      {investment.notes && (
                        <Typography variant="caption" color="text.secondary">
                          {investment.notes}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{getTypeLabel(investment.type)}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(investment.initialAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(investment.currentAmount)}
                  </TableCell>
                  <TableCell align="right">{investment.annualRate}%</TableCell>
                  <TableCell align="center">
                    {investment.startDate.toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell align="center">
                    {investment.termMonths} meses
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {getFrequencyLabel(investment.compoundingFrequency)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={daysToMaturity > 0 ? `${daysToMaturity} días` : 'Vencido'}
                      color={daysToMaturity > 30 ? 'success' : daysToMaturity > 0 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={`Valor al vencimiento: ${formatCurrency(maturityValue)}`}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(totalReturn)}
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          +{returnPercentage.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={investment.isActive ? 'Activa' : 'Inactiva'}
                      color={investment.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(investment)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(investment.id!)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {investments.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay inversiones registradas
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para agregar/editar inversión */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre de la Inversión"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Inversión</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo de Inversión"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Investment['type'] })}
                >
                  {investmentTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto Inicial"
                type="number"
                value={formData.initialAmount}
                onChange={(e) => setFormData({ ...formData, initialAmount: parseFloat(e.target.value) || 0 })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tasa Anual (%)"
                type="number"
                value={formData.annualRate}
                onChange={(e) => setFormData({ ...formData, annualRate: parseFloat(e.target.value) || 0 })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Inicio"
                type="date"
                value={formData.startDate.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plazo (meses)"
                type="number"
                value={formData.termMonths}
                onChange={(e) => setFormData({ ...formData, termMonths: parseInt(e.target.value) || 12 })}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Frecuencia de Capitalización</InputLabel>
                <Select
                  value={formData.compoundingFrequency}
                  label="Frecuencia de Capitalización"
                  onChange={(e) => setFormData({ ...formData, compoundingFrequency: e.target.value as Investment['compoundingFrequency'] })}
                >
                  {compoundingFrequencies.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas (opcional)"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Guardando...' : editingInvestment ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}