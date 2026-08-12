// core/JSForm.Core.js
import Config from '../jsform.config.js';
import { i18n } from './JSForm.i18n.js';

/**
 * Main Application class responsible for rendering views and handling routing.
 * Follows a Single Page Application (SPA) architecture.
 */
export class Application {
    
    static AppConfig = Config;
    
    // MEJORA 1: Guardamos una referencia al controlador actual
    static _currentController = null;

    // LAYOUTS: Referencias para manejar páginas maestras
    static _currentLayout = null;
    static _currentLayoutController = null;
    
    // MEJORA 3: Un mapa simple para saber qué controlador va con qué ruta (útil para el botón 'Atrás')
    static _routes = {};

    // MEJORA 4: Flag para detectar el inicio de la aplicación
    static _isStartup = true;

    /**
     * Initializes the application and sets up browser history listening.
     */
    static async init() {
        // MEJORA 2: Escuchamos cuando el usuario presiona "Atrás" o "Adelante" en el navegador
        window.addEventListener('popstate', async (event) => {
            if (event.state && event.state.form) {
                const routeInfo = this._routes[event.state.form];
                if (routeInfo) {
                    // Volvemos a cargar la vista anterior pero sin empujarla al historial de nuevo
                    await this.run(event.state.form, routeInfo.ControllerClass, event.state.target, null);
                }
            }
        });

        // Inicializar el servicio de internacionalización
        await i18n.init();
        console.log("🚀 JSForm Application Core initialized.");
    }

    /**
     * Registers a route mapping a string name to its Controller class.
     * @param {string} viewName - e.g., 'login'
     * @param {class} ControllerClass - The imported class definition
     */
    static register(viewName, ControllerClass) {
        this._routes[viewName] = { ControllerClass };
    }

    /**
     * Fetches an HTML view, injects it into the DOM, and instantiates its controller.
     * @param {string} viewName - The name of the view/folder (e.g., 'login').
     * @param {class} ControllerClass - The controller class to instantiate.
     * @param {string} [targetId=null] - The DOM element ID where the HTML will be injected.
     * @param {object} [parameters=null] - Optional data to pass to the controller instance.
     * @returns {Promise<object>} The instantiated controller.
     */
    static async run(viewName, ControllerClass, targetId = null, parameters = null) {
        // ==========================================
        // AUTO-ROUTING EN DESARROLLO (Hot Reload Support)
        // Permite recargar la página en la vista actual en lugar de volver al inicio.
        // ==========================================
        // CORRECCIÓN: La lógica ahora también maneja la carga del layout requerido por la vista.
        if (this._isStartup && this.AppConfig.environment === 'development') {
            this._isStartup = false; 

            const path = window.location.pathname;
            const base = this.AppConfig.router.basePath || '';
            let requestedView = path;
            
            if (base && path.startsWith(base)) requestedView = path.substring(base.length);
            requestedView = requestedView.replace(/^\/+|\/+$/g, '');

            if (requestedView && requestedView !== 'index.html' && requestedView.toLowerCase() !== viewName.toLowerCase()) {
                console.log(`[JSForm] 🔍 Detectada ruta en URL: '${requestedView}'. Intentando restaurar sesión...`);
                
                const folderName = requestedView;
                const fileName = requestedView;
                const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);

                try {
                    const modulePath = `/app/forms/${folderName}/${fileName}.controller.js`;
                    const module = await import(modulePath);
                    const className = `${classNamePrefix}Controller`;
                    const DynamicController = module[className];

                    if (DynamicController) {
                        let targetForChildView = targetId;

                        // 1. Si el controlador dinámico requiere un layout, lo cargamos primero.
                        if (DynamicController.layout) {
                            const layoutConfig = DynamicController.layout;
                            console.log(`[JSForm] 📐 Layout '${layoutConfig.view}' requerido. Cargando...`);

                            const layoutFolderName = layoutConfig.view;
                            const layoutFileName = layoutConfig.view;
                            const layoutClassNamePrefix = layoutFolderName.charAt(0).toUpperCase() + layoutFolderName.slice(1);
                            const layoutPath = `/app/forms/${layoutFolderName}/${layoutFileName}.controller.js`;
                            
                            const layoutModule = await import(layoutPath);
                            const LayoutController = layoutModule[`${layoutClassNamePrefix}Controller`];

                            if (LayoutController) {
                                this._currentLayoutController = await this._internalRun(layoutConfig.view, LayoutController, null, null, false, true);
                                this._currentLayout = layoutConfig.view;
                                targetForChildView = layoutConfig.target; // El nuevo target es el contenedor del layout
                            }
                        }

                        // 2. Ahora cargamos la vista solicitada en el target correcto (sea el root o el del layout)
                        console.log(`[JSForm] ✅ Sesión restaurada: Cargando vista '${requestedView}'...`);
                        this.register(requestedView, DynamicController); // Registrar para el historial
                        const controller = await this._internalRun(requestedView, DynamicController, targetForChildView, parameters, true, false);
                        this._currentController = controller;
                        
                        // 3. Retornamos para evitar que se ejecute la vista por defecto de program.js
                        return controller;
                    }
                } catch (e) {
                    console.warn(`[JSForm] ⚠️ No se pudo restaurar la sesión para '${requestedView}' (Error: ${e.message}). Se cargará la vista por defecto.`);
                }
            }
        }

