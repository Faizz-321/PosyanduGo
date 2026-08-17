const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Add `format` to query destructuring
code = code.replace(/const { kategori, tahun } = req.query;/g, "const { kategori, tahun, format } = req.query;\n    const isJson = format === 'json';\n    const previewData = [];\n    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];");

// 2. We don't need to load the workbook if format === 'json' (Wait, we can just load it anyway for simplicity, it's fast enough. But better to skip).
// Let's replace the workbook loading part:
const workbookLoading = `        const templatePath = path.join(__dirname, templateFile);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).send(\`Template file \${templateFile} belum dibuat oleh admin.\`);
        }

        const workbook = new excel.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];`;

const newWorkbookLoading = `        let workbook, worksheet;
        if (!isJson) {
            const templatePath = path.join(__dirname, templateFile);
            if (!fs.existsSync(templatePath)) {
                return res.status(404).send(\`Template file \${templateFile} belum dibuat oleh admin.\`);
            }
            workbook = new excel.Workbook();
            await workbook.xlsx.readFile(templatePath);
            worksheet = workbook.worksheets[0];
        }`;
code = code.replace(workbookLoading, newWorkbookLoading);

// 3. For Ibu Hamil
const hamilExcel = `                worksheet.getCell('B' + rowIdx).value = sasaranHamil;`;
const hamilJson = `                if (isJson) {
                    previewData.push({
                        "Bulan": monthNames[month - 1],
                        "Sasaran Ibu Hamil": sasaranHamil,
                        "Hamil Nifas": 0,
                        "Datang Hamil": datangHamil,
                        "Datang Nifas": 0,
                        "Tidak Datang Hamil": tidakDatangHamil,
                        "Tidak Datang Nifas": 0,
                        "BB Naik (Sesuai KIA)": bb_hijau,
                        "BB Kurang": bb_merah,
                        "LiLA > 23.5": lila_hijau,
                        "LiLA KEK": lila_merah,
                        "TD Normal": td_hijau,
                        "TD Masalah": td_merah,
                        "Gejala TBC": tbc,
                        "Diberikan TTD": dapat_ttd,
                        "Konsumsi TTD": ttd_ya,
                        "Tidak Konsumsi TTD": ttd_tidak,
                        "Dapat PMT": dapat_pmt,
                        "Konsumsi PMT": pmt_ya,
                        "Tidak Konsumsi PMT": pmt_tidak,
                        "Ikut Kelas Bumil": kelas_ya,
                        "Tidak Ikut Kelas": kelas_tidak,
                        "Edukasi": edukasi,
                        "Rujuk": rujuk
                    });
                } else {
                worksheet.getCell('B' + rowIdx).value = sasaranHamil;`;
code = code.replace(hamilExcel, hamilJson);

// Close the else block for Ibu Hamil Excel
code = code.replace(/worksheet\.getCell\('AC' \+ rowIdx\)\.value = 0; \/\/ Rujuk Nifas/g, "worksheet.getCell('AC' + rowIdx).value = 0; // Rujuk Nifas\n                }");

// 4. For Sekolah & Remaja
const sekolahExcel = `                worksheet.getCell('B' + rowIdx).value = sasaranSD;`;
const sekolahJson = `                if (isJson) {
                    previewData.push({
                        "Bulan": monthNames[month - 1],
                        "Sasaran SD": sasaranSD,
                        "Sasaran SMP": sasaranSMP,
                        "Sasaran SMA": sasaranSMA,
                        "Datang L": total_datang_l,
                        "Datang P": total_datang_p,
                        "Anemia L": anemia_l,
                        "Anemia P": anemia_p,
                        "Tidak Anemia L": normal_l,
                        "Tidak Anemia P": normal_p,
                        "Dapat TTD (P)": ttd_dapat_p,
                        "Konsumsi TTD (P)": ttd_konsumsi_p,
                        "Gizi Normal L": gizi_normal_l,
                        "Gizi Normal P": gizi_normal_p,
                        "Gizi Buruk/Lebih L": gizi_buruk_l,
                        "Gizi Buruk/Lebih P": gizi_buruk_p,
                        "TD Normal L": td_normal_l,
                        "TD Normal P": td_normal_p,
                        "TD Masalah L": td_masalah_l,
                        "TD Masalah P": td_masalah_p,
                        "Gejala TBC L": tbc_l,
                        "Gejala TBC P": tbc_p,
                        "Karies L": karies_l,
                        "Karies P": karies_p,
                        "Penglihatan Normal L": mata_normal_l,
                        "Penglihatan Normal P": mata_normal_p,
                        "Mata Masalah L": mata_masalah_l,
                        "Mata Masalah P": mata_masalah_p,
                        "Pendengaran Normal L": telinga_normal_l,
                        "Pendengaran Normal P": telinga_normal_p,
                        "Telinga Masalah L": telinga_masalah_l,
                        "Telinga Masalah P": telinga_masalah_p,
                        "Edukasi L": edukasi_l,
                        "Edukasi P": edukasi_p,
                        "Rujuk L": rujuk_l,
                        "Rujuk P": rujuk_p
                    });
                } else {
                worksheet.getCell('B' + rowIdx).value = sasaranSD;`;
