import { DatabaseRepository } from './repositories/interfaces';
import type { DatabaseType } from './repositories/interfaces';
import { createRepositoryFromEnv } from './repositories/repositoryFactory';
import { Expense, Balance, SavingsGoal, Investment, GoogleSheetsConfig } from './config';

// Singleton para el repositorio actual
let currentRepository: DatabaseRepository | null = null;

// Función para obtener el repositorio actual
export async function getCurrentRepository(): Promise<DatabaseRepository> {
  if (!currentRepository) {
    currentRepository = await createRepositoryFromEnv();
  }
  return currentRepository;
}

// Función para cambiar el repositorio (útil cuando se cambia el tipo de BD)
export async function switchRepository(): Promise<void> {
  currentRepository = null;
  currentRepository = await createRepositoryFromEnv();
}

// Establecer explícitamente el tipo de base de datos preferido y re-inicializar
export async function setPreferredDatabaseType(type: DatabaseType): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('preferred_db_type', type);
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de BD en localStorage:', e);
    }
  }
  await switchRepository();
  // Notificar a la UI que el tipo de BD cambió para que recargue datos
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('dbTypeChanged', { detail: { type } }));
    } catch (e) {
      console.warn('No se pudo despachar el evento dbTypeChanged:', e);
    }
  }
}

// Adaptadores para mantener compatibilidad con servicios existentes

// Servicios de gastos
export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const repo = await getCurrentRepository();
  return repo.expenses.create(expense);
}

export async function getExpenses(): Promise<Expense[]> {
  const repo = await getCurrentRepository();
  return repo.expenses.findAll();
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  const repo = await getCurrentRepository();
  return repo.expenses.update(expense);
}

export async function deleteExpense(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.expenses.delete(id);
}

export async function getExpenseById(id: number): Promise<Expense | undefined> {
  const repo = await getCurrentRepository();
  return repo.expenses.findById(id);
}

// Filtros y consultas de gastos
export async function getExpensesByMonth(date: Date): Promise<Expense[]> {
  const repo = await getCurrentRepository();
  return repo.expenses.findByMonth(date);
}

// Servicios de balance
export async function addBalance(balance: Omit<Balance, 'id'>): Promise<Balance> {
  const repo = await getCurrentRepository();
  return repo.balance.create(balance);
}

export async function getBalance(): Promise<Balance[]> {
  const repo = await getCurrentRepository();
  return repo.balance.findAll();
}

export async function updateBalance(balance: Balance): Promise<Balance> {
  const repo = await getCurrentRepository();
  return repo.balance.update(balance);
}

export async function deleteBalance(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.balance.delete(id);
}

export async function getBalanceById(id: number): Promise<Balance | undefined> {
  const repo = await getCurrentRepository();
  return repo.balance.findById(id);
}

// Balance actual
export async function getCurrentBalance(): Promise<Balance | null> {
  const repo = await getCurrentRepository();
  const current = await repo.balance.getCurrent();
  return current ?? null;
}

// Servicios de metas de ahorro
export async function addSavingsGoal(goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
  const repo = await getCurrentRepository();
  return repo.savings.create(goal);
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const repo = await getCurrentRepository();
  return repo.savings.findAll();
}

export async function updateSavingsGoal(goal: SavingsGoal): Promise<SavingsGoal> {
  const repo = await getCurrentRepository();
  return repo.savings.update(goal);
}

export async function deleteSavingsGoal(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.savings.delete(id);
}

export async function getSavingsGoalById(id: number): Promise<SavingsGoal | undefined> {
  const repo = await getCurrentRepository();
  return repo.savings.findById(id);
}

// Servicios de inversiones
export async function addInvestment(investment: Omit<Investment, 'id'>): Promise<Investment> {
  const repo = await getCurrentRepository();
  return repo.investments.create(investment);
}

export async function getInvestments(): Promise<Investment[]> {
  const repo = await getCurrentRepository();
  return repo.investments.findAll();
}

export async function updateInvestment(investment: Investment): Promise<Investment> {
  const repo = await getCurrentRepository();
  return repo.investments.update(investment);
}

export async function deleteInvestment(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.investments.delete(id);
}

export async function getInvestmentById(id: number): Promise<Investment | undefined> {
  const repo = await getCurrentRepository();
  return repo.investments.findById(id);
}

// Servicios de configuración de Google Sheets
export async function saveGoogleSheetsConfig(config: Omit<GoogleSheetsConfig, 'id'>): Promise<GoogleSheetsConfig> {
  const repo = await getCurrentRepository();
  return repo.googleSheets.create(config);
}

export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig[]> {
  const repo = await getCurrentRepository();
  return repo.googleSheets.findAll();
}

export async function updateGoogleSheetsConfig(config: GoogleSheetsConfig): Promise<GoogleSheetsConfig> {
  const repo = await getCurrentRepository();
  return repo.googleSheets.update(config);
}

export async function deleteGoogleSheetsConfig(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.googleSheets.delete(id);
}

// Servicios de base de datos
export async function exportDatabase(): Promise<any> {
  const repo = await getCurrentRepository();
  return repo.operations.exportData();
}

export async function importDatabase(data: any): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.operations.importData(data);
}

export async function clearStore(storeName: string): Promise<boolean> {
  const repo = await getCurrentRepository();
  try {
    await repo.operations.clearAll();
    return true;
  } catch (error) {
    console.error(`Error clearing store ${storeName}:`, error);
    return false;
  }
}

export async function backupDatabase(): Promise<any> {
  const repo = await getCurrentRepository();
  return repo.operations.backup();
}

export async function restoreDatabase(data: any): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.operations.restore(data);
}