import { Box } from '@mui/material';
import SavingsList from './SavingsList';

export default function Savings() {
  return (
    <Box>
      <div className="mb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Ahorros</h1>
          </div>
        </div>
      </div>
      <SavingsList />
    </Box>
  );
}