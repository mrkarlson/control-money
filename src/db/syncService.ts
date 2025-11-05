import { 
  DatabaseSyncService, 
  DatabaseRepository, 
  SyncMetadata, 
  SyncResult, 
  SyncStrategy, 
  SyncConflict,
  DatabaseType 
} from './repositories/interfaces';

export class DatabaseSyncServiceImpl implements DatabaseSyncService {
  
  async sync(source: DatabaseRepository, target: DatabaseRepository): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsTransferred: 0,
      conflicts: []
    };

    try {
      const sourceMetadata = await this.getMetadata(source);
      const targetMetadata = await this.getMetadata(target);
      
      const strategy = this.compareMetadata(sourceMetadata, targetMetadata);
      
      switch (strategy) {
        case 'local-to-remote':
          result.recordsTransferred = await this.syncFromSourceToTarget(source, target);
          break;
        case 'remote-to-local':
          result.recordsTransferred = await this.syncFromSourceToTarget(target, source);
          break;
        case 'merge':
          const mergeResult = await this.mergeRepositories(source, target, sourceMetadata, targetMetadata);
          result.recordsTransferred = mergeResult.recordsTransferred;
          result.conflicts = mergeResult.conflicts;
          break;
        case 'conflict':
          result.error = 'Conflictos detectados que requieren resolución manual';
          result.conflicts = await this.detectConflicts(source, target);
          return result;
      }

      // Actualizar metadatos después de la sincronización
      await this.updateSyncMetadata(source, sourceMetadata.source);
      await this.updateSyncMetadata(target, targetMetadata.source);
      
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Error desconocido durante la sincronización';
    }

    return result;
  }

  // Sincronización direccional explícita: clona los datos del source al target
  async syncWithDirection(
    source: DatabaseRepository,
    target: DatabaseRepository,
    direction: SyncStrategy
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsTransferred: 0,
      conflicts: []
    };

    try {
      const transferred = await this.syncFromSourceToTarget(source, target);
      result.recordsTransferred = transferred;

      // Actualizar metadatos (log)
      await this.updateSyncMetadata(source, this.detectDatabaseType(source));
      await this.updateSyncMetadata(target, this.detectDatabaseType(target));

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Error desconocido durante la sincronización';
    }

    return result;
  }

  async getMetadata(repository: DatabaseRepository): Promise<SyncMetadata> {
    try {
      const data = await repository.exportData();
      
      let totalRecords = 0;
      let checksumData = '';
      
      // Contar registros y generar checksum
      Object.entries(data).forEach(([table, records]) => {
        const recordsArray = records as any[];
        totalRecords += recordsArray.length;
        checksumData += `${table}:${recordsArray.length}:${JSON.stringify(recordsArray.slice(0, 5))}`;
      });

      const checksum = await this.generateChecksum(checksumData);
      
      return {
        lastSync: new Date(),
        source: this.detectDatabaseType(repository),
        recordCount: totalRecords,
        checksum
      };
    } catch (error) {
      throw new Error(`Error obteniendo metadatos: ${error}`);
    }
  }

  compareMetadata(local: SyncMetadata, remote: SyncMetadata): SyncStrategy {
    // Si una base de datos está vacía, sincronizar desde la que tiene datos
    if (local.recordCount === 0 && remote.recordCount > 0) {
      return 'remote-to-local';
    }
    
    if (remote.recordCount === 0 && local.recordCount > 0) {
      return 'local-to-remote';
    }

    // Si ambas están vacías, no hay nada que sincronizar
    if (local.recordCount === 0 && remote.recordCount === 0) {
      return 'local-to-remote'; // Por defecto
    }

    // Comparar fechas de última sincronización
    const localTime = local.lastSync.getTime();
    const remoteTime = remote.lastSync.getTime();
    const timeDiff = Math.abs(localTime - remoteTime);
    
    // Si la diferencia es menor a 1 minuto, considerar como sincronizadas
    if (timeDiff < 60000) {
      return 'local-to-remote';
    }

    // Si los checksums son diferentes, hay conflictos potenciales
    if (local.checksum !== remote.checksum) {
      // Si una fue actualizada más recientemente, usar esa
      if (localTime > remoteTime) {
        return 'local-to-remote';
      } else {
        return 'remote-to-local';
      }
    }

    return 'local-to-remote';
  }

  private async syncFromSourceToTarget(source: DatabaseRepository, target: DatabaseRepository): Promise<number> {
    const data = await source.exportData();
    await target.importData(data);
    
    let totalRecords = 0;
    Object.values(data).forEach(records => {
      const recordsArray = records as any[];
      totalRecords += recordsArray.length;
    });
    
    return totalRecords;
  }

  private async mergeRepositories(
    local: DatabaseRepository, 
    remote: DatabaseRepository,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): Promise<{ recordsTransferred: number; conflicts: SyncConflict[] }> {
    const conflicts: SyncConflict[] = [];
    let recordsTransferred = 0;

    // Por simplicidad, en caso de merge, priorizar la base de datos más reciente
    if (localMetadata.lastSync > remoteMetadata.lastSync) {
      recordsTransferred = await this.syncFromSourceToTarget(local, remote);
    } else {
      recordsTransferred = await this.syncFromSourceToTarget(remote, local);
    }

    return { recordsTransferred, conflicts };
  }

  private async detectConflicts(local: DatabaseRepository, remote: DatabaseRepository): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    
    try {
      const localData = await local.exportData();
      const remoteData = await remote.exportData();

      // Comparar cada tabla
      Object.keys(localData).forEach(table => {
        const localRecords = localData[table] || [];
        const remoteRecords = remoteData[table] || [];

        // Detectar conflictos básicos (diferentes cantidades de registros)
        if (localRecords.length !== remoteRecords.length) {
          conflicts.push({
            table,
            recordId: -1,
            localData: { count: localRecords.length },
            remoteData: { count: remoteRecords.length }
          });
        }
      });
    } catch (error) {
      console.error('Error detectando conflictos:', error);
    }

    return conflicts;
  }

  private async updateSyncMetadata(repository: DatabaseRepository, source: DatabaseType): Promise<void> {
    // En una implementación real, actualizarías los metadatos en la base de datos
    // Por ahora, solo registramos la operación
    const dbType = this.detectDatabaseType(repository);
    console.log(`Metadatos de sincronización actualizados para ${source} en base de datos ${dbType}`);
  }

  private detectDatabaseType(repository: DatabaseRepository): DatabaseType {
    // Detectar el tipo basado en el constructor o propiedades del repositorio
    if (repository.constructor.name.includes('Turso')) {
      return 'turso';
    }
    return 'local';
  }

  private async generateChecksum(data: string): Promise<string> {
    // Generar un hash simple para el checksum
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Singleton para el servicio de sincronización
let syncServiceInstance: DatabaseSyncServiceImpl | null = null;

export function getSyncService(): DatabaseSyncServiceImpl {
  if (!syncServiceInstance) {
    syncServiceInstance = new DatabaseSyncServiceImpl();
  }
  return syncServiceInstance;
}