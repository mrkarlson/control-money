// Exportaciones principales de la base de datos
export * from './config';

// Nuevas exportaciones del patrón Repository
export * from './repositories/interfaces';
export * from './repositories/repositoryFactory';
export * from './syncService';

// Configuración de Turso
export * from './tursoConfig';

// Re-exportar servicios adaptados para mantener compatibilidad
export {
  // Servicios de gastos
  addExpense,
  getExpenses,
  getExpensesByMonth,
  updateExpense,
  deleteExpense,
  getExpenseById,
  
  // Servicios de balance
  addBalance,
  getBalance,
  getCurrentBalance,
  updateBalance,
  deleteBalance,
  getBalanceById,
  
  // Servicios de metas de ahorro
  addSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsGoalById,
  
  // Servicios de inversiones
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getInvestmentById,
  
  // Servicios de configuración de Google Sheets
  saveGoogleSheetsConfig,
  getGoogleSheetsConfig,
  updateGoogleSheetsConfig,
  deleteGoogleSheetsConfig,
  
  // Servicios de base de datos
  exportDatabase,
  importDatabase,
  clearStore,
  backupDatabase,
  restoreDatabase,
  
  // Utilidades
  getCurrentRepository,
  switchRepository,
  setPreferredDatabaseType,
} from './repositoryAdapter';