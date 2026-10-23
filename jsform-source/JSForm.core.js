// core/JSForm.Core.js
import Config from '../jsform.config.js';
import { i18n } from './JSForm.i18n.js';
import { Logger } from './JSForm.Logger.js';

/**
 * Main Application class responsible for rendering views and handling routing.
 * Follows a Single Page Application (SPA) architecture.
 */
export class Application {
    
    static AppConfig = Config;
    static Logger = Logger;
    
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

    // NAVIGATION & ROUTE REGISTRY (Declarativo, Metadatos y Pipeline de Guards)
    static _routesList = [];
    static _routesMap = new Map();
    static _navigationGuards = [];
    static _denialHooks = [];
    static _currentRoute = null;
    static _activeNavController = null;

    // NAVIGATION GUARD: Referencia histórica para compatibilidad
    static _navigationGuard = null;

    /**
     * Registra un catálogo declarativo de rutas con metadatos asociados.
     * @param {Array<Object>} routes - Lista de definiciones de ruta ({ name, path, form, title, meta })
     */
    static registerRoutes(routes) {
        if (!Array.isArray(routes)) {
            console.error('[JSForm] ❌ Error: registerRoutes espera un Array de rutas.');
            return;
        }

        routes.forEach(route => {
            if (!route || (!route.form && !route.name && !route.path)) return;

            const normalizedRoute = {
                name: route.name || route.form || (route.path ? route.path.replace(/^\/+/, '') : 'Default'),
                path: route.path ? (route.path.startsWith('/') ? route.path : `/${route.path}`) : `/${route.form || route.name}`,
                form: route.form || route.name,
                title: route.title || null,
                meta: route.meta ? { ...route.meta } : {}
            };

            this._routesList.push(normalizedRoute);

            // Indexar en _routesMap por name, form y path en minúsculas para resolución rápida
            if (normalizedRoute.name) {
                this._routesMap.set(normalizedRoute.name.toLowerCase(), normalizedRoute);
            }
            if (normalizedRoute.form) {
                this._routesMap.set(normalizedRoute.form.toLowerCase(), normalizedRoute);
            }
            if (normalizedRoute.path) {
                this._routesMap.set(normalizedRoute.path.toLowerCase(), normalizedRoute);
                this._routesMap.set(normalizedRoute.path.replace(/^\/+/, '').toLowerCase(), normalizedRoute);
            }
        });
    }

    /**
     * Retorna una copia de la ruta activa actual o null.
     */
    static get currentRoute() {
        return this._currentRoute ? { ...this._currentRoute } : null;
    }

    /**
     * Alias funcional para obtener la ruta activa actual.
     */
    static getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Añade un guard al pipeline de navegación enriquecido.
     * @param {function} guardFn - async (to, from, context) => boolean | string | object
     */
    static addNavigationGuard(guardFn) {
        if (typeof guardFn === 'function') {
            guardFn._enriched = true;
            this._navigationGuards.push(guardFn);
        }
    }

    /**
     * Registra o reemplaza el guard global de navegación antes de renderizar vistas.
     * Soporta tanto la firma clásica (toView, fromController) como la enriquecida (to, from, context).
     * @param {function} guardFn - async (to, from, context) | (toView, fromController) => boolean | string | object
     */
    static setNavigationGuard(guardFn) {
        this._navigationGuards = [];
        if (typeof guardFn === 'function') {
            const fnStr = guardFn.toString();
            const isEnriched = guardFn.length >= 3 || 
                fnStr.includes('.meta') || 
                fnStr.includes('.params') || 
                fnStr.includes('.query');
            guardFn._enriched = isEnriched;
            this._navigationGuards.push(guardFn);
            this._navigationGuard = guardFn;
        } else {
            this._navigationGuard = null;
        }
    }

    /**
     * Registra un callback global para recibir eventos cuando una navegación es rechazada o cancelada.
     * @param {function} callback - ({ to, from, reason, state, timestamp }) => void
     */
    static onNavigationDenied(callback) {
        if (typeof callback === 'function') {
            this._denialHooks.push(callback);
        }
    }

