const ExcelJS = require('exceljs');

async function createTemplates() {
    const templates = [
        'template_Ibu_Hamil.xlsx',
        'template_Bayi_Balita.xlsx',
        'template_Sekolah_Remaja.xlsx',
        'template_Dewasa_Lansia.xlsx',
        'template_Lansia_SKILAS.xlsx'
    ];

    for (const filename of templates) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sheet1');
        
        // Buat satu sel agar file tidak benar-benar kosong
        sheet.getCell('A1').value = 'TEMPLATE: ' + filename;
        
        await workbook.xlsx.writeFile(filename);
        console.log('Berhasil membuat file:', filename);
    }
}

createTemplates();
