# Registro de Cambios (Changelog) - JSForm CLI

Todos los cambios notables en el framework **JSForm** se documentan en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Unreleased]

### ⏳ Spinner y Estado de Carga Nativo en DataGridView
* **Overlay y Animación de Carga (Vanilla CSS):**
  * Se implementó un overlay con desenfoque de fondo (`backdrop-filter`) y una tarjeta central con un spinner circular animado y mensaje descriptivo (`loadingMessage`).
* **Integración Automática con Modo Servidor (`serverSide: true`):**
  * La animación de carga se activa automáticamente al cambiar de página (`goToPage`), cambiar el tamaño de filas (`setPageSize`), ordenar columnas (`handleSort`), realizar búsquedas (`applySearch`) o recargar la tabla (`reload`), y se oculta de inmediato al recibir los datos vía `setRemoteData(...)`.
* **Control Programático para Modo Local y Asíncrono:**
  * Métodos `grid.showLoading([mensaje])`, `grid.hideLoading()` y `grid.isLoading()`.
  * `grid.setData(...)` y `grid.setRemoteData(...)` ocultan automáticamente el spinner al actualizar los registros.
* **Opción de Carga Inicial (`loading: true`):**
  * Permite que el grid se monte mostrando el spinner inmediatamente mientras se espera la primera respuesta del servidor.
* **Soporte de Internacionalización (i18n):**
  * Texto de carga traducible reactivamente mediante la clave `datagrid.loading` (por defecto: *"Cargando registros..."*).

---

## [1.3.3] - 2026-09-09

### 🌐 Internacionalización (i18n) en DataGridView
* **Soporte Reactivo de Idiomas en Tiempo Real:**
  * Integración nativa con `JSForm.i18n` y `JSForm.State`. La tabla se suscribe automáticamente a cambios en la clave `'jsform_lang'` y actualiza su interfaz al instante sin reiniciar la página actual, la búsqueda ni los datos.
* **Traducción de Encabezados de Columnas (`col.i18n`):**
  * Cada columna ahora puede definir una clave de traducción opcional (ej: `{ field: 'nombre', header: 'Nombre', i18n: 'users.columns.name' }`). Si la clave existe en el archivo de idioma cargado se traduce dinámicamente; si no, utiliza el `header` o `field` como respaldo seguro.
* **Textos de Controles y Paginación Localizados:**
  * Traducción dinámica del selector de filas ("Mostrar" / "filas"), placeholder del buscador, botón de limpieza de búsqueda ("Limpiar búsqueda"), mensaje de tabla vacía ("No hay registros disponibles"), indicador de paginación con interpolación de variables ("Mostrando {start} a {end} de {total} registros...") y tooltips accesibles en botones de navegación ("Primero", "Anterior", "Siguiente", "Último").
* **Mapeo de Claves Personalizable (`options.i18n`):**
  * Permite personalizar o mapear las claves del diccionario según la estructura JSON del proyecto.
* **Ciclo de Vida Limpio:**
  * Al llamar a `grid.destroy()`, la suscripción a cambios de idioma se cancela automáticamente para evitar fugas de memoria en aplicaciones SPA.

### 🎨 Mejoras de Interfaz y Usabilidad en DataGridView
* **Reubicación Ergonómica del Selector de Filas:**
  * El control de cantidad de filas por página (*"Mostrar X filas"*) se trasladó de la parte superior izquierda al pie de página inferior (`footer`), ubicándose directamente al lado del indicador de registros (*"Mostrando X a Y de Z registros..."*).
* **Barra Superior Limpia y Despejada:**
  * La cabecera superior ahora alberga exclusivamente el buscador universal alineado a la derecha. Si el buscador se deshabilita (`searching: false`), la barra superior no se renderiza, maximizando el área visual de datos.
* **Agrupación Coherente en el Pie de Página:**
  * Todos los controles de navegación, conteo y tamaño de página residen ahora en un único contenedor inferior responsivo (`.jsform-grid-footer`), optimizando la experiencia de usuario y reduciendo el ruido visual en la cabecera.

---

## [1.3.1] - 2026-09-08
## [1.3.2] - 2026-09-08

### 🚀 Novedades en DataGridView
* **Buscador Universal Multicolumna (Local y Backend):**
  * **Modo Local:** Filtra instantáneamente en tiempo real buscando coincidencias en todas las columnas de la tabla (tanto en valores crudos como en celdas renderizadas).
  * **Modo Backend / Remoto:** Envía el término de búsqueda a tu API a través de `onPageChange(page, pageSize, query)` o `onSearch(query, page, pageSize)`.
* **Opción `searchOnEnter: true` (Evita saturación del servidor):**
  * Permite configurar el buscador para que solo ejecute la consulta al presionar la tecla **Enter** (o limpiar la búsqueda), ideal para bases de datos pesadas o endpoints con millones de registros.
* **Control de Debounce Configurable (`searchDebounce`):**
  * En modo automático, espera el tiempo configurado (por defecto 300ms) a que el usuario termine de escribir antes de enviar la petición al servidor.
* **Métodos Programáticos y UI Mejorada:**
  * Métodos `grid.search('query')`, `grid.getSearchTerm()` y `grid.clearSearch()`.
  * Botón de borrado rápido (`✕`) integrado dentro del input de búsqueda.

---

## [1.3.0] - 2026-09-07