        this._isStartup = false;

        // ==========================================
        // MANEJO DE LAYOUTS (Master Pages)
        // Verifica si el controlador pide un layout específico
        // ==========================================
        let finalTargetId = targetId;

        if (ControllerClass.layout) {
            const layoutConfig = ControllerClass.layout; // Ej: { view: 'main', target: 'content-wrapper' }
            
            // Si el layout requerido no está activo, lo cargamos primero
            if (this._currentLayout !== layoutConfig.view) {
                console.log(`[JSForm] 📐 Cargando Layout: ${layoutConfig.view}...`);
                
                // Convenciones: Layout 'main' -> app/forms/Main/main.controller.js
                const folderName = layoutConfig.view;
                const fileName = layoutConfig.view;
                const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);
                const layoutPath = `/app/forms/${folderName}/${fileName}.controller.js`;

                try {
                    // Limpiar layout anterior si existe
                    if (this._currentLayoutController && typeof this._currentLayoutController.onDestroy === 'function') {
                        this._currentLayoutController.onDestroy();
                    }

                    const module = await import(layoutPath);
                    const LayoutClass = module[`${classNamePrefix}Controller`];
                    
                    // Cargamos el Layout en el root (sin empujar al historial)
                    // isLayout = true para evitar que se confunda con la página actual
                    this._currentLayoutController = await this._internalRun(layoutConfig.view, LayoutClass, null, null, false, true);
                    this._currentLayout = layoutConfig.view;

                } catch (e) {
                    console.error(`[JSForm] ❌ Error cargando Layout '${layoutConfig.view}':`, e);
                    // Si falla el layout, intentamos cargar la vista normal en el root
                    this._currentLayout = null; 
                }
            }

