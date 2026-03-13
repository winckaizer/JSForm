# JSForm CLI

![NPM Version](https://img.shields.io/npm/v/jsform-cli.svg)
![License](https://img.shields.io/npm/l/jsform-cli.svg)

**JSForm: La arquitectura y productividad de Windows Forms, ahora en la web con Vanilla JS.**

Este proyecto es un framework SPA (Single Page Application) y una herramienta de línea de comandos (CLI) diseñada para desarrolladores que aman la simplicidad y la estructura del desarrollo de escritorio (como WinForms/.NET) y quieren llevar esa experiencia al desarrollo web moderno.

## ✨ Filosofía

JSForm rechaza la tendencia de mezclar lógica y vista en un solo archivo (como JSX). En su lugar, promueve una estricta separación de responsabilidades con su arquitectura "Code-Behind":

*   **Vista (`.html`)**: HTML puro y semántico.
*   **Diseñador (`.designer.js`)**: Un archivo auto-generado que mapea los elementos del DOM a propiedades de clase. ¡Olvídate de `getElementById`!
*   **Controlador (`.controller.js`)**: Tu lógica de negocio, con acceso directo a los controles a través de `this.miBoton`.

## 🚀 Características

*   **CLI Integrada**: Genera proyectos, módulos y componentes con un solo comando.
*   **Auto-Scaffolding**: Crea la estructura de archivos (`.html`, `.designer.js`, `.controller.js`) automáticamente.
*   **Auto-Binding de Eventos**: Enlaza eventos del DOM a métodos del controlador por convención de nombres (`btnGuardar_click`).
*   **Componentes Reutilizables**: Incluye `MessageBox`, `DataGridView` (adaptador para DataTables.js) y un `HttpClient`.
*   **Compilación para Producción**: Integrado con Vite para empaquetar, minificar y ofuscar tu aplicación con `npm run build`.
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

async function confirmarBorrado() {
    const resultado = await MessageBox.show(
        'Confirmar Acción',
        '¿Está seguro de que desea eliminar esto?',
        MessageBox.Buttons.YesNo,
        MessageBox.Icon.Warning
    );

    if (resultado === 'yes') {
        console.log('Usuario confirmó el borrado.');
    }
}
```

### DataGridView

Un adaptador para la potente librería `DataTables.js` que carga los scripts necesarios bajo demanda.

```javascript
import { DataGridView } from '../../core/JSForm.DataGridView.js';

// En tu controlador...
async init() {
    const datos = [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }];
    
    this.grid = await DataGridView.create('gridUsuarios', {
        dataSource: datos,
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'nombre', title: 'Nombre' }
        ]
    });
}

// ¡No olvides destruir la instancia para liberar memoria!
onDestroy() {
    if (this.grid) {
        this.grid.destroy();
    }
}
```

### HttpClient

Un cliente para realizar peticiones a tus APIs de forma centralizada. Soporta múltiples configuraciones de API desde `jsform.config.js`.

```javascript
import { HttpClient } from '../../core/JSForm.HttpClient.js';

function cargarUsuarios() {
    HttpClient.get('/users', {
        // Opcional: para usar una API no-default
        // api: 'jsonPlaceholder', 
        
        beforeSend: () => console.log('Cargando...'),
        success: (data, status) => {
            console.log('Usuarios recibidos:', data);
        },
        error: (err, status) => {
            console.error('Falló la petición:', err);
        },
        complete: () => console.log('Petición finalizada.')
    });
}
```

## ⚙️ Comandos

*   `npm run dev`: Inicia el entorno de desarrollo con el watcher de archivos y el servidor de Vite.
*   `npm run build`: Compila, minifica y ofusca tu aplicación para producción. El resultado se guarda en la carpeta `/dist`.
*   `npm run preview`: Levanta un servidor para probar la versión de producción de la carpeta `/dist`.
*   `jsform update`: Actualiza los archivos del núcleo de JSForm en un proyecto existente sin sobreescribir tu código.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un *issue* para discutir cambios importantes o un *pull request* para correcciones.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.