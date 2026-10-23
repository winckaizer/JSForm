// File: app/program.js
import { Application } from '../core/JSForm.Core.js';

class Program {
    static async main() {
        console.log("🚀 JSForm Application started.");

        // 1. Inicializamos el núcleo del framework (Router, History API, i18n, etc.)
        await Application.init();
        
        // 2. Pantalla de bienvenida por defecto (Placeholder)
        const root = document.getElementById('app-root');
        if (root) {
            root.innerHTML = `<div style="font-family: sans-serif; text-align: center; margin-top: 50px;" data-i18n-container>
                <h1 data-i18n="welcome_title"></h1>
                <p data-i18n="welcome_subtitle"></p>
                <p data-i18n="welcome_instruction" style="color: gray;"></p>
            </div>`;
        }

        // ==========================================
        // CONFIGURACIÓN DE RUTAS Y SEGURIDAD (Opcional)
        // ==========================================
        
        // 1. Catálogo declarativo de rutas con metadatos:
        // Application.registerRoutes([
        //     { name: 'Login', path: '/login', form: 'Login', title: 'Iniciar Sesión', meta: { requiresAuth: false } },
        //     { name: 'Dashboard', path: '/dashboard', form: 'Dashboard', title: 'Panel Principal', meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'USER'] } },
        //     { name: 'Facturacion', path: '/facturacion', form: 'Facturacion', title: 'Facturación', meta: { requiresAuth: true, requiredModule: 'FACTURACION' } },
        //     { name: 'AccesoDenegado', path: '/403', form: 'AccesoDenegado', title: 'Acceso Denegado' }
        // ]);

        // 2. Suscribirse a intentos de navegación denegados:
        // Application.onNavigationDenied((event) => {
        //     console.warn(`[Seguridad] Acceso denegado a ${event.to.name}. Razón: ${event.reason}`);
        // });

        // 3. Pipeline de Navigation Guards Enriquecidos (con cancelación y metadatos):
        // Application.addNavigationGuard(async (to, from, context) => {
        //     if (to.meta?.requiresAuth && !localStorage.getItem('auth_token')) {
        //         return { allow: false, redirect: 'Login', reason: 'UNAUTHENTICATED' };
        //     }
        //     return true;
        // });

        // Navegar a tu vista inicial (usando Application.open por nombre o path):
        // await Application.open('Login');
        // o con la clase directamente:
        // import { LoginController } from './forms/Login/login.controller.js';
        // await Application.run('login', LoginController);
    }
}

// Ejecutamos el método principal al cargar el script
Program.main();