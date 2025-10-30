import { useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { saveGoogleSheetsConfig } from '../db/googleSheetsService';

export default function OAuth2Callback() {
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          throw new Error('No se recibió el código de autorización');
        }

        // Intercambiar el código por tokens
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
            redirect_uri: `${window.location.origin}/oauth-callback`,
            grant_type: 'authorization_code',
          }),
        });

        if (!response.ok) {
          throw new Error('Error al obtener los tokens');
        }

        const data = await response.json();

        // Guardar los tokens en la base de datos
        await saveGoogleSheetsConfig({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID, // Se mantendrá el valor existente
          sheetName: import.meta.env.VITE_GOOGLE_SHEET_NAME, // Se mantendrá el valor existente
          lastSync: null,
        });

        // Redirigir de vuelta a la configuración
        window.location.href = '/configuration';
      } catch (error) {
        console.error('Error en el callback de OAuth:', error);
        // Redirigir a la configuración con un mensaje de error
        window.location.href = '/?error=auth_failed';
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Procesando autenticación...
      </Typography>
    </Box>
  );
}