    /**
     * Dispara los hooks de denegación registrados.
     * @private
     */
    static _triggerNavigationDenied(to, from, reason, state = null) {
        const event = {
            to,
            from,
            reason: reason || 'NAVIGATION_CANCELLED',
            state: state || null,
            timestamp: Date.now()
        };

        this._denialHooks.forEach(hook => {
            try {
                hook(event);
            } catch (err) {
                console.error('[JSForm onNavigationDenied] ❌ Error en subscriber:', err);
            }
        });
    }

    /**
     * Resuelve un identificador de destino (nombre, formulario o path) a un objeto RouteLocation estandarizado.
     * @private
     */
    static _resolveRoute(target, params = null) {
        if (!target) return null;

        let pathOnly = target;
        let queryString = '';
        const queryParams = {};

        if (typeof target === 'string' && target.includes('?')) {
            const parts = target.split('?');
            pathOnly = parts[0];
            queryString = parts[1] || '';
            try {
                const searchParams = new URLSearchParams(queryString);
                for (const [key, val] of searchParams.entries()) {
                    queryParams[key] = val;
                }
            } catch (e) {
                // Ignore parse error
            }
        }

        const cleanKey = typeof pathOnly === 'string' ? pathOnly.replace(/^\/+/, '').toLowerCase() : '';
        const matched = this._routesMap.get(cleanKey);

        const formName = matched ? matched.form : (typeof pathOnly === 'string' ? pathOnly.replace(/^\/+/, '') : target);
        const routeName = matched ? matched.name : formName;
        const routePath = matched ? matched.path : (typeof pathOnly === 'string' && pathOnly.startsWith('/') ? pathOnly : `/${formName}`);
        const routeMeta = matched ? { ...matched.meta } : {};
        const routeTitle = matched ? matched.title : null;

        return {
            name: routeName,
            form: formName,
            path: routePath,
            title: routeTitle,
            meta: routeMeta,
            params: params && typeof params === 'object' ? { ...params } : (params !== null ? { value: params } : {}),
            query: queryParams,
            toString() { return this.form || this.name; },
            valueOf() { return this.form || this.name; }
        };
    }

