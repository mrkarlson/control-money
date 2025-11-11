import { getDB, CloudDbConfig } from './config';

// Obtiene la configuración de BD en la nube guardada localmente (IndexedDB)
export async function getCloudDbConfig(): Promise<CloudDbConfig | null> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('dbConfig')) return null;
  const configs = await db.getAll('dbConfig');
  if (!configs || configs.length === 0) return null;
  // Usamos el último por updatedAt (por si hay más de uno)
  const sorted = configs.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  return sorted[sorted.length - 1] as CloudDbConfig;
}

// Guarda/actualiza la configuración de BD en la nube (Turso) en IndexedDB
export async function saveCloudDbConfig(input: { url: string; authToken: string }): Promise<CloudDbConfig> {
  const db = await getDB();
  const now = new Date();
  const existing = await db.getAll('dbConfig');
  if (existing && existing.length > 0) {
    const latest = existing[existing.length - 1] as CloudDbConfig;
    const updated: CloudDbConfig = { ...latest, url: input.url, authToken: input.authToken, updatedAt: now, provider: 'turso' };
    await db.put('dbConfig', updated);
    return updated;
  }
  const created: CloudDbConfig = { provider: 'turso', url: input.url, authToken: input.authToken, updatedAt: now };
  const id = await db.add('dbConfig', created);
  return { ...created, id: Number(id) };
}

export function isCloudDbConfigValid(config: CloudDbConfig | null): boolean {
  return !!(config && config.url && config.authToken);
}