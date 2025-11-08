# Control Money

Aplicación React para gestionar gastos, metas de ahorro e inversiones. Construida con Vite + TypeScript y diseñada con un enfoque responsive: tarjetas en móvil y tablas en escritorio, encabezados visibles y botones de acción flotantes (FAB) para una interacción rápida.

## Características principales

- Gastos: alta/edición/eliminación, filtrado por mes y vista adaptada a móvil/desktop.
- Ahorros: gestión de metas, tarjetas en móvil y FAB para crear nuevas metas.
- Inversiones: listado y edición de inversiones activas, encabezado de sección con título grande.
- UI consistente: encabezado visible, soporte dark/light, FAB verde para acciones principales.
- Selección de base de datos: Local (IndexedDB) o Nube (Turso) con fallback automático.
- Sincronización manual entre Local y Turso (opcional) mediante servicio de sync.

## Requisitos previos

- Node.js 18+ y npm.

## Desarrollo

1) Instalar dependencias:

```
npm install
```

2) Ejecutar en desarrollo (puerto por defecto 5173):

```
npm run dev
```

Puedes cambiar el puerto con:

```
npm run dev -- --port 5173
```

3) Construcción de producción:

```
npm run build
```

4) Previsualización del build:

```
npm run preview
```

## Uso de la aplicación (guía rápida)

- Navega entre Gastos, Ahorros e Inversiones desde la navegación principal.
- En móvil verás tarjetas; en escritorio, tablas. Usa el botón flotante (FAB) para crear nuevos registros.
- El indicador de BD (“BD: Local / Nube (Turso)”) permite cambiar el tipo de almacenamiento en tiempo de ejecución. Al cambiar, la app reconecta y recarga datos.
- La pantalla de “Configuración de Base de Datos” permite comprobar conexión y ejecutar sincronización manual entre Local y Turso.

## Configuración por variables de entorno

Las variables se leen en tiempo de build/arranque y se exponen mediante `import.meta.env`. La app también respeta una preferencia de usuario guardada en `localStorage` para el tipo de BD.

Variables disponibles (ver `src/config/env.ts`):

- VITE_DB_TYPE: tipo de base de datos por defecto. Valores: `local` | `turso`. Por defecto: `local`.
- VITE_SYNC_ENABLED: habilita características de sincronización en la UI. Valores: `true` | `false`. Por defecto: `false`.
- VITE_TURSO_DATABASE_URL: URL de base de datos Turso (libsql). Ej: `libsql://mi-db-mi-org.turso.io`.
- VITE_TURSO_AUTH_TOKEN: token de autenticación Turso.
- VITE_GOOGLE_SHEETS_CLIENT_ID: Client ID de Google Sheets (opcional, si integras exportación/sync con Sheets).
- VITE_GOOGLE_SHEETS_CLIENT_SECRET: Client Secret de Google Sheets (opcional).

### Ejemplos de .env

Ejemplo mínimo (solo local):

```
# .env
VITE_DB_TYPE=local
VITE_SYNC_ENABLED=false

# Integraciones opcionales
VITE_GOOGLE_SHEETS_CLIENT_ID=
VITE_GOOGLE_SHEETS_CLIENT_SECRET=
```

Ejemplo con Turso:

```
# .env
VITE_DB_TYPE=turso
VITE_SYNC_ENABLED=true

# Turso (libsql)
VITE_TURSO_DATABASE_URL=libsql://mi-db-mi-org.turso.io
VITE_TURSO_AUTH_TOKEN=eyJhbGciOi...

# Integraciones opcionales
VITE_GOOGLE_SHEETS_CLIENT_ID=
VITE_GOOGLE_SHEETS_CLIENT_SECRET=
```

Notas importantes:

- Si `VITE_DB_TYPE=turso` pero faltan `VITE_TURSO_DATABASE_URL` o `VITE_TURSO_AUTH_TOKEN`, la app hace fallback automático a `local` (IndexedDB).
- No compartas tokens reales en el repositorio. Usa `.env.local` y exclúyelo del control de versiones.

## Preferencias en tiempo de ejecución y prioridad

La app determina el tipo de BD activo siguiendo esta prioridad:

1) `localStorage.preferred_db_type` (establecido al cambiar el selector de BD en la UI).
2) `VITE_DB_TYPE` definido en `.env`.

Si la inicialización de Turso falla (por ejemplo, token inválido o red), la app registra un aviso y cae a `local`. El tipo de BD efectivamente activo se guarda en `localStorage.active_db_type`.

## Sincronización (opcional)

Cuando `VITE_SYNC_ENABLED=true`, puedes usar la UI de “Configuración de Base de Datos” para ejecutar sincronización manual:

- Local → Turso si la BD seleccionada es `local`.
- Turso → Local si la BD seleccionada es `turso`.

La sincronización utiliza `src/db/syncService.ts` y compara metadatos básicos para decidir la dirección o reportar conflictos.

## Seguridad y credenciales

- En desarrollo, puedes definir la URL y el token de Turso en `.env`. En producción, se recomienda que el usuario final introduzca sus credenciales y que se almacenen cifradas en IndexedDB.
- No incluyas credenciales sensibles en el repositorio ni en builds públicos.

## Comandos útiles

- `npm run dev` — arranca el servidor de desarrollo (por defecto en 5173).
- `npm run dev -- --port 5173` — arranca el dev server en un puerto concreto.
- `npm run build` — genera el build de producción en `dist/`.
- `npm run preview` — sirve el build de producción localmente.

## Arquitectura de datos (resumen)

- Repositorios y fábrica: `src/db/repositories/repositoryFactory.ts` selecciona `IndexedDbRepository` o `TursoRepository` según configuración.
- Adaptador en runtime: `src/db/repositoryAdapter.ts` expone servicios (gastos, ahorros, inversiones) que delegan en el repositorio activo.
- Config de entorno: `src/config/env.ts` centraliza lectura de variables y validaciones básicas.
- Indicadores/Configuración en UI: `src/components/DatabaseIndicator.tsx` y `src/components/DatabaseConfig.tsx`.

## FAQ

- ¿Puedo usar la app sin Turso? Sí. Por defecto funciona con IndexedDB local.
- ¿Qué puerto usa en desarrollo? Vite usa 5173 por defecto; puedes cambiarlo con `--port`.
- ¿Cómo cambio entre Local y Turso? Usa el selector en el indicador de BD dentro de la app; la preferencia se guarda y se respeta al reiniciar.
