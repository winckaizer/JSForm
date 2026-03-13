const fs = require('fs');
const path = require('path');

console.log('📦 Empaquetando el framework JSForm...');

const sourceDir = path.join(__dirname, '..', 'jsform-source');
const targetFile = path.join(__dirname, '..', 'bin', 'framework-files.json');

// Lista de archivos a empaquetar.
// Estos nombres deben coincidir con los de la carpeta jsform-source
const filesToPack = [
    'compiler.js',
    'JSForm.core.js',
    'JSForm.state.js',
    'JSForm.Control.js',
    'JSForm.config.js',
    'program.js',
    'jsform-icon.png', // Archivo binario
    'JSForm.MessageBox.js',
    'JSForm.MessageBox.css',
    'JSForm.DataGridView.js',
    'JSForm.HttpClient.js',
    'template.index.html',
    'template.main.css',
    'template.jsform-help-me.html'
];

const frameworkData = {};

filesToPack.forEach(fileName => {
    const filePath = path.join(sourceDir, fileName);
    if (fs.existsSync(filePath)) {
        const isBinary = path.extname(fileName).toLowerCase() === '.png';
        const encoding = isBinary ? 'base64' : 'utf8';
        const content = fs.readFileSync(filePath, { encoding });

        frameworkData[fileName] = { encoding, content };
        console.log(`  -> Añadido: ${fileName} (codificación: ${encoding})`);
    } else {
        console.warn(`  -> ⚠️  Advertencia: No se encontró el archivo ${fileName}`);
    }
});

// Escribir el JSON final
fs.writeFileSync(targetFile, JSON.stringify(frameworkData, null, 2));

console.log(`\n✅ ¡Empaquetado completado! El archivo ${path.basename(targetFile)} ha sido actualizado.`);