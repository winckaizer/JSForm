const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../JSForm-source');
const binDir = path.join(__dirname, '../bin');
const outputFile = path.join(binDir, 'framework-files.json');

console.log('🔄 Empaquetando archivos de JSForm...');
const frameworkFiles = {};

// Asegurarnos de que la carpeta bin exista
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir);
}

// Leer todos los archivos de JSForm-source
const files = fs.readdirSync(sourceDir);

files.forEach(file => {
    const filePath = path.join(sourceDir, file);
    if (fs.statSync(filePath).isFile()) {
        // Detect if file is text or binary to encode it properly
        const isTextFile = ['.js', '.md', '.css', '.html'].some(ext => file.endsWith(ext));
        
        if (isTextFile) {
            frameworkFiles[file] = {
                encoding: 'utf8',
                content: fs.readFileSync(filePath, 'utf8')
            };
        } else {
            // Assume binary and encode as base64
            frameworkFiles[file] = {
                encoding: 'base64',
                content: fs.readFileSync(filePath).toString('base64')
            };
        }
        console.log(`  ✔️ Archivo empaquetado: ${file} (encoding: ${frameworkFiles[file].encoding})`);
    }
});

// Guardar el JSON en la carpeta bin
fs.writeFileSync(outputFile, JSON.stringify(frameworkFiles, null, 2));
console.log(`\n✅ ¡Éxito! Framework actualizado y listo para el instalador.`);