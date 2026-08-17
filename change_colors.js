const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Colors
css = css.replace(/#0d9488/g, '#f43f5e'); // Teal to Rose
css = css.replace(/#0f766e/g, '#e11d48'); // Hover Teal to Hover Rose
css = css.replace(/#f0fdfa/g, '#fff1f2'); // Light Teal to Light Rose
css = css.replace(/13, 148, 136/g, '244, 63, 94'); // rgba Teal to rgba Rose

// Gradients
css = css.replace(/#0284c7/g, '#fb7185'); // Blue gradient end to Carnation Pink
css = css.replace(/#14b8a6/g, '#fb7185'); // Active item gradient end to Carnation Pink

fs.writeFileSync('style.css', css, 'utf8');
console.log('CSS Colors Updated to Pink!');
