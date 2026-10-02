import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Investment, InvestmentContribution } from '../db/config';
import {
  addInvestmentContribution,
  getContributionsByInvestment,
  deleteInvestmentContribution,
  updateInvestment,
} from '../db';
import { projectInvestment } from '../utils/investmentProjection';
import { formatCurrency } from '../utils/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvestmentDetailDialogProps {
  open: boolean;
  investment: Investment | null;
  onClose: () => void;
  onChanged: () => void;
}

const YEAR_PRESETS = [1, 5, 10, 20, 30];

export default function InvestmentDetailDialog({ open, investment, onClose, onChanged }: InvestmentDetailDialogProps) {
  const [contributions, setContributions] = useState<InvestmentContribution[]>([]);
  const [years, setYears] = useState<number>(10);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentValueText, setCurrentValueText] = useState('');
  const [savingValue, setSavingValue] = useState(false);

  const loadContributions = async () => {
    if (!investment?.id) return;
    const list = await getContributionsByInvestment(investment.id);
    setContributions(list);
  };

  useEffect(() => {
    if (open && investment?.id) {
      loadContributions();
      setCurrentValueText(String(investment.currentAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, investment?.id]);

  const contributionsTotal = useMemo(
    () => contributions.reduce((sum, c) => sum + c.amount, 0),
    [contributions]
  );

  // Capital aportado (coste): capital inicial + aportaciones.
  const contributedCapital = (investment?.initialAmount || 0) + contributionsTotal;

  const currentValue = useMemo(() => {
    const parsed = Number(currentValueText.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [currentValueText]);

  const gain = currentValue - contributedCapital;
  const gainPercentage = contributedCapital > 0 ? (gain / contributedCapital) * 100 : 0;

  const monthlyContribution = investment?.monthlyContribution || 0;

  const projection = useMemo(() => {
    if (!investment) return null;
    return projectInvestment({
      principal: currentValue,
      monthlyContribution,
      annualRate: investment.annualRate,
      months: years * 12,
      alreadyContributed: contributedCapital,
    });
  }, [investment, currentValue, monthlyContribution, years, contributedCapital]);

  const chartData = useMemo(
    () => (projection ? projection.points.map(p => ({
      year: p.month === 0 ? 'Hoy' : `${p.year}a`,
      Aportado: Math.round(p.contributed),
      Valor: Math.round(p.value),
      Interés: Math.round(p.interest),
    })) : []),
    [projection]
  );

  const handleSaveCurrentValue = async () => {
    if (!investment?.id) return;
    setSavingValue(true);
    try {
      await updateInvestment({ ...investment, currentAmount: currentValue });
      onChanged();
    } catch (error) {
      console.error('Error actualizando el valor actual:', error);
    } finally {
      setSavingValue(false);
    }
  };

  const handleAddContribution = async () => {
    if (!investment?.id) return;
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    await addInvestmentContribution({
      investmentId: investment.id,
      amount,
      date: new Date(newDate),
    });
    setNewAmount('');
    await loadContributions();
    onChanged();
  };

  const handleDeleteContribution = async (id?: number) => {
    if (!id) return;
    await deleteInvestmentContribution(id);
    await loadContributions();
    onChanged();
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          {investment.name}
          <Typography variant="caption" display="block" color="text.secondary">
            {investment.annualRate}% anual · aportación {formatCurrency(monthlyContribution)}/mes
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Resumen: valor actual (editable), capital aportado y ganancia */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Valor actual</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <TextField
                size="small"
                inputMode="decimal"
                value={currentValueText}
                onChange={(e) => {
                  if (/^\d*[.,]?\d*$/.test(e.target.value)) setCurrentValueText(e.target.value);
                }}
                sx={{ width: 130 }}
              />
              <Tooltip title="Guardar valor actual">
                <span>
                  <IconButton
                    color="primary"
                    aria-label="Guardar valor actual"
                    onClick={handleSaveCurrentValue}
                    disabled={savingValue}
                  >
                    <SaveIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Capital aportado</Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatCurrency(contributedCapital)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inicial {formatCurrency(investment.initialAmount)} + aportaciones {formatCurrency(contributionsTotal)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Ganancia</Typography>
            <Typography
              variant="h6"
              fontWeight={700}
              color={gain >= 0 ? 'success.main' : 'error.main'}
            >
              {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPercentage.toFixed(2)}%)
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Bola de nieve
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {YEAR_PRESETS.map(preset => (
            <Chip
              key={preset}
              label={`${preset} ${preset === 1 ? 'año' : 'años'}`}
              color={years === preset ? 'primary' : 'default'}
              variant={years === preset ? 'filled' : 'outlined'}
              onClick={() => setYears(preset)}
            />
          ))}
        </Box>

        {projection && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Valor proyectado</Typography>
              <Typography variant="h6" color="success.main" fontWeight={700}>
                {formatCurrency(projection.finalValue)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Capital total aportado</Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatCurrency(projection.totalContributed)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="text.secondary">Intereses generados</Typography>
              <Typography variant="h6" color="primary.main" fontWeight={700}>
                +{formatCurrency(projection.totalInterest)}
              </Typography>
            </Grid>
          </Grid>
        )}

        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorAportado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="Valor" stroke="#10B981" fill="url(#colorValor)" strokeWidth={2} />
              <Area type="monotone" dataKey="Aportado" stroke="#6366F1" fill="url(#colorAportado)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Aportaciones ({formatCurrency(contributionsTotal)})
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Las aportaciones suman al capital invertido; no modifican el valor actual.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Importe"
            size="small"
            inputMode="decimal"
            value={newAmount}
            onChange={(e) => {
              if (/^\d*[.,]?\d*$/.test(e.target.value)) setNewAmount(e.target.value);
            }}
            sx={{ width: 120 }}
          />
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
          <Tooltip title="Añadir aportación">
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddContribution}
                disabled={!newAmount}
              >
                Añadir
              </Button>
            </span>
          </Tooltip>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell align="right">Importe</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{format(new Date(investment.startDate), 'dd MMM yyyy', { locale: es })}</TableCell>
              <TableCell>
                <Chip size="small" label="Capital inicial" />
              </TableCell>
              <TableCell align="right">{formatCurrency(investment.initialAmount)}</TableCell>
              <TableCell align="center">
                <Typography variant="caption" color="text.secondary">—</Typography>
              </TableCell>
            </TableRow>
            {contributions.map((contribution) => (
              <TableRow key={contribution.id}>
                <TableCell>{format(new Date(contribution.date), 'dd MMM yyyy', { locale: es })}</TableCell>
                <TableCell>
                  <Chip size="small" label="Aportación" variant="outlined" />
                </TableCell>
                <TableCell align="right">{formatCurrency(contribution.amount)}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" aria-label="Eliminar aportación" onClick={() => handleDeleteContribution(contribution.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
