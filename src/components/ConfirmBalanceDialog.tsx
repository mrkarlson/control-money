import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { formatCurrency } from '../utils/formatters';
import { snoozeBalancePrompt } from '../utils/paymentPreference';

interface ConfirmBalanceDialogProps {
  open: boolean;
  amount: number;
  expenseName: string;
  currentAmount: number;
  onConfirm: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export default function ConfirmBalanceDialog({
  open,
  amount,
  expenseName,
  currentAmount,
  onConfirm,
  onSkip,
  onDismiss,
}: ConfirmBalanceDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const newAmount = currentAmount - amount;

  // Resetear la casilla cada vez que se abre, para no arrastrar la decisión previa.
  useEffect(() => {
    if (open) setDontAskAgain(false);
  }, [open]);

  const close = (action: 'confirm' | 'skip') => {
    if (action === 'confirm') onConfirm();
    else onSkip();
    if (dontAskAgain) {
      snoozeBalancePrompt();
    }
  };

  return (
    <Dialog open={open} onClose={onDismiss} maxWidth="xs" fullWidth>
      <DialogTitle>Gasto pagado</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Has marcado <strong>{expenseName}</strong> como pagado ({formatCurrency(amount)}).
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ¿Quieres descontarlo del balance actual? Pasaría de {formatCurrency(currentAmount)} a {formatCurrency(newAmount)}.
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />}
          label="No volver a preguntar (durante 30 días)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => close('skip')} color="inherit">
          No, no lo descuentes
        </Button>
        <Button onClick={() => close('confirm')} variant="contained">
          Sí, descontar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