### 🚀 Novedades y Características Principales
* **Nuevo DataGridView 100% Nativo (Vanilla JS):**
  * Se eliminó por completo la dependencia externa de `jQuery` y `DataTables.js` desde CDN.
  * El componente ahora es ultra liviano, carga de forma instantánea y sigue la filosofía nativa de JSForm.
* **Hoja de Estilos Propia (`JSForm.DataGridView.css`):**
  * Diseño limpio, moderno y responsive con soporte para temas claros y oscuros.
  * Clases para filas intercaladas (`striped`), efecto `hover`, sticky headers (encabezados fijos con scroll vertical) y paginador estilizado.
* **Paginación Flexible (Local y Backend):**
  * **Modo Local:** Paginación, ordenación y búsqueda automática en memoria a partir de un array en `dataSource`.
  * **Modo Backend / Remoto (`serverSide: true`):** Integración sencilla con APIs mediante `grid.setRemoteData({ data, total, page, pageSize })` y el callback `onPageChange(page, pageSize)`.
* **Persistencia de Página y Recarga Inteligente:**
  * Métodos `reload()`, `getCurrentPage()`, `getPageSize()` y `getTotalPages()`.
  * `setData(newData)` ahora conserva la página actual por defecto tras guardar o editar registros sin reiniciar a la página 1.
* **Renderers Personalizados:** Soporte para renderizar HTML dinámico en celdas (botones de acción, badges de estado, formatos especiales) mediante la función `render: (value, row, index) => '...'`.
* **Buscador Rápido y Selector de Filas:** Búsqueda en tiempo real por texto (`searching: true`) y selector configurable de filas por página (`5, 10, 25, 50, 100`).

---

## [1.2.2] - 2026-09-07

### 🛠️ Mejoras y Depuración
* **Nueva Pantalla de Error `510.html` (Fallo de Controlador):**
  * Diseño moderno estilo *Dev Overlay* oscuro.
  * Inyección dinámica de variables de error (`{{ERROR_VIEW}}`, `{{ERROR_MESSAGE}}`, `{{ERROR_STACK}}`).
  * Muestra el **Stack Trace** completo y sugerencias de depuración en pantalla.
* **Fin a las Redirecciones Ciegas:** Al fallar la importación, sintaxis o inicialización de un controlador durante el desarrollo, JSForm detiene el flujo y muestra el error exacto en lugar de redirigir silenciosamente al Login.

---

## [1.2.1] - 2026-09-03

### 🔧 Correcciones
* **Compatibilidad Kebab-Case <-> CamelCase en IDs Dinámicos:**
  * El `Proxy` ahora convierte automáticamente propiedades en camelCase a kebab-case (`this.appElemento` $\leftrightarrow$ `id="app-elemento"`).
  * El motor de eventos `autoBindEvents` enlaza métodos como `appElemento_click` a elementos con guiones en su ID (`#appElemento, #app-elemento`).

---

## [1.2.0] - 2026-09-02

### 🚀 Novedades y Mejoras del Compilador
* **Propiedades Vivas (Getters ES6 en `.designer.js`):**
  * Los IDs del HTML ahora generan `get miElemento() { return document.getElementById('miElemento'); }`, garantizando autocompletado en VS Code (IntelliSense) y eliminando referencias huérfanas al recargar HTML con `innerHTML`.
* **Proxy Dinámico de Respaldo:** Acceso directo a elementos creados 100% por JavaScript que no existían en el `.html` original (`this.miElementoDinamico`).
* **Auto-Binding de Eventos con Delegación:**
  * Tanto los IDs (`btnGuardar_click`) como las clases (`cls_`) usan delegación de eventos en el contenedor de la vista. Los elementos inyectados dinámicamente responden a eventos sin necesidad de re-enlazar.
* **API Pública `Application.showError(status, target)`:** Método oficial para invocar páginas de error (400, 404, 500) programáticamente desde cualquier controlador.

---

## [1.1.8] - 2026-08-25

### 🚀 Novedades
* **Selector Nativo `this.query(selector)`:** Selector de elementos restringido al DOM de la vista actual (estilo `$('.clase')`, pero devolviendo un `Array` estándar de Vanilla JS).
* **Auto-Binding por Clase (`cls_`):** Convención de métodos como `cls_menu_item_click(e, targetElement)` para enlazar grupos de elementos por clase CSS.

---

## [1.1.0] - [1.0.0] - Versiones Iniciales

### 🌟 Arquitectura Base de JSForm
* **Patrón Code-Behind:** Separación estricta de responsabilidades (`.html`, `.designer.js`, `.controller.js`).
* **Enrutador SPA y Layouts:** Sistema de navegación cliente con soporte para páginas maestras (Master Pages/Layouts).
* **Hot Reload y Restauración de Sesión:** Mantiene la vista activa al refrescar el navegador en desarrollo.
* **Componentes del Núcleo:**
  * `JSForm.MessageBox`: Ventanas modales y cuadros de diálogo asíncronos (`alert`, `confirm`, `prompt`).
  * `JSForm.HttpClient`: Cliente HTTP para peticiones RESTful.
  * `JSForm.State`: Gestor de estado global reactivo.
  * `JSForm.i18n`: Servicio declarativo de internacionalización multi-idioma.
* **Herramientas CLI:** Comandos `jsform init` y `jsform update` para crear y mantener proyectos.

