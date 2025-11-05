import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getGoogleSheetsConfig } from '../db';
import { exportToGoogleSheets, importFromGoogleSheets } from '../db/googleSheetsSyncService';

export default function GoogleSheetsSync() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSyncInfo();
    const handler = () => loadLastSyncInfo();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  const loadLastSyncInfo = async () => {
    try {
      const config = await getGoogleSheetsConfig();
      if (config?.lastSync) {
        setLastSync(new Date(config.lastSync));
      }
    } catch (error) {
      console.error('Error al cargar información de sincronización:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const config = await getGoogleSheetsConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets. Por favor, configura primero la conexión.');
      }

      const result = await exportToGoogleSheets();
      setLastSync(result.lastSync);
      
      setSuccess('Datos exportados correctamente a Google Sheets');
    } catch (error) {
      console.error('Error durante la exportación:', error);
      setError(error instanceof Error ? error.message : 'Error durante la exportación');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const config = await getGoogleSheetsConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets. Por favor, configura primero la conexión.');
      }

      const result = await importFromGoogleSheets();
      setLastSync(result.lastSync);
      
      setSuccess('Datos importados correctamente desde Google Sheets');
    } catch (error) {
      console.error('Error durante la importación:', error);
      setError(error instanceof Error ? error.message : 'Error durante la importación');
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <Paper className="p-4 mt-4">
      <Box className="flex justify-between items-center mb-4">
        <Typography variant="h6" className="font-semibold">
          Sincronización con Google Sheets
        </Typography>
        <Tooltip title="La sincronización bidireccional permite exportar los totales de gastos y el balance a Google Sheets, así como importar cambios realizados en la hoja de cálculo de vuelta a la aplicación.">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <hr className="mt-2 mb-6" />

      <Box className="mb-4">
        <Typography variant="body2" className="mb-2">
          Estado de sincronización:
        </Typography>
        <Box className="flex items-center">
          <Typography variant="body1" className="font-medium">
            {lastSync 
              ? `Última sincronización: ${format(lastSync, 'dd/MM/yyyy HH:mm:ss', { locale: es })}` 
              : 'No se ha sincronizado aún'}
          </Typography>
        </Box>
      </Box>



      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" className="mb-4">
          {success}
        </Alert>
      )}

      <Box className="grid grid-cols-2 gap-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
          onClick={handleExport}
          disabled={isExporting || isImporting}
          className="w-full"
        >
          {isExporting ? 'Exportando...' : 'Exportar a Google Sheets'}
        </Button>

        <Button
          variant="contained"
          color="secondary"
          startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
          onClick={handleImport}
          disabled={isExporting || isImporting}
          className="w-full"
        >
          {isImporting ? 'Importando...' : 'Importar desde Google Sheets'}
        </Button>
      </Box>
    </Paper>
  );
}