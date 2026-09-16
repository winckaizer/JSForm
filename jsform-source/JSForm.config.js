// File: jsform.config.js

/**
 * JSForm Global Configuration
 * Centraliza los parámetros de la aplicación, el enrutador y el entorno.
 * Los desarrolladores deben modificar este archivo para ajustar el framework a su proyecto.
 */
export default {
    // ==========================================
    // 1. INFORMACIÓN DE LA APLICACIÓN
    // ==========================================
    appName: 'Mi Proyecto JSForm',  // Se usará para el <title> del navegador
    version: '1.0.0',
    environment: 'development',     // 'development' activa logs extra, 'production' los silencia

    // ==========================================
    // 2. CONFIGURACIÓN DEL ENRUTADOR (SPA)
    // ==========================================
    router: {
        // ID del elemento HTML principal donde se inyectarán todas las vistas
        defaultTarget: 'app-root',
        
        // Carpeta base de la URL (útil si la app se sube a un subdirectorio como /mi-app/)
        // Dejar vacío si está en la raíz del dominio.
        basePath: '', 
    },

    // ==========================================
    // 3. CONEXIONES Y SERVICIOS (Opcional)
    // ==========================================
    api: {
        // Configuración de API por defecto. Se usará si no se especifica otra.
        // TIP: Para evitar CORS en desarrollo, usa una ruta relativa (ej. '/api') 
        // y asegúrate de tener el proxy configurado en vite.config.js
        default: {
            baseUrl: 'http://localhost:3000/api', 
            timeout: 5000 
        },
        // Ejemplo de otra API. Úsala con HttpClient.get('/users', { api: 'jsonPlaceholder' })
        jsonPlaceholder: {
            baseUrl: 'https://jsonplaceholder.typicode.com',
            timeout: 8000
        },

        // Manejador global de errores (se ejecuta en todas las peticiones)
        // Permite controlar sesión vencida (401), errores de servidor o variables devueltas por el backend.
        // Si retorna 'true', el error se considera resuelto y no se dispara el callback local 'error'.
        globalErrorHandler: (error, status, data, context) => {
            console.error(`[HttpClient Global Error] [${context.method} ${context.endpoint}] Status: ${status}`, data || error);

            // Ejemplo: Controlar sesión vencida (HTTP 401 o flag devuelto por el backend)
            if (status === 401 || data?.code === 401 || data?.sessionExpired) {
                console.warn('[HttpClient] Sesión expirada o no autorizada. Redirigiendo al Login...');
                // Application.navigate('Login'); // o window.location.hash = '#/Login';
                return true; // Retorna true si ya manejaste la acción globalmente
            }

            // Ejemplo: Controlar modo mantenimiento
            if (status === 503 || data?.maintenance) {
                console.warn('[HttpClient] Sistema en mantenimiento.');
                return true;
            }
        },

        // Opcional: Validador/Interceptor global para respuestas con HTTP 200 pero que contienen errores en el JSON
        // (ejemplo: { success: false, code: 401, message: "Token vencido" })
        validateResponse: (data, response, context) => {
            if (data && data.success === false) {
                const err = new Error(data.message || 'Error en respuesta de negocio');
                err.status = data.code || data.status || 400;
                err.data = data;
                return err; // Al retornar un Error, HttpClient lo enruta automáticamente al globalErrorHandler
            }
            return null; // Todo correcto
        }
    },

    // ==========================================
    // 4. PREFERENCIAS DE INTERFAZ
    // ==========================================
    ui: {
        theme: 'light', // Preparado para un futuro soporte de temas (Dark/Light)
        defaultLanguage: 'es',

        i18n: {
            path: '/app/i18n' // Ruta a la carpeta con los archivos de idioma (ej. es.json, en.json)
        }
    }
};