#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Capturamos el comando (init o update) y el nombre del proyecto
const command = process.argv[2];
const projectName = process.argv[3];

// Cargamos el código fuente empaquetado (que ahora incluye codificación base64 para imágenes)
const fwFiles = require('./framework-files.json');

// Mapeamos las rutas usando todo en minúsculas para evitar errores de tipeo
const fileRouting = {
    'compiler.js': 'core/compiler.js',
    'jsform.core.js': 'core/JSForm.Core.js',
    'jsform.state.js': 'core/JSForm.State.js',
    'jsform.control.js': 'core/JSForm.Control.js',
    'jsform.config.js': 'jsform.config.js',
    'program.js': 'app/program.js',
    'jsform-icon.png': 'assets/img/jsform-icon.png',
    'jsform.messagebox.js': 'core/JSForm.MessageBox.js',
    'jsform.messagebox.css': 'assets/css/JSForm.MessageBox.css',
    'jsform.datagridview.js': 'core/JSForm.DataGridView.js',
    'jsform.httpclient.js': 'core/JSForm.HttpClient.js',
    'template.index.html': 'index.html',
    'template.main.css': 'assets/css/main.css',
    'template.jsform-help-me.html': 'jsform-help-me.html'
};

// ==========================================
// COMANDO: jsform init <nombre>
// ==========================================
if (command === 'init') {
    if (!projectName) {
        console.error('❌ Error: Debes especificar el nombre del proyecto.');
        console.log('Uso correcto: jsform init <nombre-del-proyecto>');
        process.exit(1);
    }

    const targetDir = path.join(process.cwd(), projectName);

    // 2. Crear la carpeta principal del proyecto
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
        console.log(`📁 Creando proyecto en: ${targetDir}`);
    } else {
        console.error(`❌ Error: La carpeta '${projectName}' ya existe.`);
        process.exit(1);
    }

    // 3. Crear la estructura de carpetas estándar
    const folders = ['core', 'app', 'app/forms', 'assets', 'assets/css', 'assets/img', 'assets/vendors'];
    folders.forEach(folder => {
        fs.mkdirSync(path.join(targetDir, folder), { recursive: true });
    });

    console.log('⚙️  Instalando núcleo de JSForm...');

    for (const [sourceName, fileData] of Object.entries(fwFiles)) {
        const searchName = sourceName.toLowerCase();
        const relativePath = fileRouting[searchName] || sourceName;
        const destPath = path.join(targetDir, relativePath);

        // Escribimos el archivo decodificando el buffer (soporte para imágenes y texto)
        if (fileData && fileData.content) {
            const buffer = Buffer.from(fileData.content, fileData.encoding || 'utf8');
            fs.writeFileSync(destPath, buffer);
            console.log(`  -> Creado: ${relativePath}`);
        }
    }

    // 5. Crear el package.json DEL NUEVO PROYECTO
    const targetPackageJson = {
        name: projectName.toLowerCase(),
        version: "1.0.0",
        description: "Proyecto generado con JSForm",
        type: "module",
        scripts: {
            "dev": "concurrently \"npm:watch\" \"vite\"",
            "watch": "node core/compiler.js",
            "build": "vite build",
            "preview": "vite preview"
        },
        devDependencies: {
            "cheerio": "^1.0.0-rc.12",
            "chokidar": "^3.5.3",
            "concurrently": "^8.2.2",
            "vite": "^5.0.0"
        }
    };

    fs.writeFileSync(
        path.join(targetDir, 'package.json'), 
        JSON.stringify(targetPackageJson, null, 2)
    );

    // 6.1. Crear el archivo de estilos personalizados para el usuario
    const customCss = `/*
    Este es TU archivo de estilos.
    Las reglas que escribas aquí anularán los estilos por defecto de JSForm.
    Este archivo está a salvo y no será modificado por el comando 'jsform update'.
    
    Ejemplo para cambiar el botón principal del MessageBox a un color verde:
    .jsform-messagebox-button:first-child { background-color: #28a745; border-color: #28a745; }
*/`;
    fs.writeFileSync(path.join(targetDir, 'assets/css/custom-styles.css'), customCss);
    console.log(`  -> Creado: assets/css/custom-styles.css (para tus estilos)`);

    // 6.2. Crear un README en la carpeta de vendors para guiar al usuario
    const vendorsReadme = `## Carpeta de Librerías de Terceros (Vendors)

Aquí puedes colocar librerías externas como jQuery, DataTables, Chart.js, etc.

### Componente DataGridView

El componente \`JSForm.DataGridView\` carga automáticamente los scripts de jQuery y DataTables.js bajo demanda la primera vez que se utiliza.

Para aplicar estilos, ve a \`assets/css/main.css\` y descomenta la línea de importación del CSS de DataTables. Luego, puedes personalizarlo en \`custom-styles.css\`.
`;
    fs.writeFileSync(path.join(targetDir, 'assets/vendors/README.md'), vendorsReadme);
    console.log(`  -> Creado: assets/vendors/README.md (guía para librerías)`);

    console.log(`\n✅ ¡Proyecto '${projectName}' creado!`);

    // 8. Ejecutar npm install automáticamente
    console.log(`\n⚙️  Instalando dependencias con 'npm install'...`);
    console.log('   Esto puede tardar unos momentos.');

    const npmInstall = spawn('npm', ['install'], {
        cwd: targetDir, 
        stdio: 'inherit', 
        shell: true 
    });

    npmInstall.on('close', (code) => {
        if (code === 0) {
            console.log(`\n✅ ¡Instalación completada!`);
            console.log(`\n🚀 ¡Todo listo para empezar!`);
            console.log(`\n   - Para desarrollar:  cd ${projectName} && npm run dev`);
            console.log(`   - Para compilar para producción: npm run build`);
            console.log(`     (El resultado estará en la carpeta 'dist')\n`);
        } else {
            console.error(`\n❌ Error durante 'npm install'. Código de salida: ${code}`);
            console.log('   Por favor, ejecuta los siguientes comandos manualmente:');
            console.log(`     cd ${projectName}`);
            console.log(`     npm install`);
        }
    });
}

