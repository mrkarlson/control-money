import { Expense, Balance, SavingsGoal, Investment, GoogleSheetsConfig } from '../config';

// Interfaz base para operaciones CRUD
export interface BaseRepository<T, K = number> {
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: K): Promise<boolean>;
  findById(id: K): Promise<T | undefined>;
  findAll(): Promise<T[]>;
}

// Interfaces específicas para cada entidad
export interface ExpenseRepository extends BaseRepository<Expense> {
  findByMonth(date: Date): Promise<Expense[]>;
  findByCategory(category: string): Promise<Expense[]>;
  findByFrequency(frequency: Expense['frequency']): Promise<Expense[]>;
  findByPaidStatus(isPaid: boolean): Promise<Expense[]>;
  getUpcoming(months?: number): Promise<Expense[]>;
}

export interface BalanceRepository extends BaseRepository<Balance> {
  getCurrent(): Promise<Balance | undefined>;
  findByMonth(date: Date): Promise<Balance | undefined>;
  calculateMonthlyBalance(date: Date): Promise<number>;
}

export interface SavingsRepository extends BaseRepository<SavingsGoal> {
  findByStatus(completed: boolean): Promise<SavingsGoal[]>;
  updateAmount(id: number, amount: number): Promise<SavingsGoal>;
}

export interface InvestmentRepository extends BaseRepository<Investment> {
  findByType(type: Investment['type']): Promise<Investment[]>;
  findActive(): Promise<Investment[]>;
  updateCurrentValue(id: number): Promise<Investment>;
  updateAllCurrentValues(): Promise<void>;
}

export interface GoogleSheetsRepository extends BaseRepository<GoogleSheetsConfig> {
  findByLastSync(): Promise<GoogleSheetsConfig[]>;
  updateTokens(id: number, accessToken: string, refreshToken: string, expiry: Date): Promise<GoogleSheetsConfig>;
}

// Interfaz para operaciones de base de datos
export interface DatabaseOperations {
  exportData(): Promise<Record<string, any[]>>;
  importData(data: Record<string, any[]>): Promise<void>;
  clearAll(): Promise<void>;
  backup(): Promise<string>;
  restore(backupData: string): Promise<void>;
}

// Interfaz principal del repositorio unificado
export interface DatabaseRepository {
  expenses: ExpenseRepository;
  balance: BalanceRepository;
  savings: SavingsRepository;
  investments: InvestmentRepository;
  googleSheets: GoogleSheetsRepository;
  operations: DatabaseOperations;
  
  // Métodos de operaciones de base de datos
  exportData(): Promise<Record<string, any[]>>;
  importData(data: Record<string, any[]>): Promise<void>;
  clearAll(): Promise<void>;
  backup(): Promise<string>;
  restore(backupData: string): Promise<void>;
}

// Tipos para la configuración de la base de datos
export type DatabaseType = 'local' | 'turso';

export interface DatabaseConfig {
  type: DatabaseType;
  turso?: {
    url: string;
    authToken: string;
  };
}

// Interfaz para el factory de repositorios
export interface RepositoryFactory {
  create(config: DatabaseConfig): Promise<DatabaseRepository>;
}

// Interfaz para sincronización entre bases de datos
export interface SyncMetadata {
  lastSync: Date;
  source: DatabaseType;
  recordCount: number;
  checksum?: string;
}

export interface DatabaseSyncService {
  sync(source: DatabaseRepository, target: DatabaseRepository): Promise<SyncResult>;
  getMetadata(repository: DatabaseRepository): Promise<SyncMetadata>;
  compareMetadata(local: SyncMetadata, remote: SyncMetadata): SyncStrategy;
  syncWithDirection(source: DatabaseRepository, target: DatabaseRepository, direction: SyncStrategy): Promise<SyncResult>;
}

export interface SyncResult {
  success: boolean;
  recordsTransferred: number;
  conflicts: SyncConflict[];
  error?: string;
}

export interface SyncConflict {
  table: string;
  recordId: number;
  localData: any;
  remoteData: any;
  resolution?: 'local' | 'remote' | 'merge';
}

export type SyncStrategy = 'local-to-remote' | 'remote-to-local' | 'merge' | 'conflict';