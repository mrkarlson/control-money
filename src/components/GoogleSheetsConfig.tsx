import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { validateGoogleSheetsConfig } from '../db/googleSheetsService';
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from '../db';
import DatabaseBackup from './DatabaseBackup';
import GoogleSheetsSync from './GoogleSheetsSync';

interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  spreadsheetId: string;
  sheetName: string;
  lastSync: Date | null;
}

export default function GoogleSheetsConfig() {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    accessToken: '',
    refreshToken: '',
    tokenExpiry: new Date(),
    spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || '',
    sheetName: import.meta.env.VITE_GOOGLE_SHEET_NAME || '',
    lastSync: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Al usar el adaptador de repositorio, asumimos que la capa de datos está disponible

  useEffect(() => {
    loadConfig();
    const handler = () => loadConfig();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  const loadConfig = async () => {
    try {
      const configs = await getGoogleSheetsConfig();
      const savedConfig = Array.isArray(configs) ? (configs[0] as any) : undefined;
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Error loading Google Sheets config:', error);
      setError('Error al cargar la configuración. Por favor, intenta recargar la página.');
    }
  };

  // La creación explícita del almacén ya no es necesaria al usar el patrón Repository

  const saveConfig = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validar que todos los campos requeridos estén presentes
      if (!config.spreadsheetId || !config.sheetName) {
        throw new Error('El ID de la hoja y el nombre son requeridos');
      }

      // Validar la configuración con Google Sheets API
      const isValid = await validateGoogleSheetsConfig(config);
      if (!isValid) {
        throw new Error('La configuración proporcionada no es válida. Por favor, verifica tus credenciales y los datos de la hoja de cálculo.');
      }

      await saveGoogleSheetsConfig({
        ...config,
        lastSync: null,
      } as any);
      setSuccess('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving Google Sheets config:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  // La función handleSync se ha movido al componente GoogleSheetsSync

  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'oauth2callback') {
        const code = event.data.code;
        if (code) {
          try {
            setIsLoading(true);
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: `${window.location.origin}/oauth-popup.html`,
                grant_type: 'authorization_code',
              }),
            });

            if (!response.ok) {
              throw new Error('Error al obtener los tokens');
            }

            const data = await response.json();
            const newConfig = {
              ...config,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
            };

            await saveGoogleSheetsConfig(newConfig);
            setConfig(newConfig);
            setSuccess('Autenticación completada correctamente');
            if (authWindow) {
              authWindow.close();
              setAuthWindow(null);
            }
          } catch (error) {
            console.error('Error en el proceso de autenticación:', error);
            setError('Error durante la autenticación');
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config, authWindow]);

  const handleAuthClick = async () => {
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${window.location.origin}/oauth-callback&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      setError('Error al iniciar el proceso de autenticación');
    }
  };



  return (
    <Box className="flex flex-col gap-8">
      <Paper className="p-8">
        <Typography variant="h6" className="font-semibold mb-4">
          Configuración de Google Sheets
        </Typography>
        <hr className="mt-2 mb-6" />

        {
          <Box className="flex flex-col gap-8">
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="ID de cliente"
                value={config.clientId}
                onChange={(e) =>
                  setConfig({ ...config, clientId: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Secreto de cliente"
                value={config.clientSecret}
                onChange={(e) =>
                  setConfig({ ...config, clientSecret: e.target.value })
                }
                fullWidth
              />
            </Box>

            <Box className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="ID de la hoja de cálculo"
                value={config.spreadsheetId}
                onChange={(e) =>
                  setConfig({ ...config, spreadsheetId: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Nombre de la hoja"
                value={config.sheetName}
                onChange={(e) =>
                  setConfig({ ...config, sheetName: e.target.value })
                }
                fullWidth
              />
            </Box>

            <Box className="flex flex-col gap-6">
              {error && <Alert severity="error" className="mb-4">{error}</Alert>}
              {success && <Alert severity="success" className="mb-4">{success}</Alert>}

              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="contained"
                  onClick={handleAuthClick}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <CircularProgress size={24} className="mr-2" />
                  ) : null}
                  Autenticar con Google
                </Button>
                <Button
                  variant="contained"
                  onClick={saveConfig}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <CircularProgress size={24} className="mr-2" />
                  ) : null}
                  Guardar configuración
                </Button>
              </Box>
            </Box>
          </Box>
        }
      </Paper>

      <GoogleSheetsSync />
      <DatabaseBackup />
    </Box>
  );
}