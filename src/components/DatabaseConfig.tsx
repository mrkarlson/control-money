import React, { useState, useEffect } from 'react';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import { createRepositoryFromEnv, getRepositoryFactory } from '../db/repositories/repositoryFactory';
import { getSyncService } from '../db/syncService';
import { switchRepository, setPreferredDatabaseType } from '../db/repositoryAdapter';
import { DatabaseType, SyncResult } from '../db/repositories/interfaces';
import { ENV_CONFIG, validateTursoConfig, logConfig } from '../config/env';
import { getCloudDbConfig, saveCloudDbConfig, isCloudDbConfigValid } from '../db/cloudDbConfig';

interface DatabaseConfigProps {
  onDatabaseTypeChange?: (type: DatabaseType) => void;
}

export const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ onDatabaseTypeChange }) => {
  const [currentDbType, setCurrentDbType] = useState<DatabaseType>('local');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [tursoConfig, setTursoConfig] = useState({
    url: '',
    authToken: ''
  });

  useEffect(() => {
    // Cargar configuración inicial
    let initialType: DatabaseType = ENV_CONFIG.DB_TYPE;
    if (typeof window !== 'undefined') {
      const pref = localStorage.getItem('preferred_db_type');
      if (pref === 'local' || pref === 'turso') initialType = pref as DatabaseType;
    }
    setCurrentDbType(initialType);
    
    // Intentar cargar configuración guardada en IndexedDB primero
    (async () => {
      try {
        const saved = await getCloudDbConfig();
        if (isCloudDbConfigValid(saved)) {
          setTursoConfig({ url: saved!.url, authToken: saved!.authToken });
        } else {
          setTursoConfig({
            url: ENV_CONFIG.TURSO.DATABASE_URL,
            authToken: ENV_CONFIG.TURSO.AUTH_TOKEN
          });
        }
      } catch {
        setTursoConfig({
          url: ENV_CONFIG.TURSO.DATABASE_URL,
          authToken: ENV_CONFIG.TURSO.AUTH_TOKEN
        });
      }
      // Log de configuración en desarrollo
      logConfig();
      // Verificar conexión inicial
      checkConnection();
    })();
  }, []);

  const handleSaveTursoConfig = async () => {
    try {
      const updated = await saveCloudDbConfig({ url: tursoConfig.url, authToken: tursoConfig.authToken });
      setTursoConfig({ url: updated.url, authToken: updated.authToken });
    } catch (e) {
      console.error('Error guardando configuración de Turso en IndexedDB:', e);
    }
  };

  const checkConnection = async () => {
    try {
      const repository = await createRepositoryFromEnv();
      // Intentar una operación simple para verificar la conexión
      await repository.expenses.findAll();
      setIsConnected(true);
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setIsConnected(false);
    }
  };

  const handleDatabaseTypeChange = async (type: DatabaseType) => {
    try {
      setCurrentDbType(type);
      // Guardar preferencia y cambiar el repositorio actual
      await setPreferredDatabaseType(type);
      await checkConnection();
      onDatabaseTypeChange?.(type);
    } catch (error) {
      console.error('Error cambiando tipo de base de datos:', error);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const factory = getRepositoryFactory();
      const syncService = getSyncService();
      
      // Crear repositorios para ambas bases de datos
      const localRepo = await factory.create({ type: 'local' });
      
      if (!tursoConfig.url || !tursoConfig.authToken) {
        throw new Error('Configuración de Turso incompleta');
      }
      
      const tursoRepo = await factory.create({ 
        type: 'turso', 
        turso: {
          url: tursoConfig.url,
          authToken: tursoConfig.authToken
        }
      });
      
      // Realizar sincronización direccional según BD seleccionada
      // Si el tipo actual es 'local', copiamos de local -> turso
      // Si es 'turso', copiamos de turso -> local
      const result = currentDbType === 'local'
        ? await syncService.syncWithDirection(localRepo, tursoRepo, 'local-to-remote')
        : await syncService.syncWithDirection(tursoRepo, localRepo, 'remote-to-local');
      setSyncResult(result);
      setShowSyncResult(true);
      
      // Ocultar resultado después de 5 segundos
      setTimeout(() => setShowSyncResult(false), 5000);
      
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        recordsTransferred: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      setSyncResult(errorResult);
      setShowSyncResult(true);
      setTimeout(() => setShowSyncResult(false), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          <span className="text-green-700">Conectado</span>
        </>
      ) : (
        <>
            <ErrorOutlineIcon className="w-4 h-4 text-red-500" />
          <span className="text-red-700">Desconectado</span>
        </>
      )}
    </div>
  );

  const SyncResultDisplay = () => {
    if (!showSyncResult || !syncResult) return null;

    return (
      <div className={`mt-4 p-3 rounded-lg border ${
        syncResult.success 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {syncResult.success ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : (
            <ErrorOutlineIcon className="w-4 h-4" />
          )}
          <span className="font-medium">
            {syncResult.success ? 'Sincronización exitosa' : 'Error en sincronización'}
          </span>
        </div>
        
        {syncResult.success && (
          <p className="text-sm">
            {syncResult.recordsTransferred} registros transferidos
          </p>
        )}
        
        {syncResult.error && (
          <p className="text-sm">{syncResult.error}</p>
        )}
        
        {syncResult.conflicts && syncResult.conflicts.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Conflictos detectados:</p>
            <ul className="text-xs mt-1 space-y-1">
              {syncResult.conflicts.map((conflict, index) => (
                <li key={index}>
                  Tabla: {conflict.table}, Registro: {conflict.recordId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Configuración de Base de Datos
        </h3>
      </div>

      {/* Selector de tipo de base de datos */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo de Base de Datos
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDatabaseTypeChange('local')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              currentDbType === 'local'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
            <StorageIcon className="w-6 h-6" />
              <span className="font-medium">Local</span>
              <span className="text-xs text-center">
                IndexedDB en el navegador
              </span>
            </div>
          </button>

          <button
            onClick={() => handleDatabaseTypeChange('turso')}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              currentDbType === 'turso'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
            <CloudQueueIcon className="w-6 h-6" />
              <span className="font-medium">Nube</span>
              <span className="text-xs text-center">
                Base de datos Turso
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Estado de conexión */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Estado de conexión:
        </span>
        <ConnectionStatus />
      </div>

      {/* Configuración de Turso */}
      {currentDbType === 'turso' && (
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-800 dark:text-blue-200">Configuración de Turso</h4>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-200">
              URL de la Base de Datos
            </label>
            <input
              type="text"
              value={tursoConfig.url}
              onChange={(e) => setTursoConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder="libsql://your-database.turso.io"
              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-200">
              Token de Autenticación
            </label>
            <input
              type="password"
              value={tursoConfig.authToken}
              onChange={(e) => setTursoConfig(prev => ({ ...prev, authToken: e.target.value }))}
              placeholder="eyJ..."
              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveTursoConfig}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Guardar credenciales en el dispositivo
            </button>
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Se guardan de forma local (IndexedDB) y NO se sincronizan.
            </span>
          </div>
        </div>
      )}

      {/* Botón de sincronización */}
      <div className="space-y-3">
        <button
          onClick={handleSync}
          disabled={isSyncing || !isConnected}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            isSyncing || !isConnected
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
            <SyncIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Bases de Datos'}
        </button>
        
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Sincroniza los datos entre la base de datos local y la nube
        </p>
      </div>

      {/* Resultado de sincronización */}
      <SyncResultDisplay />
    </div>
  );
};