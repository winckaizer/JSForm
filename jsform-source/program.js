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
        // PUNTO DE ARRANQUE REAL
        // Aquí es donde lanzarás tu primer formulario, equivalente a: 
        // Application.Run(new Form1()); en WinForms.
        // ==========================================

        // Opcional: Registrar un Navigation Guard (Middleware de seguridad para rutas y botón Atrás):
        // Application.setNavigationGuard(async (toView, fromController) => {
        //     const publicViews = ['Login', 'Register'];
        //     const isAuthenticated = !!localStorage.getItem('auth_token');
        //     if (!publicViews.includes(toView) && !isAuthenticated) {
        //         return 'Login'; // Redirige automáticamente antes de tocar el DOM
        //     }
        //     return true;
        // });
        
        // Navegar a tu vista inicial (usando Application.open por nombre o Application.run con la clase):
        // await Application.open('Login');
        // o:
        // import { LoginController } from './forms/Login/login.controller.js';
        // await Application.run('login', LoginController);
    }
}

// Ejecutamos el método principal al cargar el script
Program.main();