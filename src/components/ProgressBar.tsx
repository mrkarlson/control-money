import { Box, LinearProgress, Typography } from '@mui/material';
import { formatPercentage } from '../utils/formatters';

interface ProgressBarProps {
  current: number;
  target: number;
  completed?: boolean;
  height?: number;
  showPercentage?: boolean;
}

export default function ProgressBar({ 
  current, 
  target, 
  completed = false, 
  height = 10, 
  showPercentage = true 
}: ProgressBarProps) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: showPercentage ? 1 : 0 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height,
            borderRadius: height / 2,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: height / 2,
              bgcolor: completed ? 'success.main' : 'primary.main'
            }
          }}
        />
      </Box>
      {showPercentage && (
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">
            {formatPercentage(Math.round(progress))}
          </Typography>
        </Box>
      )}
    </Box>
  );
}