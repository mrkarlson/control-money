# Arquitectura de Base de Datos Dual

Este proyecto implementa una arquitectura de base de datos dual que permite alternar entre IndexedDB (local) y Turso (nube) siguiendo principios SOLID.

## Estructura del Proyecto

```
src/db/
├── config.ts                    # Configuración original de IndexedDB
├── services.ts                  # Servicios originales de IndexedDB
├── tursoConfig.ts              # Configuración de Turso
├── repositoryAdapter.ts        # Adaptador para mantener compatibilidad
├── syncService.ts              # Servicio de sincronización
├── index.ts                    # Exportaciones principales
├── repositories/
│   ├── interfaces.ts           # Interfaces del patrón Repository
│   ├── indexedDbRepository.ts  # Implementación para IndexedDB
│   ├── tursoRepository.ts      # Implementación para Turso
│   └── repositoryFactory.ts    # Factory para crear repositorios
└── README.md                   # Esta documentación
```

## Patrón Repository

La arquitectura utiliza el patrón Repository para abstraer el acceso a datos:

### Interfaces Principales

- `BaseRepository<T>`: Operaciones CRUD básicas
- `DatabaseRepository`: Unifica todos los repositorios específicos
- `DatabaseSyncService`: Maneja la sincronización entre bases de datos
- `RepositoryFactory`: Crea repositorios según la configuración

### Implementaciones

1. **IndexedDbRepository**: Encapsula la lógica existente de IndexedDB
2. **TursoRepository**: Nueva implementación para base de datos Turso
3. **RepositoryAdapter**: Mantiene compatibilidad con servicios existentes

## Configuración

### Variables de Entorno

Crear `.env.local` con:

```env
# Tipo de base de datos: 'local' o 'turso'
VITE_DB_TYPE=local

# Habilitar sincronización
VITE_SYNC_ENABLED=true

# Configuración de Turso (solo si VITE_DB_TYPE=turso)
VITE_TURSO_DATABASE_URL=libsql://your-database.turso.io
VITE_TURSO_AUTH_TOKEN=your-auth-token

# API de Google Sheets (opcional)
VITE_GOOGLE_SHEETS_CLIENT_ID=your-client-id
VITE_GOOGLE_SHEETS_CLIENT_SECRET=your-client-secret
```

### Uso Básico

```typescript
import { getCurrentRepository, switchRepository } from '../db';

// Obtener el repositorio actual
const repo = await getCurrentRepository();

// Usar operaciones CRUD
const expenses = await repo.expenses.getAll();
const newExpense = await repo.expenses.create({
  amount: 100,
  description: 'Compra',
  date: new Date()
});

// Cambiar tipo de base de datos
await switchRepository();
```

### Sincronización

```typescript
import { getSyncService, getRepositoryFactory } from '../db';

const syncService = getSyncService();
const factory = getRepositoryFactory();

const localRepo = await factory.create({ type: 'local' });
const tursoRepo = await factory.create({ 
  type: 'turso', 
  turso: { url: '...', authToken: '...' } 
});

const result = await syncService.sync(localRepo, tursoRepo);
console.log(`Sincronizados ${result.recordsTransferred} registros`);
```

## Componentes UI

### DatabaseConfig

Componente React que permite:
- Seleccionar tipo de base de datos (Local/Nube)
- Ver estado de conexión
- Configurar credenciales de Turso
- Sincronizar bases de datos
- Ver resultados de sincronización

```tsx
import { DatabaseConfig } from '../components/DatabaseConfig';

<DatabaseConfig 
  onDatabaseTypeChange={(type) => console.log('Cambiado a:', type)} 
/>
```

## Principios SOLID Aplicados

1. **Single Responsibility**: Cada repositorio maneja un solo tipo de entidad
2. **Open/Closed**: Fácil agregar nuevos tipos de base de datos sin modificar código existente
3. **Liskov Substitution**: Todos los repositorios implementan las mismas interfaces
4. **Interface Segregation**: Interfaces específicas para cada responsabilidad
5. **Dependency Inversion**: Dependemos de abstracciones, no de implementaciones concretas

## Migración desde Servicios Existentes

Los servicios existentes siguen funcionando sin cambios gracias al `RepositoryAdapter`:

```typescript
// Código existente sigue funcionando
import { getExpenses, addExpense } from '../db/services';

// Internamente usa el nuevo sistema de repositorios
const expenses = await getExpenses();
```

## Sincronización de Datos

El sistema de sincronización:

1. Compara metadatos entre bases de datos
2. Determina la estrategia de sincronización
3. Transfiere datos según la estrategia
4. Maneja conflictos automáticamente
5. Actualiza metadatos de sincronización

### Estrategias de Sincronización

- `local-to-remote`: Sincronizar desde local a nube
- `remote-to-local`: Sincronizar desde nube a local
- `merge`: Combinar datos de ambas fuentes
- `conflict`: Requiere resolución manual

## Extensibilidad

Para agregar un nuevo tipo de base de datos:

1. Implementar las interfaces en `repositories/interfaces.ts`
2. Crear la configuración específica
3. Actualizar el `RepositoryFactory`
4. Agregar al tipo `DatabaseType`

Ejemplo para PostgreSQL:

```typescript
// 1. Implementar repositorio
class PostgreSQLRepository implements DatabaseRepository {
  // ... implementación
}

// 2. Actualizar factory
case 'postgresql':
  return new PostgreSQLRepository(config.postgresql);

// 3. Actualizar tipos
type DatabaseType = 'local' | 'turso' | 'postgresql';
```