// File: core/JSForm.HttpClient.js
import Config from '../jsform.config.js';

/**
 * Un cliente HTTP robusto para realizar peticiones a APIs.
 * Inspirado en la simplicidad de jQuery.ajax pero usando fetch y Promises.
 */
export class HttpClient {

    /**
     * Realiza una petición GET.
     * @param {string} endpoint - El endpoint de la API (ej. '/users').
     * @param {object} [options] - Opciones de la petición, incluyendo callbacks.
     */
    static get(endpoint, options = {}) {
        return this._request('GET', endpoint, null, options);
    }

    /**
     * Realiza una petición POST.
     * @param {string} endpoint - El endpoint de la API.
     * @param {object} data - El objeto de datos a enviar en el body.
     * @param {object} [options] - Opciones de la petición, incluyendo callbacks.
     */
    static post(endpoint, data, options = {}) {
        return this._request('POST', endpoint, data, options);
    }

    /**
     * Realiza una petición PUT.
     * @param {string} endpoint - El endpoint de la API.
     * @param {object} data - El objeto de datos a enviar en el body.
     * @param {object} [options] - Opciones de la petición, incluyendo callbacks.
     */
    static put(endpoint, data, options = {}) {
        return this._request('PUT', endpoint, data, options);
    }

    /**
     * Realiza una petición DELETE.
     * @param {string} endpoint - El endpoint de la API.
     * @param {object} [options] - Opciones de la petición, incluyendo callbacks.
     */
    static delete(endpoint, options = {}) {
        return this._request('DELETE', endpoint, null, options);
    }

    static _globalErrorHandler = null;
    static _validateResponse = null;

    /**
     * Registra un manejador global de errores en tiempo de ejecución.
     * @param {function} handler - (error, status, data, context) => boolean|void. Retornar true indica que el error fue resuelto y previene el callback local de error.
     */
    static setGlobalErrorHandler(handler) {
        HttpClient._globalErrorHandler = typeof handler === 'function' ? handler : null;
    }

    /**
     * Registra un validador global de respuestas en tiempo de ejecución.
     * Permite inspeccionar respuestas con HTTP 200 que contienen errores de negocio en el payload (ej. { success: false, code: 401 }).
     * @param {function} validator - (data, response, context) => Error|string|null. Si retorna un Error o string, se trata como fallo.
     */
    static setResponseValidator(validator) {
        HttpClient._validateResponse = typeof validator === 'function' ? validator : null;
    }

    /**
     * Método privado que gestiona toda la lógica de la petición.
     * @private
     */
    static async _request(method, endpoint, data, options) {
        const { 
            beforeSend, 
            success, 
            error, 
            complete, 
            headers: customHeaders, 
            api: apiKey = 'default',
            skipGlobalError = false,
            forceLocalError = false,
            validateResponse: localValidator,
            errorHandler: localErrorHandler,
            ...fetchExtras 
        } = options;

        // 1. Determinar la configuración de API a usar
        let apiConfig = Config.api?.[apiKey];

        // Soporte para la configuración antigua (plana) para no romper proyectos existentes
        if (!apiConfig && apiKey === 'default' && Config.api?.baseUrl) {
            console.warn('[HttpClient] Estás usando una configuración de API obsoleta. Considera actualizar jsform.config.js a la nueva estructura con claves (ej. "default").');
            apiConfig = {
                baseUrl: Config.api.baseUrl,
                timeout: Config.api.timeout
            };
        }

        // Ejecutar beforeSend si existe (ideal para mostrar un spinner)
        if (typeof beforeSend === 'function') {
            beforeSend();
        }

        // Si después de todo no tenemos config, es un error.
        if (!apiConfig) {
            const err = new Error(`La configuración para la API '${apiKey}' no se encontró en jsform.config.js`);
            if (typeof error === 'function') error(err); else console.error(err);
            if (typeof complete === 'function') complete();
            return null;
        }

        // 2. Configurar AbortController para el timeout usando la config de la API seleccionada
        const controller = new AbortController();
        const timeout = options.timeout || apiConfig.timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // 3. Construir la petición
            const url = `${apiConfig.baseUrl}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json',
                ...(apiConfig.headers || {}),
                ...customHeaders
            };
            const fetchOptions = {
                method,
                headers,
                signal: controller.signal,
                ...fetchExtras // Permite pasar opciones extra como 'credentials', 'mode', etc.
            };
            if (data) {
                fetchOptions.body = JSON.stringify(data);
            }

            // 4. Realizar la petición fetch
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // 5. Procesar la respuesta
            const responseData = await response.json().catch(() => null);

            // 6. Validar respuesta de negocio si existe un validador configurado
            const responseValidator = localValidator 
                || apiConfig.validateResponse 
                || HttpClient._validateResponse 
                || Config.api?.validateResponse;

            let businessError = null;
            if (typeof responseValidator === 'function') {
                businessError = responseValidator(responseData, response, { method, endpoint, apiKey, options });
            }

            if (response.ok && !businessError) {
                if (typeof success === 'function') {
                    success(responseData, response.status, response);
                }
                return responseData;
            } else {
                let err;
                if (businessError instanceof Error) {
                    err = businessError;
                } else if (businessError) {
                    err = new Error(typeof businessError === 'string' ? businessError : (responseData?.message || 'Error de API / Negocio'));
                } else {
                    err = new Error(response.statusText || 'API Error');
                }

                err.response = response;
                err.data = responseData;
                err.status = businessError ? (businessError.status || responseData?.status || responseData?.code || response.status || 400) : response.status;
                throw err;
            }
        } catch (err) {
            // 7. Manejar errores (de red, timeout, HTTP o de negocio)
            const status = err.status || err.response?.status || 0;
            const data = err.data;
            let handledGlobally = false;

            const context = { method, endpoint, apiKey, options, response: err.response };

            // Resolver el manejador global (por orden: localErrorHandler -> apiConfig.errorHandler -> HttpClient._globalErrorHandler -> Config.api.globalErrorHandler)
            const globalHandler = localErrorHandler 
                || apiConfig.errorHandler 
                || HttpClient._globalErrorHandler 
                || Config.api?.globalErrorHandler;

            if (!skipGlobalError && typeof globalHandler === 'function') {
                try {
                    const result = globalHandler(err, status, data, context);
                    // Si el manejador retorna true explícitamente, se considera consumido/resuelto
                    if (result === true) {
                        handledGlobally = true;
                    }
                } catch (handlerErr) {
                    console.error('[HttpClient] Error dentro de globalErrorHandler:', handlerErr);
                }
            }

            // Si no fue consumido globalmente, o si se especificó forceLocalError, invocar callback de error local
            if (typeof error === 'function') {
                if (!handledGlobally || forceLocalError) {
                    error(err, status, data, handledGlobally);
                }
            } else if (!handledGlobally && !skipGlobalError) {
                // Fallback a la consola si nadie lo manejó
                console.error(`[HttpClient Error] [${method} ${endpoint}] Status: ${status}`, err);
            }

            return null;
        } finally {
            // 8. Ejecutar complete si existe (ideal para ocultar el spinner)
            if (typeof complete === 'function') {
                complete();
            }
        }
    }
}