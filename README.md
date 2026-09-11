# JSForm CLI

![NPM Version](https://img.shields.io/npm/v/jsform-cli.svg)
![License](https://img.shields.io/npm/l/jsform-cli.svg)

**JSForm: La arquitectura y productividad de Windows Forms, ahora en la web con Vanilla JS.**

Este proyecto es un framework SPA (Single Page Application) y una herramienta de línea de comandos (CLI) diseñada para desarrolladores que aman la simplicidad y la estructura del desarrollo de escritorio (como WinForms/.NET) y quieren llevar esa experiencia al desarrollo web moderno.

## ✨ Filosofía

JSForm rechaza la tendencia de mezclar lógica y vista en un solo archivo (como JSX). En su lugar, promueve una estricta separación de responsabilidades con su arquitectura "Code-Behind":

*   **Vista (`.html`)**: HTML puro y semántico.
*   **Diseñador (`.designer.js`)**: Un archivo auto-generado que mapea los elementos del DOM mediante **Getters en vivo** y un **Proxy inteligente**. ¡Olvídate de `getElementById` y de referencias rotas cuando recargas contenido con `innerHTML`!
*   **Controlador (`.controller.js`)**: Tu lógica de negocio pura. Hereda del diseñador, lo que permite el acceso a los controles (`this.miBoton`) y el enlazado automático de eventos.

```javascript
// En app/forms/Login/Login.controller.js
import { LoginDesigner } from './Login.designer.js';

export class LoginController extends LoginDesigner {
    constructor() {
        super(); // ¡El Diseñador inicializa los controles y eventos por ti!
    }

    // Se ejecuta automáticamente al hacer click en el elemento con id="btnLogin"
    // ¡Funciona incluso si el botón fue cargado dinámicamente o reemplazado!
    btnLogin_click(e) {
        alert("Login pulsado");
    }
}
```

## 🚀 Características

*   **CLI Integrada**: Genera proyectos, módulos y componentes con un solo comando.
*   **Auto-Scaffolding**: Crea la estructura de archivos (`.html`, `.designer.js`, `.controller.js`) automáticamente.
*   **Propiedades Vivas (Getters + Proxy Híbrido)**: Mapeo automático de elementos por ID con autocompletado en tu editor (IntelliSense) y soporte para elementos inyectados dinámicamente con JavaScript.
*   **Auto-Binding de Eventos con Delegación**: Enlaza eventos del DOM a métodos del controlador por convención de nombres. Gracias a la delegación de eventos, funcionan siempre, incluso si los elementos se inyectan o reemplazan dinámicamente después.
    *   **Por ID:** `btnGuardar_click(e, el)` se enlaza a `<button id="btnGuardar">`.
    *   **Por Clase:** `cls_menu_item_click(e, el)` se enlaza a `<div class="menu-item">`, enviando el elemento específico como segundo parámetro.
*   **Selector Integrado (`this.query`)**: Selecciona múltiples elementos de forma nativa dentro de tu vista. Funciona como un `$('.clase')` de jQuery pero devuelve un `Array` puro de Vanilla JS, restringido al DOM de tu componente actual.
*   **Componentes Reutilizables**: Incluye `MessageBox`, `DataGridView` (tabla de datos nativa con paginación local y remota) y un `HttpClient`.
*   **Compilación para Producción**: Integrado con Vite para empaquetar, minificar y ofuscar tu aplicación con `npm run build`.
*   **Soporte para Layouts/Master Pages**: Define una vista principal y carga las vistas hijas dentro de ella.
*   **Hot Reload Inteligente**: Al refrescar el navegador, restaura la vista actual, incluyendo su layout.
*   **Internacionalización (i18n)**: Soporte integrado para múltiples idiomas de forma declarativa.
*   **Gestor de Estado Global**: Un `State` manager simple y reactivo para compartir datos entre componentes.
*   **Manejo de Errores**: Muestra páginas de error personalizables (400, 404, 500, 510) automáticamente ante fallos de carga o excepciones en controladores (con vista detallada de stack trace y sin redirecciones ciegas) o manualmente desde tus controladores con `Application.showError(status)`.
*   **Cero Dependencias (en el cliente)**: El framework en sí es Vanilla JS puro. Los componentes pueden cargar librerías de terceros bajo demanda.

## 📦 Instalación

Instala el CLI de forma global en tu sistema usando NPM.

```bash
npm install -g jsform-cli
```

## 🏁 Empezando

Crear un nuevo proyecto es tan simple como ejecutar:

```bash
jsform init mi-primera-app
```

Esto creará una nueva carpeta `mi-primera-app` con toda la estructura del proyecto, instalará las dependencias y te dejará listo para empezar.

```bash
cd mi-primera-app
npm run dev
```

¡Tu servidor de desarrollo se iniciará y tu aplicación estará corriendo!

## 📂 Estructura del Proyecto

Un proyecto JSForm generado tiene la siguiente estructura:

```
/
├── app/
│   ├── forms/          # Aquí viven tus vistas/formularios
│   └── services/       # Lógica de negocio, servicios de API, etc.
├── assets/
│   ├── css/
│   ├── img/
│   └── vendors/        # Para librerías de terceros
├── core/               # El núcleo del framework (¡No modificar!)
├── dist/               # La versión de producción se genera aquí
├── .gitignore
├── index.html          # Punto de entrada de la aplicación
├── jsform.config.js    # Configuración global de tu proyecto
└── package.json
```

## 🛠️ Componentes del Núcleo

JSForm viene con un conjunto de componentes inspirados en el escritorio para acelerar tu desarrollo.

### MessageBox

Muestra diálogos modales asíncronos. Usa `async/await` para esperar la respuesta del usuario.

```javascript
import { MessageBox } from '../../core/JSForm.MessageBox.js';

// Dentro de un método de tu controlador (ej. un evento de click)
async btnBorrar_click() {
    const resultado = await MessageBox.show(
        'Confirmar Acción',
        '¿Está seguro de que desea eliminar esto?',
        MessageBox.Buttons.YesNo,
        MessageBox.Icon.Warning
    );
    
    if (resultado === 'yes') {
        console.log('El usuario confirmó el borrado.');
        // Aquí iría la lógica para borrar el elemento...
    }
}
```

### DataGridView

Componente nativo de tabla de datos en Vanilla JS (cero dependencias externas). Soporta columnas configurables, renderers personalizados, ordenación, altura fija con scroll, buscador universal (con soporte `searchOnEnter`), internacionalización reactiva (`i18n`), selector de filas integrado en el pie de página junto al contador de registros, y paginación en memoria o remota conectada a tu Backend.

```javascript
import { DataGridView } from '../../core/JSForm.DataGridView.js';

// En tu controlador...
async init() {
    this.grid = new DataGridView('gridUsuarios', {
        columns: [
            { field: 'id', header: 'ID', i18n: 'users.columns.id', width: '70px', align: 'center' },
            { field: 'nombre', header: 'Nombre Completo', i18n: 'users.columns.name' },
            { field: 'email', header: 'Correo Electrónico', i18n: 'users.columns.email' },
            { 
                field: 'activo', 
                header: 'Estado',
                i18n: 'users.columns.status',
                render: (val, row) => `<span class="badge ${val ? 'activo' : 'inactivo'}">${val ? 'Activo' : 'Inactivo'}</span>` 
            },
            {
                header: 'Acciones',
                i18n: 'users.columns.actions',
                width: '100px',
                render: (val, row) => `<button class="btn-sm" data-id="${row.id}">Editar</button>`
            }
        ],
        pageSize: 10,
        height: '400px', // Altura con scroll o 'auto'
        striped: true,
        hover: true,
        // Configuración de Búsqueda:
        searching: true,
        searchOnEnter: true, // true para buscar solo al presionar 'Enter' (evita saturar el servidor)
        
        // Modo local (en memoria):
        dataSource: [{ id: 1, nombre: 'Ana', email: 'ana@mail.com', activo: true }],
        
        // O modo Backend (remoto):
        // serverSide: true,
        // onPageChange: async (page, pageSize, query) => { await this.cargarUsuarios(page, pageSize, query); },
        onRowClick: (row, index, e) => {
            console.log('Fila seleccionada:', row);
        }
    });
}

// ¡No olvides destruir la instancia para liberar memoria en la SPA!
onDestroy() {
    if (this.grid) {
        this.grid.destroy();
    }
}
```

#### Soporte de Internacionalización (i18n) en DataGridView

El grid reacciona automáticamente a cambios de idioma (`i18n.setLanguage(...)` o `State.set('jsform_lang', ...)`). Puedes agregar las claves estándar en tus archivos `app/i18n/es.json` y `app/i18n/en.json`:

```json
{
  "datagrid": {
    "search": "Search all columns...",
    "show": "Show",
    "rows": "rows",
    "empty": "No records available",
    "info": "Showing {start} to {end} of {total} records (Page {page} of {totalPages})",
    "loading": "Loading records...",
    "clearSearch": "Clear search",
    "first": "First",
    "prev": "Previous",
    "next": "Next",
    "last": "Last"
  }
}
```

#### Estado de Carga y Animación de Spinner

DataGridView incluye un overlay con animación de spinner giratorio nativo en CSS y texto descriptivo (`loadingMessage`):

* **Modo Backend Automático (`serverSide: true`):** El spinner se muestra automáticamente durante las consultas de paginación, ordenación y búsqueda en servidor, y se oculta tan pronto como se invoca `grid.setRemoteData(...)` o concluye la petición.
* **Modo Manual o Local:**
  ```javascript
  // Mostrar el spinner con texto por defecto o personalizado:
  this.grid.showLoading('Consultando base de datos...');

  // Ocultar el spinner:
  this.grid.hideLoading();

  // Comprobar estado:
  if (this.grid.isLoading()) { ... }
  ```
* **Al Inicializar:** Puedes pasar `loading: true` en la configuración si la tabla debe mostrar el spinner inmediatamente mientras esperas la primera respuesta:
  ```javascript
  this.grid = new DataGridView('gridUsuarios', {
      columns: [...],
      loading: true, // Inicia con el spinner activo
      serverSide: true,
      ...
  });
  ```

### Control

Clase base para la creación, manipulación y renderizado fluido de elementos del DOM. Permite crear controles de forma declarativa mediante etiquetas o directamente desde cadenas de texto HTML complejas (tablas, cards, modales, etc.).

#### Creación desde String HTML

Puedes instanciar elementos directamente a partir de un template HTML usando `Control.fromHtml(...)` o pasando la cadena HTML al constructor:

```javascript
import { Control } from '../../core/JSForm.Control.js';

// Crear una tabla compleja directamente desde un string HTML
const miTabla = Control.fromHtml(`
    <table class="table table-striped table-bordered" id="tblReporte">
        <thead>
            <tr><th>Nombre</th><th>Acción</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Juan Pérez</td>
                <td><button class="btn btn-sm btn-action">Seleccionar</button></td>
            </tr>
        </tbody>
    </table>
`);

// Buscar elementos internos y enlazar eventos de forma encadenada
miTabla.find('.btn-action')
    .on('click', () => alert('Fila seleccionada'));

// Renderizar dentro de un contenedor (por ID, elemento DOM o Control padre)
miTabla.renderTo(this.panelPrincipal);
```

#### Creación Declarativa Tradicional

```javascript
// Creación estándar con tagName
const tarjeta = new Control('div', 'cardUsuario', {
    className: 'card p-3 shadow-sm',
    innerHTML: '<h5>Perfil de Usuario</h5>'
});

tarjeta.addClass('activo')
       .renderTo('contenedorCards');
```

### HttpClient

Un cliente para realizar peticiones a tus APIs de forma centralizada. Soporta múltiples configuraciones de API desde `jsform.config.js`.

```javascript
import { HttpClient } from '../../core/JSForm.HttpClient.js';
import { MessageBox } from '../../core/JSForm.MessageBox.js'; // Opcional, para mostrar errores

// Dentro de un método de tu controlador
cargarUsuarios() {
    HttpClient.get('/users', {
        // Opcional: para usar una API no-default
        // api: 'jsonPlaceholder', 
        
        beforeSend: () => {
            // this.btnCargar.disabled = true;
        },
        success: (data, status) => {
            console.log('Usuarios recibidos:', data);
            // this.grid.setData(data); // Ejemplo de uso con DataGridView
        },
        error: (err, status) => {
            MessageBox.show('Error', `No se pudieron cargar los usuarios: ${err.message}`);
        },
        complete: () => {
            // this.btnCargar.disabled = false;
        }
    });
}
```

## ⚙️ Comandos

*   `npm run dev`: Inicia el entorno de desarrollo con el watcher de archivos y el servidor de Vite.
*   `npm run build`: Compila, minifica y ofusca tu aplicación para producción. El resultado se guarda en la carpeta `/dist`.
*   `npm run preview`: Levanta un servidor para probar la versión de producción de la carpeta `/dist`.
*   `jsform update`: Actualiza los archivos del núcleo de JSForm, incluyendo componentes, páginas de error y archivos de ayuda, en un proyecto existente sin sobreescribir tu código.

### JSForm.i18n

Un servicio integrado para manejar múltiples idiomas de forma sencilla y declarativa.

1.  **Crea tus archivos de idioma:** En `app/i18n/`, crea archivos como `es.json` y `en.json`. Puedes anidar claves para una mejor organización.

    ```json
    // en app/i18n/es.json
    {
      "login": {
        "title": "Iniciar Sesión",
        "user_placeholder": "Escribe tu usuario",
        "submit_tooltip": "Haz clic para entrar"
      },
      "welcome_message": "Bienvenido, {user}."
    }
    ```

2.  **Marca tu HTML:** Usa los atributos `data-i18n` de forma inteligente.

    *   **Contenido y Placeholders:** `data-i18n` traduce el `innerHTML` de la mayoría de los elementos. Si se usa en un `<input>` o `<textarea>`, traduce el `placeholder` automáticamente.
    *   **Atributos Específicos:** Usa `data-i18n-title` para tooltips y `data-i18n-attr-*` para cualquier otro atributo (ej. `aria-label`).

    ```html
    <h2 data-i18n="login.title"></h2>
    <input type="text" id="txtUser" data-i18n="login.user_placeholder">
    <button data-i18n-title="login.submit_tooltip">Entrar</button>
    ```

3.  **Uso en Código:** Cambia de idioma o genera textos dinámicos fácilmente.

    ```javascript
    import { i18n } from '../../core/JSForm.i18n.js';

    // Cambiar idioma (el segundo parámetro es el contenedor de la vista)
    i18n.setLanguage('en', this.mainPanel);

    // Obtener texto con parámetros
    const saludo = i18n.get('welcome_message', { user: 'Ana' }); // "Bienvenido, Ana."
    ```

## 📦 Para Contribuidores: Publicar en NPM

El CLI no usa los archivos de `jsform-source/` directamente. En su lugar, se empaquetan en `bin/framework-files.json` antes de publicar.

1.  Realiza tus cambios en los archivos dentro de `jsform-source/`.
2.  Ejecuta `npm run build-fw` para actualizar el paquete de archivos.
3.  Publica en NPM con `npm publish`. El script `prepublishOnly` se encargará de ejecutar el build automáticamente.

## 📋 Historial de Cambios

Para consultar el registro detallado de todas las versiones, características nuevas y correcciones, revisa el archivo [CHANGELOG.md](./CHANGELOG.md).

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un *issue* para discutir cambios importantes o un *pull request* para correcciones.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.