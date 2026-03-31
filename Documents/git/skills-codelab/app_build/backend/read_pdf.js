const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const filePath = path.join(__dirname, '../../MANUAL WM .pdf');
console.log('Ruta:', filePath);

try {
    const dataBuffer = fs.readFileSync(filePath);
    pdf(dataBuffer).then(function(data) {
        console.log("Texto Extraído (primeros 1000 cars):");
        console.log(data.text.substring(0, 1000));
    }).catch(e => console.error("PDF-PARSE Error", e));
} catch(e) {
    console.error("File Read Error:", e);
}
