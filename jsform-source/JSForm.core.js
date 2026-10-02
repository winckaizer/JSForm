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

    // Referencia al ID del contenedor de la vista actual
    static _currentViewTargetId = null;

    // NAVIGATION GUARD: Middleware global para protección de rutas y control de sesión
    static _navigationGuard = null;

    /**
     * Registra un interceptor o guard global de navegación antes de renderizar vistas.
     * @param {function} guardFn - async (toView, fromController) => boolean | string (ruta de redirección)
     */
    static setNavigationGuard(guardFn) {
        this._navigationGuard = typeof guardFn === 'function' ? guardFn : null;
    }

    /**
     * Initializes the application and sets up browser history and bfcache listening.
     */
    static async init() {
        // MEJORA 2: Escuchamos cuando el usuario presiona "Atrás" o "Adelante" en el navegador
        window.addEventListener('popstate', async (event) => {
            if (event.state && event.state.form) {
                const targetForm = event.state.form;

                // 1. Verificación previa con Navigation Guard (evita inyectar HTML en el DOM si no hay sesión)
                if (typeof this._navigationGuard === 'function') {
                    const allowed = await this._navigationGuard(targetForm, this._currentController);
                    if (allowed === false || (typeof allowed === 'string' && allowed !== targetForm)) {
                        const redirectView = typeof allowed === 'string' ? allowed : (this.AppConfig.router?.loginView || 'Login');
                        console.warn(`[JSForm NavigationGuard] 🛑 Bloqueada navegación 'Atrás' hacia '${targetForm}'. Redirigiendo a '${redirectView}'...`);
                        
                        // Sobrescribir historial para evitar bucles o vistas fantasma
                        const targetId = event.state.target || this.AppConfig.router.defaultTarget;
                        const newUrl = `${this.AppConfig.router.basePath}/${redirectView}`;
                        window.history.replaceState({ form: redirectView, target: targetId }, "", newUrl);

                        await this.open(redirectView);
                        return;
                    }
                }

                const routeInfo = this._routes[targetForm];
                if (routeInfo) {
                    // Volvemos a cargar la vista anterior pero sin empujarla al historial de nuevo
                    await this.run(targetForm, routeInfo.ControllerClass, event.state.target, null);
                } else {
                    await this.open(targetForm);
                }
            }
        });

        // Soporte para bfcache (Back-Forward Cache): si el navegador restaura un snapshot congelado en memoria
        window.addEventListener('pageshow', async (event) => {
            if (event.persisted && typeof this._navigationGuard === 'function') {
                const currentForm = window.history.state?.form;
                if (currentForm) {
                    const allowed = await this._navigationGuard(currentForm, this._currentController);
                    if (allowed === false || (typeof allowed === 'string' && allowed !== currentForm)) {
                        const redirectView = typeof allowed === 'string' ? allowed : (this.AppConfig.router?.loginView || 'Login');
                        console.warn(`[JSForm bfcache] 🛑 Restauración de caché bloqueada para '${currentForm}'. Redirigiendo a '${redirectView}'...`);
                        const targetId = window.history.state?.target || this.AppConfig.router.defaultTarget;
                        window.history.replaceState({ form: redirectView, target: targetId }, "", `${this.AppConfig.router.basePath}/${redirectView}`);
                        await this.open(redirectView);
                    }
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
     * Abre y navega a una vista por su nombre, resolviendo dinámicamente el controlador si no ha sido registrado.
     * @param {string} viewName - El nombre de la vista/formulario (ej. 'Dashboard', 'Login').
     * @param {object} [parameters=null] - Parámetros opcionales a pasar al controlador.
     * @returns {Promise<object|null>} Instancia del controlador creado.
     */
    static async open(viewName, parameters = null) {
        const route = this._routes[viewName];
        if (route && route.ControllerClass) {
            return await this.run(viewName, route.ControllerClass, null, parameters);
        }

        // Resolución dinámica por convención: /app/forms/[View]/[View].controller.js
        const folderName = viewName;
        const fileName = viewName;
        const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);
        const modulePath = `/app/forms/${folderName}/${fileName}.controller.js`;

        try {
            const module = await import(modulePath);
            const ControllerClass = module[`${classNamePrefix}Controller`];
            if (!ControllerClass) {
                throw new Error(`No se encontró la clase exportada '${classNamePrefix}Controller' en el módulo '${modulePath}'`);
            }
            return await this.run(viewName, ControllerClass, null, parameters);
        } catch (e) {
            console.error(`[JSForm] ❌ Error en Application.open('${viewName}'):`, e);
            const target = this._currentViewTargetId || this.AppConfig.router.defaultTarget;
            const rootContainer = document.getElementById(target);
            if (rootContainer) {
                await this._showErrorPage(rootContainer, 510, null, {
                    view: viewName,
                    error: e,
                    modulePath
                });
            }
            return null;
        }
    }

    /**
     * Alias de Application.open para navegación desacoplada SPA.
     * @param {string} viewName - Nombre de la vista (ej. 'Login', 'Dashboard').
     * @param {object} [parameters=null] - Parámetros a enviar al controlador.
     */
    static async navigate(viewName, parameters = null) {
        return await this.open(viewName, parameters);
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
        // 0. VERIFICACIÓN DEL NAVIGATION GUARD
        // Se ejecuta ANTES de evaluar layouts o inyectar cualquier HTML en el DOM.
        // ==========================================
        if (typeof this._navigationGuard === 'function') {
            const guardResult = await this._navigationGuard(viewName, this._currentController);
            if (guardResult === false) {
                console.warn(`[JSForm NavigationGuard] 🛑 Acceso a '${viewName}' denegado por el Navigation Guard.`);
                return null;
            }
            if (typeof guardResult === 'string' && guardResult !== viewName) {
                console.log(`[JSForm NavigationGuard] 🔄 Redirigiendo navegación de '${viewName}' a '${guardResult}'...`);
                const target = targetId || this.AppConfig.router.defaultTarget;
                window.history.replaceState({ form: guardResult, target }, "", `${this.AppConfig.router.basePath}/${guardResult}`);
                return await this.open(guardResult, parameters);
            }
        }

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

                // Consultar navigation guard antes de restaurar rutas protegidas desde la URL
                if (typeof this._navigationGuard === 'function') {
                    const allowed = await this._navigationGuard(requestedView, null);
                    if (allowed === false || (typeof allowed === 'string' && allowed !== requestedView)) {
                        const redirectView = typeof allowed === 'string' ? allowed : viewName;
                        console.warn(`[JSForm NavigationGuard] 🛑 Auto-routing bloqueado para '${requestedView}'. Redirigiendo a '${redirectView}'...`);
                        const target = targetId || this.AppConfig.router.defaultTarget;
                        window.history.replaceState({ form: redirectView, target }, "", `${this.AppConfig.router.basePath}/${redirectView}`);
                        return await this.open(redirectView, parameters);
                    }
                }
                
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
                    console.error(`[JSForm] ❌ Error cargando controlador para '${requestedView}':`, e);
                    const target = targetId || this.AppConfig.router.defaultTarget;
                    const rootContainer = document.getElementById(target);
                    if (rootContainer) {
                        await this._showErrorPage(rootContainer, 510, null, {
                            view: requestedView,
                            error: e,
                            modulePath: `/app/forms/${folderName}/${fileName}.controller.js`
                        });
                    }
                    return null;
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
                this._currentViewTargetId = finalTargetId;
            }
            
            return formInstance;
            
        } catch (error) {
            // MEJORA: Manejo de errores centralizado
            console.error(`[JSForm] ❌ Failed to load '${viewName}':`, error);

            if (rootContainer) {
                // Si el error tiene un objeto 'response', es un error HTTP (ej. 404, 500)
                if (error.response) {
                    await this._showErrorPage(rootContainer, error.response.status, error.response);
                } else {
                    // Error en el controlador o código JS: Mostramos 510 con detalles
                    await this._showErrorPage(rootContainer, 510, null, {
                        view: viewName,
                        error: error
                    });
                }
            }
            return null;
        }
    }

    /**
     * Muestra una página de error (400, 404, 500, 510, etc.) dentro del contenedor especificado o el contenedor de la vista actual.
     * @param {number|string} status - Código de error HTTP (ej. 404, 500, 510, 400, 403)
     * @param {string|HTMLElement} [target=null] - Contenedor o ID del elemento donde inyectar el error
     * @param {Response|object} [originalResponse=null] - Objeto de respuesta opcional
     * @param {object} [errorDetails=null] - Detalles adicionales del error ({ view, error, message, modulePath })
     */
    static async showError(status, target = null, originalResponse = null, errorDetails = null) {
        let container = null;
        if (typeof target === 'string') {
            container = document.getElementById(target);
        } else if (target instanceof HTMLElement) {
            container = target;
        } else {
            const targetId = this._currentViewTargetId || this.AppConfig.router.defaultTarget;
            container = document.getElementById(targetId);
        }

        if (container) {
            await this._showErrorPage(container, status, originalResponse, errorDetails);
        } else {
            console.error(`[JSForm] ❌ Cannot show error ${status}: Target container not found.`);
        }
    }

    /**
     * MEJORA: Método para mostrar páginas de error.
     * Intenta cargar una página de error personalizada (ej. /assets/errors/404.html, 510.html).
     * Inyecta dinámicamente los detalles del error (mensaje, stack trace, vista) si existen.
     * Si no la encuentra, muestra un mensaje de error genérico.
     * @private
     */
    static async _showErrorPage(container, status, originalResponse = null, errorDetails = null) {
        const errorPagePath = `${this.AppConfig.router.basePath}/assets/errors/${status}.html`;
        try {
            const errorResponse = await fetch(errorPagePath);
            if (errorResponse.ok) {
                let html = await errorResponse.text();

                // Inyectar detalles dinámicos si existen en el template
                if (errorDetails) {
                    const errorMsg = errorDetails.error?.message || errorDetails.message || 'Error desconocido';
                    const errorStack = errorDetails.error?.stack || '';
                    const errorView = errorDetails.view || '';
                    const errorFile = errorDetails.modulePath || '';

                    html = html.replace(/{{ERROR_MESSAGE}}/g, errorMsg)
                               .replace(/{{ERROR_STACK}}/g, errorStack)
                               .replace(/{{ERROR_VIEW}}/g, errorView)
                               .replace(/{{ERROR_FILE}}/g, errorFile);
                }

                container.innerHTML = html;

                // Actualizar elementos específicos si existen en el DOM
                if (errorDetails) {
                    const msgEl = container.querySelector('#jsform-error-message');
                    if (msgEl) msgEl.textContent = errorDetails.error?.message || errorDetails.message || '';
                    const stackEl = container.querySelector('#jsform-error-stack');
                    if (stackEl) stackEl.textContent = errorDetails.error?.stack || '';
                    const viewEl = container.querySelector('#jsform-error-view');
                    if (viewEl) viewEl.textContent = errorDetails.view || '';
                }
            } else {
                throw new Error(`Custom error page for status ${status} not found.`);
            }
        } catch (e) {
            console.warn(`[JSForm] ⚠️  No se encontró una página de error personalizada para el estado ${status}. Mostrando mensaje por defecto.`);
            const errorMsg = errorDetails?.error?.message || (originalResponse ? originalResponse.statusText : 'No se pudo cargar el recurso.');
            const errorStack = errorDetails?.error?.stack ? `<pre style="text-align:left; background:#161b22; color:#ff7b72; padding:15px; border-radius:6px; overflow:auto; font-size:13px; font-family:monospace; margin-top:15px;">${errorDetails.error.stack}</pre>` : '';

            container.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #333; font-family: sans-serif; max-width: 800px; margin: 0 auto;">
                <h1 style="color: #e63946; font-size: 2em; margin-bottom: 10px;">Error ${status}</h1>
                <p style="font-size: 1.1em; color: #555;"><strong>${errorMsg}</strong></p>
                ${errorStack}
                <p style="margin-top: 25px;"><a href="/" style="color: #007bff; text-decoration: none; font-weight: bold;">← Volver al inicio</a></p>
            </div>`;
        }
    }
}