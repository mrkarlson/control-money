import { Typography, TypographyProps } from '@mui/material';
import { formatDate } from '../utils/formatters';

interface DateDisplayProps extends Omit<TypographyProps, 'children'> {
  date: Date | string | null | undefined;
  fallback?: string;
}

export default function DateDisplay({ 
  date, 
  fallback = '-', 
  ...typographyProps 
}: DateDisplayProps) {
  if (!date) {
    return (
      <Typography {...typographyProps}>
        {fallback}
      </Typography>
    );
  }

  try {
    const formattedDate = formatDate(date);
    return (
      <Typography {...typographyProps}>
        {formattedDate}
      </Typography>
    );
  } catch (error) {
    console.error('Error formatting date:', error);
    return (
      <Typography {...typographyProps}>
        {fallback}
      </Typography>
    );
  }
}