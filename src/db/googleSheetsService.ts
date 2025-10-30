import { getDB } from './config';
import type { Expense, GoogleSheetsConfig } from './config';

const GOOGLE_OAUTH2_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig | undefined> {
  const db = await getDB();
  const tx = db.transaction('sheetConfig', 'readonly');
  const store = tx.objectStore('sheetConfig');
  return store.get(1);
}

export async function saveGoogleSheetsConfig(config: GoogleSheetsConfig): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sheetConfig', 'readwrite');
  const store = tx.objectStore('sheetConfig');
  await store.put({ ...config, id: 1 });
}

export async function syncExpensesToSheet(expenses: Expense[]): Promise<void> {
  const config = await getGoogleSheetsConfig();
  if (!config) {
    throw new Error('Google Sheets configuration not found');
  }

  const { accessToken, spreadsheetId, sheetName, tokenExpiry } = config;

  // Verificar si el token ha expirado y renovarlo si es necesario
  if (new Date() >= new Date(tokenExpiry)) {
    await refreshAccessToken(config);
  }

  // Preparar los datos para la exportación
  const headers = [
    'Descripción',
    'Cantidad',
    'Categoría',
    'Fecha',
    'Frecuencia',
    'Estado',
  ];

  const rows = expenses.map(expense => [
    expense.description,
    expense.amount.toString(),
    expense.category,
    new Date(expense.date).toLocaleDateString(),
    expense.frequency,
    expense.isPaid ? 'Pagado' : 'Pendiente',
  ]);

  try {
    // Construir la URL de la API
    const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const url = `${baseUrl}/${spreadsheetId}/values/${sheetName}!A1:Z${rows.length + 1}?valueInputOption=USER_ENTERED`;

    // Realizar la petición a la API con el token de acceso

    // Realizar la petición a la API
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers, ...rows],
        majorDimension: 'ROWS',
      }),
    });

    if (!response.ok) {
      throw new Error(`Error al sincronizar: ${response.statusText}`);
    }

    // Actualizar la fecha de última sincronización
    await saveGoogleSheetsConfig({
      ...config,
      lastSync: new Date(),
    });
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  }
}

export async function refreshAccessToken(config: GoogleSheetsConfig): Promise<GoogleSheetsConfig> {
  try {
    const response = await fetch(GOOGLE_OAUTH2_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Error al renovar el token de acceso');
    }

    const data = await response.json();
    const newConfig = {
      ...config,
      accessToken: data.access_token,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    };

    await saveGoogleSheetsConfig(newConfig);
    return newConfig;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Error al renovar el token de acceso');
  }
}

export async function validateGoogleSheetsConfig(config: GoogleSheetsConfig): Promise<boolean> {
  if (!config.clientId || !config.clientSecret || !config.spreadsheetId || !config.sheetName) {
    throw new Error('Todos los campos son requeridos');
  }

  try {
    const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const url = `${baseUrl}/${config.spreadsheetId}/values/${config.sheetName}`;

    // Verificar si el token ha expirado y renovarlo si es necesario
    if (new Date() >= new Date(config.tokenExpiry)) {
      await refreshAccessToken(config);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });
    if (!response.ok) {
      let errorMessage = 'Error al acceder a Google Sheets';
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          if (errorData.error.message.includes('API key not valid')) {
            errorMessage = 'La clave API no es válida';
          } else if (errorData.error.message.includes('Requested entity was not found')) {
            errorMessage = 'No se encontró la hoja de cálculo especificada';
          } else {
            errorMessage = `Error de Google Sheets: ${errorData.error.message}`;
          }
        }
      } catch {
        errorMessage = `Error de conexión: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    if (!data.values) {
      // Si la hoja está vacía, inicializarla con las columnas necesarias
      const headers = [
        'Descripción',
        'Cantidad',
        'Categoría',
        'Fecha',
        'Frecuencia',
        'Estado',
      ];

      const updateUrl = `${baseUrl}/${config.spreadsheetId}/values/${config.sheetName}!A1:F1?valueInputOption=RAW`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
          majorDimension: 'ROWS',
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('No se pudo inicializar la estructura de la hoja de cálculo');
      }
    } else {
      // Verificar que las columnas necesarias estén presentes
      const requiredColumns = ['Descripción', 'Cantidad', 'Categoría', 'Fecha', 'Frecuencia', 'Estado'];
      const headers = data.values[0] || [];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Faltan las siguientes columnas en la hoja: ${missingColumns.join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating config:', error);
    throw error instanceof Error ? error : new Error('Error al validar la configuración de Google Sheets');
  }
}