code = code.replace(sekolahExcel, sekolahJson);

code = code.replace(/worksheet\.getCell\('AJ' \+ rowIdx\)\.value = rujuk_p;/g, "worksheet.getCell('AJ' + rowIdx).value = rujuk_p;\n                }");

// 5. For Dewasa & Lansia
const dewasaExcel = `                worksheet.getCell('B' + rowIdx).value = sasaranDewasa;`;
const dewasaJson = `                if (isJson) {
                    previewData.push({
                        "Bulan": monthNames[month - 1],
                        "Sasaran Dewasa": sasaranDewasa,
                        "Sasaran Lansia": sasaranLansia,
                        "Datang Dewasa L": datang_dewasa_l,
                        "Datang Dewasa P": datang_dewasa_p,
                        "Datang Lansia L": datang_lansia_l,
                        "Datang Lansia P": datang_lansia_p,
                        "Lingkar Perut N (Dewasa L)": lp_dewasa_l,
                        "Lingkar Perut N (Dewasa P)": lp_dewasa_p,
                        "Lingkar Perut N (Lansia L)": lp_lansia_l,
                        "Lingkar Perut N (Lansia P)": lp_lansia_p,
                        "Lingkar Perut > (Dewasa L)": lp_dewasa_lebih_l,
                        "Lingkar Perut > (Dewasa P)": lp_dewasa_lebih_p,
                        "Lingkar Perut > (Lansia L)": lp_lansia_lebih_l,
                        "Lingkar Perut > (Lansia P)": lp_lansia_lebih_p,
                        "TD Normal L": td_l,
                        "TD Normal P": td_p,
                        "TD Masalah L": td_lebih_l,
                        "TD Masalah P": td_lebih_p,
                        "Gula Darah N L": gula_l,
                        "Gula Darah N P": gula_p,
                        "Gula Darah > L": gula_lebih_l,
                        "Gula Darah > P": gula_lebih_p,
                        "Gejala TBC L": tbc_l,
                        "Gejala TBC P": tbc_p
                    });
                } else {
                worksheet.getCell('B' + rowIdx).value = sasaranDewasa;`;
code = code.replace(dewasaExcel, dewasaJson);

code = code.replace(/worksheet\.getCell\('Z' \+ rowIdx\)\.value = tbc_p;/g, "worksheet.getCell('Z' + rowIdx).value = tbc_p;\n                }");

// 6. For Bayi & Balita
const bayiExcel = `                worksheet.getCell('B' + rowIdx).value = sasaran0_5;`;
const bayiJson = `                if (isJson) {
                    previewData.push({
                        "Bulan": monthNames[month - 1],
                        "Sasaran 0-5": sasaran0_5,
                        "Sasaran 6-11": sasaran6_11,
                        "Sasaran 12-59": sasaran12_59,
                        "Datang L": datang_l,
                        "Datang P": datang_p,
                        "BB Naik Sesuai L": bb_naik_l,
                        "BB Naik Sesuai P": bb_naik_p,
                        "BB Kurang L": bb_kurang_l,
                        "BB Kurang P": bb_kurang_p,
                        "Sangat Pendek L": sangat_pendek_l,
                        "Sangat Pendek P": sangat_pendek_p,
                        "Pendek/Normal L": pendek_normal_l,
                        "Pendek/Normal P": pendek_normal_p,
                        "Gizi Buruk/Lebih L": gizi_buruk_l,
                        "Gizi Buruk/Lebih P": gizi_buruk_p,
                        "Gizi Baik L": gizi_baik_l,
                        "Gizi Baik P": gizi_baik_p,
                        "LK Masalah L": lk_kurang_lebih_l,
                        "LK Masalah P": lk_kurang_lebih_p,
                        "LK Normal L": lk_normal_l,
                        "LK Normal P": lk_normal_p,
                        "Perkembangan Sesuai L": perkembangan_hijau_l,
                        "Perkembangan Sesuai P": perkembangan_hijau_p,
                        "Gejala TBC L": tbc_l,
                        "Gejala TBC P": tbc_p
                    });
                } else {
                worksheet.getCell('B' + rowIdx).value = sasaran0_5;`;
code = code.replace(bayiExcel, bayiJson);

code = code.replace(/worksheet\.getCell\('AA' \+ rowIdx\)\.value = tbc_p;/g, "worksheet.getCell('AA' + rowIdx).value = tbc_p;\n                }");

// 7. Finally, response handler
const sendExcel = `        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', \`attachment; filename=\${templateFile.replace('template_', 'Export_')}\`);

        await workbook.xlsx.write(res);
        res.end();`;
const sendJsonOrExcel = `        if (isJson) {
            return res.json({ kategori, tahun, data: previewData });
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', \`attachment; filename=\${templateFile.replace('template_', 'Export_')}\`);

            await workbook.xlsx.write(res);
            res.end();
        }`;
code = code.replace(sendExcel, sendJsonOrExcel);

fs.writeFileSync('server.js', code);
console.log('server.js patched for JSON export!');
