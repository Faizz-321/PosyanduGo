const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

// Replace Rose/Carnation Pink with Hot/Bright Pink
css = css.replace(/#f43f5e/g, '#ff69b4'); // Rose to Hot Pink
css = css.replace(/#e11d48/g, '#ff1493'); // Hover Rose to Deep Pink
css = css.replace(/#fff1f2/g, '#fdf2f8'); // Light Rose to Light Pink
css = css.replace(/244, 63, 94/g, '255, 105, 180'); // rgba Rose to rgba Hot Pink
css = css.replace(/#fb7185/g, '#ff1493'); // Carnation to Bright Pink

fs.writeFileSync('style.css', css, 'utf8');
console.log('CSS Colors Updated to Hot Pink & Bright Pink!');
