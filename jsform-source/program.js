// File: app/program.js
import { Application } from '../core/JSForm.Core.js';

class Program {
    static async main() {
        console.log("🚀 JSForm Application started.");

        // 1. Inicializamos el núcleo del framework (Activa el Router y el History API)
        Application.init();
        
        // 2. Pantalla de bienvenida por defecto (Placeholder)
        const root = document.getElementById('app-root');
        if (root) {
            root.innerHTML = `<div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>Welcome to JSForm Framework</h1>
                <p>Your WinForms-style architecture is ready.</p>
                <p style="color: gray;">Go to <b>app/forms</b> and create a new folder to start.</p>
            </div>`;
        }

        // ==========================================
        // PUNTO DE ARRANQUE REAL
        // Aquí es donde lanzarás tu primer formulario, equivalente a: 
        // Application.Run(new Form1()); en WinForms.
        // ==========================================
        
        // Ejemplo de cómo se verá cuando crees tu módulo de Login:
        // import { LoginController } from './forms/Login/login.controller.js';
        // await Application.run('login', LoginController);
    }
}

// Ejecutamos el método principal al cargar el script
Program.main();