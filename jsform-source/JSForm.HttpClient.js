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

    /**
     * Método privado que gestiona toda la lógica de la petición.
     * @private
     */
    static async _request(method, endpoint, data, options) {
        const { beforeSend, success, error, complete, headers: customHeaders, api: apiKey = 'default' } = options;

        // 1. Determinar la configuración de API a usar
        let apiConfig = Config.api[apiKey];

        // Soporte para la configuración antigua (plana) para no romper proyectos existentes
        if (!apiConfig && apiKey === 'default' && Config.api.baseUrl) {
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
            return;
        }

        // 2. Configurar AbortController para el timeout usando la config de la API seleccionada
        const controller = new AbortController();
        const timeout = apiConfig.timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // 3. Construir la petición
            const url = `${apiConfig.baseUrl}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json',
                ...customHeaders
            };
            const fetchOptions = {
                method,
                headers,
                signal: controller.signal
            };
            if (data) {
                fetchOptions.body = JSON.stringify(data);
            }

            // 4. Realizar la petición fetch
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // 5. Procesar la respuesta
            const responseData = await response.json().catch(() => null);
            if (response.ok) {
                if (typeof success === 'function') {
                    success(responseData, response.status, response);
                }
            } else {
                const err = new Error(response.statusText || 'API Error');
                err.response = response;
                err.data = responseData;
                throw err;
            }
        } catch (err) {
            // 6. Manejar errores (de red, timeout, o de la API)
            if (typeof error === 'function') {
                error(err, err.response?.status, err.data);
            } else {
                console.error('[HttpClient] Error:', err);
            }
        } finally {
            // 7. Ejecutar complete si existe (ideal para ocultar el spinner)
            if (typeof complete === 'function') {
                complete();
            }
        }
    }
}