    /**
     * Ejecuta secuencialmente el pipeline de guardas de navegación.
     * @private
     */
    static async _runGuards(to, from, context) {
        for (const guard of this._navigationGuards) {
            if (context.abortSignal && context.abortSignal.aborted) {
                return { allowed: false, reason: 'NAVIGATION_ABORTED' };
            }

            try {
                let result;
                if (guard._enriched || guard.length >= 3) {
                    result = await guard(to, from, context);
                } else {
                    // Firma clásica retrocompatible: (toView, fromController)
                    result = await guard(to.form || to.name, this._currentController);
                }

                if (context.abortSignal && context.abortSignal.aborted) {
                    return { allowed: false, reason: 'NAVIGATION_ABORTED' };
                }

                // 1. allow === true o undefined -> continúa al siguiente guard
                if (result === true || result === undefined) {
                    continue;
                }

                // 2. allow === false
                if (result === false) {
                    return {
                        allowed: false,
                        reason: 'NAVIGATION_CANCELLED'
                    };
                }

                // 3. string -> Redirección simple
                if (typeof result === 'string') {
                    return {
                        allowed: false,
                        redirect: result,
                        reason: 'REDIRECT'
                    };
                }

                // 4. Objeto de respuesta detallada
                if (typeof result === 'object' && result !== null) {
                    if (result.allow === false || result.allowed === false) {
                        return {
                            allowed: false,
                            redirect: result.redirect || null,
                            reason: result.reason || 'NAVIGATION_DENIED',
                            state: result.state || null
                        };
                    }
                }
            } catch (err) {
                console.error(`[JSForm NavigationGuard] ❌ Excepción no controlada en guard:`, err);
                return {
                    allowed: false,
                    reason: 'GUARD_ERROR',
                    state: { error: err }
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Initializes the application and sets up browser history and bfcache listening.
     */
    static async init() {
        // 0. Inicializar Logger y Sanitización de Seguridad de forma prioritaria (OWASP Top 10)
        Logger.init(this.AppConfig);

        // MEJORA 2: Escuchamos cuando el usuario presiona "Atrás" o "Adelante" en el navegador
        window.addEventListener('popstate', async (event) => {
            if (event.state && (event.state.form || event.state.path)) {
                const targetForm = event.state.form || event.state.path;
                const targetParams = event.state.params || null;
                const targetId = event.state.target || this.AppConfig.router.defaultTarget;

                const to = this._resolveRoute(targetForm, targetParams);
                const from = this._currentRoute;

                // Control de concurrencia y token de cancelación
                if (this._activeNavController) {
                    this._activeNavController.abort();
                }
                const navController = new AbortController();
                this._activeNavController = navController;
                const context = {
                    abortSignal: navController.signal,
                    timestamp: Date.now()
                };

                // 1. Verificación con el Pipeline de Guards
                const guardCheck = await this._runGuards(to, from, context);
                if (context.abortSignal.aborted) return;

                if (!guardCheck.allowed) {
                    this._triggerNavigationDenied(to, from, guardCheck.reason, guardCheck.state);

                    if (guardCheck.redirect) {
                        const redirectRoute = this._resolveRoute(guardCheck.redirect);
                        const redirectPath = redirectRoute?.path || `/${guardCheck.redirect}`;
                        const newUrl = `${this.AppConfig.router.basePath}${redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath}`;
                        console.warn(`[JSForm NavigationGuard] 🛑 Navegación 'Atrás/Adelante' hacia '${to.name}' bloqueada. Redirigiendo a '${guardCheck.redirect}'...`);
                        window.history.replaceState({ form: redirectRoute.form, name: redirectRoute.name, path: redirectPath, target: targetId }, "", newUrl);
                        await this.open(guardCheck.redirect, targetParams);
                        return;
                    }

                    // Si fue denegada/cancelada sin redirección (allow: false), REVERTIR la URL al estado 'from' previo
                    console.warn(`[JSForm NavigationGuard] 🛑 Navegación 'Atrás/Adelante' hacia '${to.name}' cancelada (${guardCheck.reason}). Revirtiendo URL...`);
                    if (from) {
                        const prevPath = from.path || `/${from.form}`;
                        const prevUrl = `${this.AppConfig.router.basePath}${prevPath.startsWith('/') ? prevPath : '/' + prevPath}`;
                        const prevTarget = this._currentViewTargetId || this.AppConfig.router.defaultTarget;
                        window.history.replaceState({ form: from.form, name: from.name, path: prevPath, target: prevTarget, params: from.params }, "", prevUrl);
                    }
                    return;
                }

                const routeInfo = this._routes[to.form];
                if (routeInfo && routeInfo.ControllerClass) {
                    await this.run(to.form, routeInfo.ControllerClass, targetId, targetParams, to, context);
                } else {
                    await this.open(to.form, targetParams);
                }
            }
        });

        // Soporte para navegación basada en Hash (#/mi-ruta)
        window.addEventListener('hashchange', async () => {
            const rawHash = window.location.hash.replace(/^#\/?/, '');
            if (rawHash) {
                const currentName = this._currentRoute?.name?.toLowerCase();
                const currentForm = this._currentRoute?.form?.toLowerCase();
                const currentPath = this._currentRoute?.path?.replace(/^\/+/, '').toLowerCase();
                const targetKey = rawHash.toLowerCase();

                if (currentName !== targetKey && currentForm !== targetKey && currentPath !== targetKey) {
                    await this.open(rawHash);
                }
            }
        });

        // Soporte para bfcache (Back-Forward Cache): si el navegador restaura un snapshot congelado en memoria
        window.addEventListener('pageshow', async (event) => {
            if (event.persisted && this._navigationGuards.length > 0) {
                const currentTarget = window.history.state?.form || window.history.state?.path;
                if (currentTarget) {
                    const to = this._resolveRoute(currentTarget, window.history.state?.params);
                    const context = { abortSignal: (new AbortController()).signal, timestamp: Date.now() };
                    const guardCheck = await this._runGuards(to, null, context);
                    if (!guardCheck.allowed) {
                        this._triggerNavigationDenied(to, null, guardCheck.reason, guardCheck.state);
                        const redirectView = guardCheck.redirect || (this.AppConfig.router?.loginView || 'Login');
                        console.warn(`[JSForm bfcache] 🛑 Restauración de caché bloqueada para '${to.name}'. Redirigiendo a '${redirectView}'...`);
                        const targetId = window.history.state?.target || this.AppConfig.router.defaultTarget;
                        const redirectRoute = this._resolveRoute(redirectView);
                        const redirectPath = redirectRoute?.path || `/${redirectView}`;
                        window.history.replaceState({ form: redirectRoute.form, name: redirectRoute.name, path: redirectPath, target: targetId }, "", `${this.AppConfig.router.basePath}${redirectPath}`);
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
     * Abre y navega a una vista por su nombre o path, ejecutando el pipeline de guards y resolviendo dinámicamente el controlador.
     * @param {string} viewOrPath - El nombre de la vista/formulario o path registrado (ej. 'Dashboard', '/facturacion').
     * @param {object} [parameters=null] - Parámetros opcionales a pasar al controlador.
     * @returns {Promise<object|null>} Instancia del controlador creado.
     */
    static async open(viewOrPath, parameters = null) {
        // Control de concurrencia: cancelar cualquier navegación previa en curso
        if (this._activeNavController) {
            this._activeNavController.abort();
        }
        const navController = new AbortController();
        this._activeNavController = navController;
        const context = {
            abortSignal: navController.signal,
            timestamp: Date.now()
        };

        const to = this._resolveRoute(viewOrPath, parameters);
        const from = this._currentRoute;

        // Ejecutar pipeline de guards de navegación
        const guardCheck = await this._runGuards(to, from, context);
        if (context.abortSignal.aborted) {
            return null;
        }

        if (!guardCheck.allowed) {
            this._triggerNavigationDenied(to, from, guardCheck.reason, guardCheck.state);

            if (guardCheck.redirect) {
                const redirectClean = guardCheck.redirect.replace(/^\/+/, '').toLowerCase();
                const toFormClean = (to.form || '').toLowerCase();
                const toNameClean = (to.name || '').toLowerCase();
                const toPathClean = (to.path || '').replace(/^\/+/, '').toLowerCase();

                if (redirectClean === toFormClean || redirectClean === toNameClean || redirectClean === toPathClean) {
                    console.warn(`[JSForm NavigationGuard] 🛑 Detectado bucle de redirección hacia '${to.name}'. Deteniendo navegación.`);
                    return null;
                }

                console.log(`[JSForm NavigationGuard] 🔄 Redirigiendo navegación de '${to.name}' a '${guardCheck.redirect}'...`);
                return await this.open(guardCheck.redirect, parameters);
            }

            console.warn(`[JSForm NavigationGuard] 🛑 Navegación hacia '${to.name}' denegada (${guardCheck.reason}).`);
            return null;
        }

        const route = this._routes[to.form];
        if (route && route.ControllerClass) {
            return await this.run(to.form, route.ControllerClass, null, parameters, to, context);
        }

        // Resolución dinámica por convención: /app/forms/[View]/[View].controller.js
        const folderName = to.form;
        const fileName = to.form;
        const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);
        const modulePath = `/app/forms/${folderName}/${fileName}.controller.js`;

        try {
            const module = await import(modulePath);
            if (context.abortSignal.aborted) return null;

            const ControllerClass = module[`${classNamePrefix}Controller`];
            if (!ControllerClass) {
                throw new Error(`No se encontró la clase exportada '${classNamePrefix}Controller' en el módulo '${modulePath}'`);
            }
            return await this.run(to.form, ControllerClass, null, parameters, to, context);
        } catch (e) {
            if (context.abortSignal.aborted) return null;
            console.error(`[JSForm] ❌ Error en Application.open('${viewOrPath}'):`, e);
            const target = this._currentViewTargetId || this.AppConfig.router.defaultTarget;
            const rootContainer = document.getElementById(target);
            if (rootContainer) {
                await this._showErrorPage(rootContainer, 510, null, {
                    view: to.form,
                    error: e,
                    modulePath
                });
            }
            return null;
        }
    }

    /**
     * Alias de Application.open para navegación desacoplada SPA.
     * @param {string} viewOrPath - Nombre de la vista o path (ej. 'Login', '/facturacion').
     * @param {object} [parameters=null] - Parámetros a enviar al controlador.
     */
    static async navigate(viewOrPath, parameters = null) {
        return await this.open(viewOrPath, parameters);
    }

    /**
     * Alias de Application.open para compatibilidad con invocaciones tradicionales.
     * @param {string} formName - Nombre de la vista o formulario.
     * @param {object} [parameters=null] - Parámetros a enviar al controlador.
     */
    static async navigateToForm(formName, parameters = null) {
        return await this.open(formName, parameters);
    }

    /**
     * Fetches an HTML view, injects it into the DOM, and instantiates its controller.
     * @param {string} viewName - The name of the view/folder (e.g., 'login').
     * @param {class} ControllerClass - The controller class to instantiate.
     * @param {string} [targetId=null] - The DOM element ID where the HTML will be injected.
     * @param {object} [parameters=null] - Optional data to pass to the controller instance.
     * @param {object} [resolvedRoute=null] - Objeto RouteLocation ya resuelto por open().
     * @param {object} [navContext=null] - Contexto de navegación ({ abortSignal, timestamp }).
     * @returns {Promise<object>} The instantiated controller.
     */
    static async run(viewName, ControllerClass, targetId = null, parameters = null, resolvedRoute = null, navContext = null) {
        // ==========================================
        // 0. VERIFICACIÓN DEL NAVIGATION GUARD
        // Se ejecuta si run fue invocado directamente sin pasar por open()
        // ==========================================
        if (!navContext && this._navigationGuards.length > 0) {
            const to = resolvedRoute || this._resolveRoute(viewName, parameters);
            const from = this._currentRoute;
            const context = { abortSignal: (new AbortController()).signal, timestamp: Date.now() };

            const guardCheck = await this._runGuards(to, from, context);
            if (!guardCheck.allowed) {
                this._triggerNavigationDenied(to, from, guardCheck.reason, guardCheck.state);
                if (guardCheck.redirect) {
                    const target = targetId || this.AppConfig.router.defaultTarget;
                    const redirectRoute = this._resolveRoute(guardCheck.redirect);
                    const redirectPath = redirectRoute?.path || `/${guardCheck.redirect}`;
                    window.history.replaceState({ form: redirectRoute.form, name: redirectRoute.name, path: redirectPath, target }, "", `${this.AppConfig.router.basePath}${redirectPath}`);
                    return await this.open(guardCheck.redirect, parameters);
                }
                console.warn(`[JSForm NavigationGuard] 🛑 Acceso a '${to.name}' denegado por el Navigation Guard.`);
                return null;
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

                const to = this._resolveRoute(requestedView);
                const context = { abortSignal: (new AbortController()).signal, timestamp: Date.now() };

                // Consultar navigation guard antes de restaurar rutas protegidas desde la URL
                if (this._navigationGuards.length > 0) {
                    const guardCheck = await this._runGuards(to, null, context);
                    if (!guardCheck.allowed) {
                        this._triggerNavigationDenied(to, null, guardCheck.reason, guardCheck.state);
                        const redirectView = guardCheck.redirect || viewName;
                        console.warn(`[JSForm NavigationGuard] 🛑 Auto-routing bloqueado para '${to.name}'. Redirigiendo a '${redirectView}'...`);
                        const target = targetId || this.AppConfig.router.defaultTarget;
                        const redirectRoute = this._resolveRoute(redirectView);
                        const redirectPath = redirectRoute?.path || `/${redirectView}`;
                        window.history.replaceState({ form: redirectRoute.form, name: redirectRoute.name, path: redirectPath, target }, "", `${this.AppConfig.router.basePath}${redirectPath}`);
                        return await this.open(redirectView, parameters);
                    }
                }
                
                const folderName = to.form;
                const fileName = to.form;
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
                                this._currentLayoutController = await this._internalRun(layoutConfig.view, LayoutController, null, null, false, true, null, context);
                                this._currentLayout = layoutConfig.view;
                                targetForChildView = layoutConfig.target; // El nuevo target es el contenedor del layout
                            }
                        }

                        // 2. Ahora cargamos la vista solicitada en el target correcto (sea el root o el del layout)
                        console.log(`[JSForm] ✅ Sesión restaurada: Cargando vista '${requestedView}'...`);
                        this.register(to.form, DynamicController); // Registrar para el historial
                        const controller = await this._internalRun(to.form, DynamicController, targetForChildView, parameters, true, false, to, context);
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
                            view: to.form,
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
                    this._currentLayoutController = await this._internalRun(layoutConfig.view, LayoutClass, null, null, false, true, null, navContext);
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
        return await this._internalRun(viewName, ControllerClass, finalTargetId, parameters, true, false, resolvedRoute, navContext);
    }

    /**
     * Internal runner logic to handle history pushing conditionally.
     */
    static async _internalRun(viewName, ControllerClass, targetId, parameters, pushHistory, isLayout = false, resolvedRoute = null, navContext = null) {
        if (navContext?.abortSignal?.aborted) return null;

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
            if (navContext?.abortSignal?.aborted) return null;

            if (!response.ok) {
                const error = new Error(`HTML not found at ${htmlPath}. Status: ${response.status}`);
                error.response = response; // Adjuntamos la respuesta al error
                throw error;
            }
            
            rootContainer.innerHTML = await response.text();
            if (navContext?.abortSignal?.aborted) return null;

            // MEJORA i18n: Aplicar traducciones automáticamente
            i18n.apply(rootContainer);

            // 4. Update browser URL without reloading (History API)
            const route = resolvedRoute || this._resolveRoute(viewName, parameters);
            const routePath = route?.path || `/${viewName}`;
            const newUrl = `${this.AppConfig.router.basePath}${routePath.startsWith('/') ? routePath : '/' + routePath}`;
            if (pushHistory && window.location.pathname !== newUrl) {
                window.history.pushState({ 
                    form: route?.form || viewName, 
                    name: route?.name || viewName, 
                    path: routePath, 
                    target: finalTargetId, 
                    params: route?.params || parameters 
                }, "", newUrl);
            }

            // 5. Update document title based on route title or convention
            if (route && route.title) {
                document.title = `${route.title} - ${this.AppConfig.appName}`;
            } else {
                const classNamePrefix = folderName.charAt(0).toUpperCase() + folderName.slice(1);
                document.title = `${classNamePrefix} - ${this.AppConfig.appName}`;
            }

            // 6. Instantiate and return the controller
            const formInstance = new ControllerClass(parameters);
            
            // Actualizamos nuestra referencia global al nuevo controlador y ruta activa
            if (!isLayout) {
                this._currentController = formInstance;
                this._currentViewTargetId = finalTargetId;
                this._currentRoute = route;
            }
            
            return formInstance;
            
        } catch (error) {
            if (navContext?.abortSignal?.aborted) return null;
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

export { Logger };