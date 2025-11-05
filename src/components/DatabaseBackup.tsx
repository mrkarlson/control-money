import { useState } from 'react';
import {
  Box,
  Paper,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { resetDatabase, deleteDatabase } from '../db/config';
import { exportDatabase, importDatabase, clearStore } from '../db';
import { DatabaseConfig } from './DatabaseConfig';
import { DatabaseType } from '../db/repositories/interfaces';

export default function DatabaseBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentDbType, setCurrentDbType] = useState<DatabaseType>('local');

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    setCurrentDbType(type);
    setError(null);
    setSuccess(null);
  };

  // Función para exportar toda la base de datos
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await exportDatabase();

      // Convertir a JSON y crear un blob
      const jsonData = JSON.stringify(data, (_key, value) => {
        // Convertir fechas a formato ISO para que se puedan reconstruir
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        return value;
      }, 2);
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear un enlace de descarga
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      setSuccess('Copia de seguridad exportada correctamente');
    } catch (error) {
      console.error('Error al exportar la base de datos:', error);
      setError('Error al exportar la base de datos');
    } finally {
      setIsExporting(false);
    }
  };

  // Función para importar la base de datos
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      setError(null);
      setSuccess(null);
      
      try {
        const text = await file.text();
        const data = JSON.parse(text, (_key, value) => {
          // Reconstruir objetos Date
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        });
        
        // Importar los datos utilizando la función del servicio
        await importDatabase(data);
        
        setSuccess('Datos importados correctamente');
      } catch (error) {
        console.error('Error al importar la base de datos:', error);
        setError('Error al importar la base de datos. Asegúrate de que el archivo es válido.');
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  };

  // Función para borrar una tabla específica
  const handleDeleteStore = async (storeName: string) => {
    if (!confirm(`¿Estás seguro de que deseas borrar todos los datos de ${storeName}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await clearStore(storeName as any);
      
      if (result) {
        setSuccess(`Datos de ${storeName} borrados correctamente`);
      } else {
        setError(`La tabla ${storeName} no existe`);
      }
    } catch (error) {
      console.error(`Error al borrar la tabla ${storeName}:`, error);
      setError(`Error al borrar la tabla ${storeName}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para reiniciar completamente la base de datos
  const handleResetDatabase = async () => {
    if (!confirm('¿Estás seguro de que deseas REINICIAR COMPLETAMENTE la base de datos? Esta acción eliminará TODOS los datos y recreará la estructura. Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await resetDatabase();
      setSuccess('Base de datos reiniciada correctamente. Se han creado todas las tablas nuevamente.');
    } catch (error) {
      console.error('Error al reiniciar la base de datos:', error);
      setError(`Error al reiniciar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Función para eliminar la base de datos sin recrearla
  const handleDeleteDatabase = async () => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE la base de datos? Esta acción eliminará la base de datos sin recrearla. Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await deleteDatabase();
      setSuccess('Base de datos eliminada correctamente. Deberás recargar la aplicación para crear una nueva.');
    } catch (error) {
      console.error('Error al eliminar la base de datos:', error);
      setError(`Error al eliminar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Paper className="p-6">
      <Typography variant="h6" className="font-semibold mb-4">
        Gestión de Base de Datos
      </Typography>
      <hr className="mt-2 mb-6" />
      
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
      
      <Box className="space-y-8">
        {/* Nueva sección de configuración de base de datos */}
        <Box>
          <DatabaseConfig onDatabaseTypeChange={handleDatabaseTypeChange} />
        </Box>

        <Box>
          <Typography variant="subtitle1" className="font-medium mb-4">
            Copia de Seguridad de la Base de Datos ({currentDbType === 'local' ? 'Local' : 'Nube'})
          </Typography>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="contained"
              color="primary"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <CircularProgress size={24} className="mr-2" />
              ) : null}
              Exportar Base de Datos
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <CircularProgress size={24} className="mr-2" />
              ) : null}
              Importar Base de Datos
            </Button>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle1" className="font-medium mb-4">
            Gestión de Tablas
          </Typography>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tooltip title="Elimina todos los datos de la tabla de gastos">
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleDeleteStore('expenses')}
                disabled={isExporting}
                className="w-full"
              >
                Borrar Tabla de Gastos
              </Button>
            </Tooltip>
            <Tooltip title="Elimina todos los datos de la tabla de balance">
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleDeleteStore('balance')}
                disabled={isExporting}
                className="w-full"
              >
                Borrar Tabla de Balance
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle1" className="font-medium mb-4">
            Operaciones Avanzadas
          </Typography>
          <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tooltip title="Reinicia la base de datos manteniendo la estructura">
              <Button
                variant="outlined"
                color="error"
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="w-full"
              >
                {isResetting ? (
                  <CircularProgress size={24} className="mr-2" />
                ) : null}
                Reiniciar Base de Datos
              </Button>
            </Tooltip>
            <Tooltip title="Elimina completamente la base de datos">
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteDatabase}
                disabled={isResetting}
                className="w-full"
              >
                {isResetting ? (
                  <CircularProgress size={24} className="mr-2" />
                ) : null}
                Eliminar Base de Datos
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}