import { openDB, IDBPDatabase, IDBPTransaction, StoreNames, IDBPObjectStore } from 'idb';

export interface PaymentRecord {
  date: Date;
  isPaid: boolean;
  amount?: number; // Cantidad específica para este mes (solo para gastos mensuales)
}

export interface Expense {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: Date;
  frequency: 'one-time' | 'monthly' | 'bi-monthly' | 'quarterly' | 'annual';
  nextPaymentDate?: Date;
  isPaid: boolean;
  paymentHistory?: PaymentRecord[];
  duration?: number; // Duración en meses para gastos recurrentes
}

export interface Balance {
  id?: number;
  amount: number;
  monthlyIncome: number;
  date: Date;
  projectedAmount?: number;
  realAmount?: number;
}

export interface SavingsGoal {
  id?: number;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: Date;
  targetDate?: Date;
  completed: boolean;
}

export interface Investment {
  id?: number;
  name: string;
  type: 'fixed-deposit' | 'savings-account' | 'government-bond' | 'mutual-fund' | 'other';
  initialAmount: number;
  currentAmount: number;
  annualRate: number; // Tasa anual en porcentaje
  startDate: Date;
  termMonths: number; // Plazo en meses
  maturityDate: Date;
  compoundingFrequency: 'daily' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  isActive: boolean;
  notes?: string;
}

const DB_NAME = 'expense-tracker';
const DB_VERSION = 76; // Incrementamos la versión para corregir problemas de inicialización

export interface GoogleSheetsConfig {
  id?: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  spreadsheetId: string;
  sheetName: string;
  lastSync: Date | null;
}

// Definición de tipos para la base de datos
export type ExpenseDB = {
  expenses: {
    key: number;
    value: Expense;
    indexes: { 'date': Date; 'category': string; 'frequency': string; 'isPaid': boolean };
  };
  balance: {
    key: number;
    value: Balance;
    indexes: { 'date': Date };
  };
  sheetConfig: {
    key: number;
    value: GoogleSheetsConfig;
    indexes: { 'lastSync': Date; 'tokenExpiry': Date };
  };
  savings: {
    key: number;
    value: SavingsGoal;
    indexes: { 'startDate': Date; 'completed': boolean };
  };
  investments: {
    key: number;
    value: Investment;
    indexes: { 'startDate': Date; 'type': string; 'isActive': boolean; 'maturityDate': Date };
  };
};

// Función para crear o actualizar el store de expenses
function setupExpensesStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('expenses')) {
    const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
    expenseStore.createIndex('date', 'date');
    expenseStore.createIndex('category', 'category');
    expenseStore.createIndex('frequency', 'frequency');
    expenseStore.createIndex('isPaid', 'isPaid');
  }
}

// Función para crear o actualizar el store de balance
function setupBalanceStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('balance')) {
    const balanceStore = db.createObjectStore('balance', { keyPath: 'id', autoIncrement: true });
    balanceStore.createIndex('date', 'date');
  }
}

// Función para crear o actualizar el store de sheetConfig
function setupSheetConfigStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('sheetConfig')) {
    const configStore = db.createObjectStore('sheetConfig', { keyPath: 'id', autoIncrement: true });
    configStore.createIndex('lastSync', 'lastSync');
    configStore.createIndex('tokenExpiry', 'tokenExpiry');
  }
}

// Función para crear o actualizar el store de savings
function setupSavingsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('savings')) {
    const savingsStore = db.createObjectStore('savings', { keyPath: 'id', autoIncrement: true });
    savingsStore.createIndex('startDate', 'startDate');
    savingsStore.createIndex('completed', 'completed');
  }
}

// Función para crear o actualizar el store de investments
function setupInvestmentsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('investments')) {
    const investmentsStore = db.createObjectStore('investments', { keyPath: 'id', autoIncrement: true });
    investmentsStore.createIndex('startDate', 'startDate');
    investmentsStore.createIndex('type', 'type');
    investmentsStore.createIndex('isActive', 'isActive');
    investmentsStore.createIndex('maturityDate', 'maturityDate');
  }
}

