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

        // MEJORA SUGERIDA: Añadir un manejador de errores global
        globalErrorHandler: (error, status, data) => {
            console.error(`[HttpClient Global Error] Status: ${status}`, error);
            // Por ejemplo, podrías usar MessageBox aquí para mostrar un error estándar
            // import { MessageBox } from './core/JSForm.MessageBox.js';
            // MessageBox.show('Error de Conexión', 'No se pudo completar la petición.');
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