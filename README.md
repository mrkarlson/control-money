# Control Money

Aplicación React para gestionar gastos, metas de ahorro e inversiones. Construida con Vite + TypeScript y diseñada con un enfoque responsive.

## Características principales

- **Gastos:** Gestión completa (alta/baja/modificación), filtrado mensual y vistas adaptadas a móvil/escritorio.
- **Ahorros:** Gestión de metas de ahorro con seguimiento de progreso.
- **Inversiones:** Seguimiento de inversiones activas.
- **Base de Datos Flexible:**
  - **Local:** Uso de IndexedDB para almacenamiento offline en el navegador.
  - **Nube:** Integración con Turso (libsql) para sincronización entre dispositivos.
- **Sincronización:**
  - Sincronización manual entre base de datos Local y Nube.
  - Exportación e importación con Google Sheets.
- **UI Moderna:** Soporte para tema claro/oscuro, diseño responsive y componentes interactivos.

## Requisitos previos

- Node.js 18+ y npm.

## Instalación y Desarrollo

1.  **Instalar dependencias:**

    ```bash
    npm install
    ```

2.  **Ejecutar en modo desarrollo:**

    ```bash
    npm run dev
    ```
    La aplicación estará disponible por defecto en `http://localhost:5173`.

3.  **Construcción para producción:**

    ```bash
    npm run build
    ```

4.  **Previsualizar build:**

    ```bash
    npm run preview
    ```

## Configuración de la Aplicación

La aplicación permite configurar las conexiones a bases de datos y servicios externos directamente desde la interfaz de usuario, sin necesidad de editar archivos de configuración o variables de entorno.

### Base de Datos (Local / Turso)

Por defecto, la aplicación utiliza **IndexedDB (Local)**. Para activar la sincronización en la nube:

1.  Ve a la sección de **Configuración** (icono de engranaje o menú).
2.  En el apartado de Base de Datos, selecciona **Nube (Turso)**.
3.  Introduce la **URL de la base de datos** y el **Token de autenticación** proporcionados por Turso.
4.  Guarda la configuración. La app validará la conexión y cambiará al modo Nube si es exitosa.

Esta configuración se guarda de forma segura en tu navegador (IndexedDB) para futuras sesiones.

### Google Sheets

Para sincronizar tus datos con una hoja de cálculo de Google:

1.  Ve a la sección de **Configuración**.
2.  En el apartado de Google Sheets, introduce:
    - **Client ID** y **Client Secret** (de tu proyecto en Google Cloud Console).
    - **ID de la hoja de cálculo** y **Nombre de la hoja**.
3.  Haz clic en **Autenticar con Google** para vincular tu cuenta.
4.  Una vez autenticado, podrás usar los botones de **Exportar** e **Importar** para sincronizar tus gastos.

La configuración y los tokens de acceso se almacenan localmente en IndexedDB.

## Arquitectura

- **Frontend:** React + Vite + TypeScript.
- **Estilos:** Tailwind CSS + Material UI.
- **Almacenamiento:**
  - **Local:** IndexedDB (vía `idb`).
  - **Remoto:** Turso (vía `@libsql/client`).
- **Patrón de Repositorio:** La aplicación utiliza un adaptador que permite cambiar dinámicamente entre almacenamiento local y remoto sin afectar a la lógica de negocio.