            // Si tenemos layout activo, redirigimos la vista hija a su contenedor interno
            if (this._currentLayout === layoutConfig.view) {
                finalTargetId = layoutConfig.target;
            }
        } else {
            // Si la vista NO tiene layout, pero teníamos uno activo, limpiamos referencias
            // Esto pasa si navegas de una página interna al Login, por ejemplo.
            if (this._currentLayout) {
                if (this._currentLayoutController && typeof this._currentLayoutController.onDestroy === 'function') {
                    this._currentLayoutController.onDestroy();
                }
                this._currentLayout = null;
                this._currentLayoutController = null;
            }
        }

        // Registramos la ruta por si el usuario usa el botón "Atrás" luego
        this.register(viewName, ControllerClass);
        return await this._internalRun(viewName, ControllerClass, finalTargetId, parameters, true);
    }

    /**
     * Internal runner logic to handle history pushing conditionally.
     */
    static async _internalRun(viewName, ControllerClass, targetId, parameters, pushHistory, isLayout = false) {
        const finalTargetId = targetId || this.AppConfig.router.defaultTarget;
        const rootContainer = document.getElementById(finalTargetId);

        try {
            // MEJORA 1 (Destrucción): Si hay un controlador activo, le avisamos que va a morir
            if (!isLayout && this._currentController && typeof this._currentController.onDestroy === 'function') {
                this._currentController.onDestroy();
                console.log(`[JSForm] 🧹 Cleaned up previous controller.`);
            }

            // 1. Resolve the target container
            
            if (!rootContainer) {
                console.error(`[JSForm] ❌ Error: Target container '#${finalTargetId}' not found.`);
                return null;
            }

            rootContainer.innerHTML = "<div style='padding: 20px;'>Loading interface...</div>";

            // 2. Resolve view paths (assumes /app/forms/Folder/file.html structure)
            const folderName = viewName;
            const fileName = viewName;
            const htmlPath = `/app/forms/${folderName}/${fileName}.html`;

            // 3. Fetch and inject HTML markup
            const response = await fetch(htmlPath);
            if (!response.ok) {
                const error = new Error(`HTML not found at ${htmlPath}. Status: ${response.status}`);
                error.response = response; // Adjuntamos la respuesta al error
                throw error;
            }
            
            rootContainer.innerHTML = await response.text();

            // MEJORA i18n: Aplicar traducciones automáticamente
            i18n.apply(rootContainer);

            // 4. Update browser URL without reloading (History API)
            const newUrl = `${this.AppConfig.router.basePath}/${viewName}`;
            if (pushHistory && window.location.pathname !== newUrl) {
                window.history.pushState({ form: viewName, target: finalTargetId }, "", newUrl);
            }

            // 5. Update document title based on global config
            const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);
            document.title = `${classNamePrefix} - ${this.AppConfig.appName}`;

            // 6. Instantiate and return the controller
            const formInstance = new ControllerClass(parameters);
            
            // Actualizamos nuestra referencia global al nuevo controlador
            if (!isLayout) {
                this._currentController = formInstance;
            }
            
            return formInstance;
            
        } catch (error) {
            // MEJORA: Manejo de errores centralizado
            console.error(`[JSForm] ❌ Failed to load '${viewName}':`, error.message);

            if (rootContainer) {
                // Si el error tiene un objeto 'response', es un error HTTP (ej. 404, 500)
                if (error.response) {
                    await this._showErrorPage(rootContainer, error.response.status, error.response);
                } else {
                    // Si no, es un error de red o de otro tipo. Mostramos un error genérico (ej. 500).
                    await this._showErrorPage(rootContainer, 500);
                }
            }
            return null;
        }
    }

    /**
     * MEJORA: Nuevo método privado para mostrar páginas de error.
     * Intenta cargar una página de error personalizada (ej. /assets/errors/404.html).
     * Si no la encuentra, muestra un mensaje de error genérico.
     * @private
     */
    static async _showErrorPage(container, status, originalResponse = null) {
        const errorPagePath = `${this.AppConfig.router.basePath}/assets/errors/${status}.html`;
        try {
            const errorResponse = await fetch(errorPagePath);
            if (errorResponse.ok) {
                container.innerHTML = await errorResponse.text();
            } else {
                throw new Error(`Custom error page for status ${status} not found.`);
            }
        } catch (e) {
            console.warn(`[JSForm] ⚠️  No se encontró una página de error personalizada para el estado ${status}. Mostrando mensaje por defecto.`);
            container.innerHTML = `<div style="padding: 20px; text-align: center; color: #333;">
                <h1>Error ${status}</h1>
                <p>${originalResponse ? originalResponse.statusText : 'No se pudo cargar el recurso.'}</p>
                <p>Además, no se encontró una página de error personalizada en <code>${errorPagePath}</code>.</p>
            </div>`;
        }
    }
}