import { DatabaseRepository, RepositoryFactory, DatabaseConfig } from './interfaces';
import { IndexedDbRepository } from './indexedDbRepository';
import { TursoRepository } from './tursoRepository';
import { initTursoClient, initializeTursoDatabase } from '../tursoConfig';
import { initDB } from '../config';

export class DatabaseRepositoryFactory implements RepositoryFactory {
  async create(config: DatabaseConfig): Promise<DatabaseRepository> {
    switch (config.type) {
      case 'local':
        await initDB();
        return new IndexedDbRepository();
      
      case 'turso':
        if (!config.turso) {
          throw new Error('Turso configuration is required for turso database type');
        }
        
        const client = initTursoClient(config.turso);
        await initializeTursoDatabase(client);
        return new TursoRepository(client);
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}

// Singleton para el factory
let factoryInstance: DatabaseRepositoryFactory | null = null;

export function getRepositoryFactory(): DatabaseRepositoryFactory {
  if (!factoryInstance) {
    factoryInstance = new DatabaseRepositoryFactory();
  }
  return factoryInstance;
}

// Función de conveniencia para crear un repositorio basado en variables de entorno
export async function createRepositoryFromEnv(): Promise<DatabaseRepository> {
  // Preferencia de usuario en runtime
  let preferred: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      preferred = localStorage.getItem('preferred_db_type');
    } catch {}
  }

  const envType = (import.meta.env.VITE_DB_TYPE || 'local') as 'local' | 'turso';
  const dbType = (preferred === 'turso' || preferred === 'local') ? preferred as 'local' | 'turso' : envType;
  
  const config: DatabaseConfig = {
    type: dbType
  };

  if (dbType === 'turso') {
    const url = import.meta.env.VITE_TURSO_DATABASE_URL;
    const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
    
    if (!url || !authToken) {
      console.warn('Turso configuration missing, falling back to local database');
      config.type = 'local';
    } else {
      config.turso = { url, authToken };
    }
  }

  const factory = getRepositoryFactory();
  try {
    const repo = await factory.create(config);
    // Persistir el tipo de BD realmente activo
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('active_db_type', config.type); } catch {}
    }
    return repo;
  } catch (err) {
    // Si falló la creación del repositorio Turso (p. ej., network, token inválido), hacer fallback a local
    console.warn('Fallo al inicializar el repositorio seleccionado, haciendo fallback a IndexedDB local:', err);
    try {
      const localConfig: DatabaseConfig = { type: 'local' };
      const localRepo = await factory.create(localConfig);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('active_db_type', 'local'); } catch {}
      }
      return localRepo;
    } catch (localErr) {
      // Re-lanzar si también falla el local
      console.error('También falló la inicialización del repositorio local:', localErr);
      throw localErr;
    }
  }
}