import { TableRow, TableCell, Typography, useTheme } from '@mui/material';
import { SavingsGoal } from '../db/config';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface SavingsSummaryRowProps {
  goals: SavingsGoal[];
}

export default function SavingsSummaryRow({ goals }: SavingsSummaryRowProps) {
  const theme = useTheme();
  
  if (goals.length === 0) {
    return null;
  }

  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalMonthly = goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
  const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <TableRow sx={{ 
      bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
      fontWeight: 'bold',
      '& .MuiTableCell-root': {
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`
      }
    }}>
      <TableCell sx={{ fontWeight: 'bold' }}>TOTALES</TableCell>
      <TableCell>-</TableCell>
      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        {formatCurrency(totalTarget)}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        {formatCurrency(totalCurrent)}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
        {formatCurrency(totalMonthly)}
      </TableCell>
      <TableCell sx={{ fontWeight: 'bold' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {formatPercentage(Math.round(totalProgress))}
        </Typography>
      </TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
    </TableRow>
  );
}