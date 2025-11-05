import { useEffect, useState } from 'react';
import { setPreferredDatabaseType } from '../db';
import { createRepositoryFromEnv } from '../db/repositories/repositoryFactory';

type DbType = 'local' | 'turso';

export default function DatabaseIndicator() {
  const [dbType, setDbType] = useState<DbType>(() => {
    try {
      const preferred = localStorage.getItem('preferred_db_type') as DbType | null;
      if (preferred === 'local' || preferred === 'turso') return preferred;
    } catch {}
    const envType = (import.meta.env.VITE_DB_TYPE || 'local') as DbType;
    return envType;
  });

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [activeType, setActiveType] = useState<DbType>(() => {
    try {
      const active = localStorage.getItem('active_db_type') as DbType | null;
      if (active === 'local' || active === 'turso') return active;
    } catch {}
    return dbType;
  });

  useEffect(() => {
    const handler = (e: any) => {
      const t = e?.detail?.type as DbType | undefined;
      if (t === 'local' || t === 'turso') {
        setDbType(t);
        // Mostrar loader mientras cambia desde otro lugar de la app
        setIsSwitching(true);
        // Rechequear conexión cuando cambia el tipo
        checkConnection().finally(() => setIsSwitching(false));
      } else {
        // Releer de localStorage por si acaso
        try {
          const preferred = localStorage.getItem('preferred_db_type') as DbType | null;
          if (preferred === 'local' || preferred === 'turso') {
            setDbType(preferred);
            setIsSwitching(true);
            checkConnection().finally(() => setIsSwitching(false));
          }
        } catch {}
      }
    };
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  useEffect(() => {
    // Chequeo inicial de conexión
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkConnection = async () => {
    try {
      setIsChecking(true);
      const repo = await createRepositoryFromEnv();
      // operación simple
      await repo.expenses.findAll();
      setIsConnected(true);
      // Actualizar tipo activo
      try {
        const active = localStorage.getItem('active_db_type') as DbType | null;
        if (active === 'local' || active === 'turso') setActiveType(active);
      } catch {}
    } catch (e) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  const label = activeType === 'turso' ? 'Nube (Turso)' : 'Local';

  const handleChange = async (next: DbType) => {
    if (next === dbType) return;
    try {
      setIsSwitching(true);
      setIsConnected(null);
      setIsChecking(true);
      await setPreferredDatabaseType(next);
      setDbType(next);
      await checkConnection();
    } catch (e) {
      console.error('Error al cambiar el tipo de BD:', e);
    }
    finally {
      setIsSwitching(false);
    }
  };

  // estilos del chip informativo según tipo
  // Paleta según tipo de BD
  const chipClasses = dbType === 'turso'
    ? 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-600'
    : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';

  // Color del dot de estado
  const dotColor = isChecking
    ? 'bg-yellow-400'
    : isConnected === true
      ? 'bg-green-500'
      : isConnected === false
        ? 'bg-red-500'
        : 'bg-gray-400';

  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${chipClasses}`}
        aria-busy={isSwitching || isChecking}
        aria-live="polite"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
        BD: {label}
        {(isSwitching || isChecking) && (
          <span
            className="ml-1 inline-flex items-center justify-center"
            title="Cambiando base de datos"
            aria-label="Cambiando base de datos"
          >
            <svg
              className="animate-spin w-3 h-3 text-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
              />
            </svg>
          </span>
        )}
      </span>
      {/* Selector clásico para escalar a más tipos */}
      <select
        value={dbType}
        onChange={(e) => handleChange(e.target.value as DbType)}
        className={`text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 ${(isSwitching || isChecking) ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={isSwitching || isChecking}
      >
        <option value="local">Local</option>
        <option value="turso">Nube (Turso)</option>
      </select>
    </div>
  );
}