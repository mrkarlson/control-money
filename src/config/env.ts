// Configuración de variables de entorno para el cliente
export const ENV_CONFIG = {
  // Configuración de la base de datos
  DB_TYPE: (import.meta.env.VITE_DB_TYPE || 'local') as 'local' | 'turso',
  SYNC_ENABLED: import.meta.env.VITE_SYNC_ENABLED === 'true',
  
  // Configuración de Turso
  TURSO: {
    DATABASE_URL: import.meta.env.VITE_TURSO_DATABASE_URL || '',
    AUTH_TOKEN: import.meta.env.VITE_TURSO_AUTH_TOKEN || '',
  },
  
  // Configuración de Google Sheets API
  GOOGLE_SHEETS: {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID || '',
    CLIENT_SECRET: import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_SECRET || '',
  },
  
  // Configuración de desarrollo
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;

// Función para validar la configuración de Turso
export function validateTursoConfig(): boolean {
  return !!(ENV_CONFIG.TURSO.DATABASE_URL && ENV_CONFIG.TURSO.AUTH_TOKEN);
}

// Función para validar la configuración de Google Sheets
export function validateGoogleSheetsConfig(): boolean {
  return !!(ENV_CONFIG.GOOGLE_SHEETS.CLIENT_ID && ENV_CONFIG.GOOGLE_SHEETS.CLIENT_SECRET);
}

// Función para obtener la configuración de la base de datos
export function getDatabaseConfig() {
  // Map Turso ENV values to the DatabaseConfig shape expected by repositories
  const tursoConfig = ENV_CONFIG.DB_TYPE === 'turso'
    ? { url: ENV_CONFIG.TURSO.DATABASE_URL, authToken: ENV_CONFIG.TURSO.AUTH_TOKEN }
    : undefined;

  return {
    type: ENV_CONFIG.DB_TYPE,
    syncEnabled: ENV_CONFIG.SYNC_ENABLED,
    turso: tursoConfig,
  };
}

// Función para logging de configuración (solo en desarrollo)
export function logConfig() {
  if (ENV_CONFIG.IS_DEVELOPMENT) {
    console.log('🔧 Configuración de la aplicación:', {
      dbType: ENV_CONFIG.DB_TYPE,
      syncEnabled: ENV_CONFIG.SYNC_ENABLED,
      tursoConfigured: validateTursoConfig(),
      googleSheetsConfigured: validateGoogleSheetsConfig(),
    });
  }
}