// Función para manejar la migración de datos después de la actualización
async function handlePostUpgradeMigrations(db: IDBPDatabase<ExpenseDB>, oldVersion: number) {
  try {
    // Migración de expenses (versión < 3)
    if (oldVersion < 3) {
      const tx = db.transaction('expenses', 'readwrite');
      const store = tx.objectStore('expenses');
      const expenses = await store.getAll();
      
      for (const expense of expenses) {
        if (!expense.paymentHistory) {
          expense.paymentHistory = [];
          if (expense.isPaid && expense.nextPaymentDate) {
            expense.paymentHistory.push({
              date: new Date(expense.nextPaymentDate),
              isPaid: true
            });
          }
          await store.put(expense);
        }
      }
      await tx.done;
    }

    // Migración de balance (versión < 2)
    if (oldVersion < 2) {
      const tx = db.transaction('balance', 'readwrite');
      const store = tx.objectStore('balance');
      const balances = await store.getAll();
      
      for (const balance of balances) {
        balance.monthlyIncome = balance.monthlyIncome || 0;
        await store.put(balance);
      }
      await tx.done;
    }
  } catch (error) {
    console.error('Error during post-upgrade migrations:', error);
    throw error;
  }
}

// Función para eliminar completamente la base de datos
export async function deleteDatabase(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log(`Base de datos ${DB_NAME} eliminada correctamente`);
      resolve(true);
    };
    
    request.onerror = (event) => {
      console.error(`Error al eliminar la base de datos ${DB_NAME}:`, event);
      reject(new Error(`No se pudo eliminar la base de datos: ${(event.target as any).error}`));
    };
    
    request.onblocked = (event) => {
      console.warn(`La eliminación de la base de datos ${DB_NAME} está bloqueada, cerrando conexiones...`);
      // Intentamos resolver de todos modos, ya que el usuario puede intentar inicializar después
      resolve(false);
    };
  });
}

export async function initDB() {
  try {
    console.log(`Iniciando apertura de base de datos ${DB_NAME} versión ${DB_VERSION}`);
    
    const db = await openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion: number, newVersion: number | null) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Configuración de stores
        setupExpensesStore(db);
        setupBalanceStore(db);
        setupSheetConfigStore(db);
        setupSavingsStore(db);
        setupInvestmentsStore(db);
      },
    });

    // Verificar que los stores se hayan creado correctamente
    const storeNames = Array.from(db.objectStoreNames);
    console.log(`Stores creados: ${storeNames.join(', ')}`);
    
    if (!storeNames.includes('expenses') || !storeNames.includes('balance') || !storeNames.includes('sheetConfig') || !storeNames.includes('savings') || !storeNames.includes('investments')) {
      console.error('No se crearon todos los stores necesarios. Stores existentes:', storeNames);
      throw new Error('Faltan stores en la base de datos');
    }

    return db;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

export async function getDB(): Promise<IDBPDatabase<ExpenseDB>> {
  return openDB<ExpenseDB>(DB_NAME, DB_VERSION);
}

export async function createGoogleSheetsConfig(): Promise<IDBPDatabase<ExpenseDB>> {
  // Inicializar la base de datos con la configuración correcta
  await initDB();
  return getDB();
}

// Función para reiniciar la base de datos (eliminar y volver a crear)
export async function resetDatabase(): Promise<IDBPDatabase<ExpenseDB>> {
  try {
    console.log('Iniciando reinicio de la base de datos...');
    
    // Primero intentamos eliminar la base de datos existente
    await deleteDatabase();
    
    // Esperamos un momento para asegurarnos de que se complete la eliminación
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Inicializamos la base de datos nuevamente
    console.log('Creando nueva base de datos...');
    const db = await initDB();
    
    console.log('Base de datos reiniciada correctamente');
    return db;
  } catch (error) {
    console.error('Error al reiniciar la base de datos:', error);
    throw error;
  }
}