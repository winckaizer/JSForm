const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'jsform-source');
const targetFile = path.join(__dirname, '..', 'bin', 'framework-files.json');

const filesToBundle = [
    'compiler.js',
    'JSForm.Core.js',
    'JSForm.state.js',
    'JSForm.Control.js',
    'JSForm.config.js',
    'JSForm.i18n.js',
    'program.js',
    'jsform-icon.png',
    'JSForm.MessageBox.js',
    'JSForm.MessageBox.css',
    'JSForm.DataGridView.js',
    'JSForm.HttpClient.js',
    'template.index.html',
    'template.main.css',
    'template.jsform-help-me.html',
    '400.html',
    '404.html',
    '500.html'
];

const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico'];
const frameworkFiles = {};

console.log('📦 Empaquetando archivos del framework...');

filesToBundle.forEach(fileName => {
    const filePath = path.join(sourceDir, fileName);
    if (fs.existsSync(filePath)) {
        const fileExt = path.extname(fileName).toLowerCase();
        const isBinary = binaryExtensions.includes(fileExt);

        const content = fs.readFileSync(filePath);
        const encoding = isBinary ? 'base64' : 'utf8';

        frameworkFiles[fileName] = {
            encoding: encoding,
            content: content.toString(encoding)
        };
        console.log(`  -> Añadido: ${fileName} (como ${encoding})`);
    } else {
        console.warn(`  -> ⚠️  Aviso: Archivo no encontrado, se omitirá: ${fileName}`);
    }
});

fs.writeFileSync(targetFile, JSON.stringify(frameworkFiles, null, 2));

console.log(`\n✅ Framework empaquetado con éxito en ${targetFile}`);