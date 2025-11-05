import { createClient, Client } from '@libsql/client';

export interface TursoConfig {
  url: string;
  authToken: string;
}

let client: Client | null = null;

export function initTursoClient(config: TursoConfig): Client {
  if (!config.url || !config.authToken) {
    throw new Error('Turso URL and auth token are required');
  }

  client = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return client;
}

export function getTursoClient(): Client {
  if (!client) {
    throw new Error('Turso client not initialized. Call initTursoClient first.');
  }
  return client;
}

// SQL para crear las tablas
export const CREATE_TABLES_SQL = `
-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'monthly', 'bi-monthly', 'quarterly', 'annual')),
  next_payment_date TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT 0,
  payment_history TEXT, -- JSON string
  duration INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de balance
CREATE TABLE IF NOT EXISTS balance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  monthly_income REAL NOT NULL,
  date TEXT NOT NULL,
  projected_amount REAL,
  real_amount REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de metas de ahorro
CREATE TABLE IF NOT EXISTS savings_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  monthly_contribution REAL NOT NULL,
  start_date TEXT NOT NULL,
  target_date TEXT,
  completed BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inversiones
CREATE TABLE IF NOT EXISTS investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed-deposit', 'savings-account', 'government-bond', 'mutual-fund', 'other')),
  initial_amount REAL NOT NULL,
  current_amount REAL NOT NULL,
  annual_rate REAL NOT NULL,
  start_date TEXT NOT NULL,
  term_months INTEGER NOT NULL,
  maturity_date TEXT NOT NULL,
  compounding_frequency TEXT NOT NULL CHECK (compounding_frequency IN ('daily', 'monthly', 'quarterly', 'semi-annual', 'annual')),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración de Google Sheets
CREATE TABLE IF NOT EXISTS google_sheets_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TEXT NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  last_sync TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de metadatos de sincronización
CREATE TABLE IF NOT EXISTS sync_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL UNIQUE,
  last_sync TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum TEXT,
  source TEXT NOT NULL DEFAULT 'turso',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);
CREATE INDEX IF NOT EXISTS idx_expenses_is_paid ON expenses(is_paid);

CREATE INDEX IF NOT EXISTS idx_balance_date ON balance(date);

CREATE INDEX IF NOT EXISTS idx_savings_start_date ON savings_goals(start_date);
CREATE INDEX IF NOT EXISTS idx_savings_completed ON savings_goals(completed);

CREATE INDEX IF NOT EXISTS idx_investments_start_date ON investments(start_date);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_is_active ON investments(is_active);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON investments(maturity_date);

CREATE INDEX IF NOT EXISTS idx_google_sheets_last_sync ON google_sheets_config(last_sync);
CREATE INDEX IF NOT EXISTS idx_google_sheets_token_expiry ON google_sheets_config(token_expiry);
`;

export async function initializeTursoDatabase(client: Client): Promise<void> {
  try {
    // Ejecutar todas las sentencias de creación de tablas
    const statements = CREATE_TABLES_SQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await client.execute(statement.trim());
      }
    }

    // Inicializar metadatos de sincronización
    const tables = ['expenses', 'balance', 'savings_goals', 'investments', 'google_sheets_config'];
    
    for (const table of tables) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO sync_metadata (table_name, last_sync, record_count) VALUES (?, ?, 0)`,
        args: [table, new Date().toISOString()]
      });
    }

    console.log('Turso database initialized successfully');
  } catch (error) {
    console.error('Error initializing Turso database:', error);
    throw error;
  }
}

// Utilidades para conversión de datos
// Robust date serialization that accepts Date objects, ISO strings, or timestamps
export function dateToString(date: Date | string | number): string {
  try {
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      // If the string isn't a valid date, fall back to current time
      console.warn('dateToString: invalid date string received, falling back to now:', date);
      return new Date().toISOString();
    }
    if (typeof date === 'number') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      console.warn('dateToString: invalid timestamp received, falling back to now:', date);
      return new Date().toISOString();
    }
    // Unknown type, fall back
    console.warn('dateToString: unexpected type, falling back to now:', typeof date);
    return new Date().toISOString();
  } catch (err) {
    console.warn('dateToString: exception while serializing date, falling back to now:', err);
    return new Date().toISOString();
  }
}

export function stringToDate(dateString: string): Date {
  return new Date(dateString);
}

export function booleanToNumber(value: boolean): number {
  return value ? 1 : 0;
}

export function numberToBoolean(value: number): boolean {
  return value === 1;
}