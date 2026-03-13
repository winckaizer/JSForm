// core/JSForm.Core.js
import Config from '../jsform.config.js';

/**
 * Main Application class responsible for rendering views and handling routing.
 * Follows a Single Page Application (SPA) architecture.
 */
export class Application {
    
    static AppConfig = Config;
    
    // MEJORA 1: Guardamos una referencia al controlador actual
    static _currentController = null;
    
    // MEJORA 3: Un mapa simple para saber qué controlador va con qué ruta (útil para el botón 'Atrás')
    static _routes = {};

    /**
     * Initializes the application and sets up browser history listening.
     */
    static init() {
        // MEJORA 2: Escuchamos cuando el usuario presiona "Atrás" o "Adelante" en el navegador
        window.addEventListener('popstate', async (event) => {
            if (event.state && event.state.form) {
                const routeInfo = this._routes[event.state.form];
                if (routeInfo) {
                    // Volvemos a cargar la vista anterior pero sin empujarla al historial de nuevo
                    await this._internalRun(event.state.form, routeInfo.ControllerClass, event.state.target, null, false);
                }
            }
        });
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
        // Registramos la ruta por si el usuario usa el botón "Atrás" luego
        this.register(viewName, ControllerClass);
        return await this._internalRun(viewName, ControllerClass, targetId, parameters, true);
    }

    /**
     * Internal runner logic to handle history pushing conditionally.
     */
    static async _internalRun(viewName, ControllerClass, targetId, parameters, pushHistory) {
        try {
            // MEJORA 1 (Destrucción): Si hay un controlador activo, le avisamos que va a morir
            if (this._currentController && typeof this._currentController.onDestroy === 'function') {
                this._currentController.onDestroy();
                console.log(`[JSForm] 🧹 Cleaned up previous controller.`);
            }

            // 1. Resolve the target container
            const finalTargetId = targetId || this.AppConfig.router.defaultTarget;
            const rootContainer = document.getElementById(finalTargetId);
            
            if (!rootContainer) {
                console.error(`[JSForm] ❌ Error: Target container '#${finalTargetId}' not found.`);
                return null;
            }

            rootContainer.innerHTML = "<div style='padding: 20px;'>Loading interface...</div>";

            // 2. Resolve view paths (assumes /app/forms/Folder/file.html structure)
            const folderName = viewName.charAt(0).toUpperCase() + viewName.slice(1);
            const fileName = viewName.toLowerCase();
            const htmlPath = `/app/forms/${folderName}/${fileName}.html`;

            // 3. Fetch and inject HTML markup
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`HTML not found at ${htmlPath}`);
            
            rootContainer.innerHTML = await response.text();

            // 4. Update browser URL without reloading (History API)
            const newUrl = `${this.AppConfig.router.basePath}/${fileName}`;
            if (pushHistory && window.location.pathname !== newUrl) {
                window.history.pushState({ form: viewName, target: finalTargetId }, "", newUrl);
            }

            // 5. Update document title based on global config
            document.title = `${folderName} - ${this.AppConfig.appName}`;

            // 6. Instantiate and return the controller
            const formInstance = new ControllerClass(parameters);
            
            // Actualizamos nuestra referencia global al nuevo controlador
            this._currentController = formInstance;
            
            return formInstance;
            
        } catch (error) {
            console.error(`[JSForm] ❌ Failed to load '${viewName}':`, error);
        }
    }
}