// ==========================================
// COMANDO: jsform update
// ==========================================
else if (command === 'update') {
    console.log('🔄 Actualizando el motor de JSForm...');
    const targetDir = process.cwd(); 

    // Verificación de seguridad
    if (!fs.existsSync(path.join(targetDir, 'core'))) {
        console.error('❌ Error: No se detectó la carpeta "core". Asegúrate de estar en la raíz de tu proyecto JSForm.');
        process.exit(1);
    }

    // LISTA BLANCA DE ACTUALIZACIÓN (Protegemos configuración y vistas)
    const safeToUpdate = [
        'compiler.js', 
        'jsform.core.js', 
        'jsform.state.js', 
        'jsform.control.js',
        'jsform.messagebox.js', // Añadido para futuras actualizaciones
        'jsform.messagebox.css', // Añadido para futuras actualizaciones
        'jsform.datagridview.js', // Añadido para futuras actualizaciones
        'jsform.httpclient.js' // Añadido para futuras actualizaciones
    ];
    let updatedCount = 0;

    for (const [sourceName, fileData] of Object.entries(fwFiles)) {
        const searchName = sourceName.toLowerCase();
        
        if (safeToUpdate.includes(searchName) && fileData && fileData.content) {
            const relativePath = fileRouting[searchName] || `core/${sourceName}`;
            const destPath = path.join(targetDir, relativePath);
            
            const buffer = Buffer.from(fileData.content, fileData.encoding || 'utf8');
            fs.writeFileSync(destPath, buffer);
            console.log(`  -> Actualizado: ${relativePath}`);
            updatedCount++;
        }
    }
    
    if (updatedCount > 0) {
        console.log('\n✅ ¡Framework actualizado con éxito! Tus vistas y configuraciones están intactas.');
    } else {
        console.log('\n⚠️ No se encontraron archivos del core para actualizar.');
    }
}

// ==========================================
// COMANDO NO RECONOCIDO O VACÍO
// ==========================================
else {
    console.log('🖥️  JSForm CLI - Winckaizer Edition');
    console.log('=================================');
    console.log('Comandos disponibles:');
    console.log('  jsform init <nombre>  -> Crea un proyecto nuevo con servidor local y auto-recarga');
    console.log('  jsform update         -> Actualiza los archivos core del proyecto actual de forma segura');
}