const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Melayani file statis (HTML, CSS, JS frontend) agar bisa jalan di 1 server (sangat cocok untuk hosting)
app.use(express.static(__dirname));

// Rute khusus untuk root '/' agar Vercel tidak error "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'posyandugo'
});

// ==========================================
// 0. AUTENTIKASI (LOGIN)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password harus diisi' });
        }
        
        const [users] = await pool.query('SELECT id, username, role, nama_posyandu FROM users WHERE username = ? AND password = ?', [username, password]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }
        
        // Login berhasil, kembalikan data user
        const user = users[0];
        res.json({ message: 'Login berhasil', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
});

// ==========================================
// 0.5 MANAJEMEN AKUN POSYANDU
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, role, nama_posyandu FROM users WHERE role = "Kader Posyandu"');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, password, nama_posyandu } = req.body;
        if (!username || !password || !nama_posyandu) return res.status(400).json({ error: 'Data tidak lengkap' });
        
        await pool.query('INSERT INTO users (username, password, role, nama_posyandu) VALUES (?, ?, "Kader Posyandu", ?)', [username, password, nama_posyandu]);
        res.json({ message: 'Akun posyandu berhasil dibuat' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'Akun posyandu berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password baru harus diisi' });
        
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [password, req.params.id]);
        res.json({ message: 'Password berhasil diubah' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 1. DATA PASIEN
// ==========================================
app.get('/api/patients', async (req, res) => {
    const category = req.query.kategori;
    try {
        let query = "SELECT * FROM data_pasien";
        let params = [];
        
        if (category) {
            if (category === 'Dewasa & Lansia') {
                query += " WHERE kategori IN ('Dewasa', 'Lansia')";
            } else if (category === 'Bayi & Balita' || category === 'Bayi, Balita & Pra-Sekolah') {
                query = `
                    SELECT p.*, s.tb_pendek, s.status_gizi, s.bb_kurang
                    FROM data_pasien p
                    LEFT JOIN skrining_bayi_balita s ON p.id_pasien = s.id_pasien 
                        AND s.tanggal_kunjungan = (
                            SELECT MAX(tanggal_kunjungan) 
                            FROM skrining_bayi_balita s2 
                            WHERE s2.id_pasien = p.id_pasien
                        )
                    WHERE p.kategori = 'Bayi & Balita'
                `;
            } else {
                query += " WHERE kategori = ?";
                params.push(category);
            }
        }
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const p = req.body;
        const sql = `INSERT INTO data_pasien 
            (kategori, sub_kategori, nik, nama, nama_ibu, nama_ayah, bb_lahir, pb_lahir, tanggal_lahir, jenis_kelamin, status_perkawinan, pekerjaan, alamat, no_telepon, nama_suami, jarak_kehamilan, hamil_anak_ke, bb_awal, tb_awal, posyandu) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            p.kategori, p.sub_kategori || '', p.nik, p.nama, p.nama_ibu || '', p.nama_ayah || '', 
            p.bb_lahir || null, p.pb_lahir || null,
            p.tanggal_lahir, 
            p.jenis_kelamin, p.status_perkawinan || '', p.pekerjaan || '', 
            p.alamat || '', p.no_telepon || '', p.nama_suami || '', 
            p.jarak_kehamilan || '', p.hamil_anak_ke || null,
            p.bb_awal || null, p.tb_awal || null, p.posyandu || ''
        ];
        
        const [result] = await pool.query(sql, params);
        res.json({ id_pasien: result.insertId, message: 'Berhasil ditambahkan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const p = req.body;
        const sql = `UPDATE data_pasien SET 
            kategori = ?, sub_kategori = ?, nik = ?, nama = ?, nama_ibu = ?, nama_ayah = ?, bb_lahir = ?, pb_lahir = ?, tanggal_lahir = ?, 
            jenis_kelamin = ?, status_perkawinan = ?, pekerjaan = ?, alamat = ?, no_telepon = ?, nama_suami = ?, 
            jarak_kehamilan = ?, hamil_anak_ke = ?, bb_awal = ?, tb_awal = ?, posyandu = ?
            WHERE id_pasien = ?`;
        const params = [
            p.kategori, p.sub_kategori || '', p.nik, p.nama, p.nama_ibu || '', p.nama_ayah || '', 
            p.bb_lahir || null, p.pb_lahir || null,
            p.tanggal_lahir, 
            p.jenis_kelamin, p.status_perkawinan || '', p.pekerjaan || '', 
            p.alamat || '', p.no_telepon || '', p.nama_suami || '', 
            p.jarak_kehamilan || '', p.hamil_anak_ke || null,
            p.bb_awal || null, p.tb_awal || null, p.posyandu || '',
            id
        ];
        
        await pool.query(sql, params);
        res.json({ message: 'Data Pasien berhasil diubah' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM data_pasien WHERE id_pasien = ?', [req.params.id]);
        res.json({ message: 'Data dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. SKRINING (DINAMIS 6 TABEL)

// Helper: konversi nilai string form menjadi INT untuk kolom-kolom INT di skrining_bayi_balita
function normalizeBayiBalitaData(data) {
    const result = { ...data };
    // tb_pendek: 'Stunting'/'Sangat Pendek (Stunting)'/'Pendek (Stunting)' = 1, 'Normal'/'Tinggi (Lebih)' = 0
    if (result.tb_pendek !== undefined && result.tb_pendek !== null && result.tb_pendek !== '') {
        const val = result.tb_pendek;
        if (val === 'Stunting' || val === 'Sangat Pendek (Stunting)' || val === 'Pendek (Stunting)' || val === '1' || val === 1) {
            result.tb_pendek = 1;
        } else if (val === 'Normal' || val === 'Tinggi (Lebih)' || val === '0' || val === 0) {
            result.tb_pendek = 0;
        }
    }
    return result;
}
// ==========================================
app.post('/api/screening/:type', async (req, res) => {
    const type = req.params.type;
    const data = req.body;
    let tableName = '';

    if (type === 'ibu_hamil') tableName = 'skrining_ibu_hamil';
    else if (type === 'bayi_balita') tableName = 'skrining_bayi_balita';
    else if (type === 'sekolah_remaja') tableName = 'skrining_sekolah_remaja';
    else if (type === 'dewasa_lansia_fisik') tableName = 'skrining_dewasa_lansia_fisik';
    else if (type === 'dewasa_lansia_jiwa') tableName = 'skrining_dewasa_lansia_jiwa';
    else if (type === 'lansia_skilas') tableName = 'skrining_lansia_skilas';
    else return res.status(400).json({ error: 'Tipe skrining tidak valid' });

    try {
        const normalizedData = (type === 'bayi_balita') ? normalizeBayiBalitaData(data) : data;
        const keys = Object.keys(normalizedData);
        const values = Object.values(normalizedData);
        const placeholders = keys.map(() => '?').join(',');

        const sql = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
        const [result] = await pool.query(sql, values);

        res.json({ id_skrining: result.insertId, message: 'Skrining berhasil disimpan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/screening/:type/:id', async (req, res) => {
    const type = req.params.type;
    const id = req.params.id;
    const data = req.body;
    let tableName = '';

    if (type === 'ibu_hamil') tableName = 'skrining_ibu_hamil';
    else if (type === 'bayi_balita') tableName = 'skrining_bayi_balita';
    else if (type === 'sekolah_remaja') tableName = 'skrining_sekolah_remaja';
    else if (type === 'dewasa_lansia_fisik') tableName = 'skrining_dewasa_lansia_fisik';
    else if (type === 'dewasa_lansia_jiwa') tableName = 'skrining_dewasa_lansia_jiwa';
    else if (type === 'lansia_skilas') tableName = 'skrining_lansia_skilas';
    else return res.status(400).json({ error: 'Tipe skrining tidak valid' });

    try {
        const normalizedData = (type === 'bayi_balita') ? normalizeBayiBalitaData(data) : data;
        const keys = Object.keys(normalizedData);
        const values = Object.values(normalizedData);
        const setClause = keys.map(k => `${k} = ?`).join(',');

        const sql = `UPDATE ${tableName} SET ${setClause} WHERE id_skrining = ?`;
        await pool.query(sql, [...values, id]);

        res.json({ message: 'Skrining berhasil diubah' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/screening/:type/:id', async (req, res) => {
    const type = req.params.type;
    const id = req.params.id;
    let tableName = '';

    if (type === 'ibu_hamil') tableName = 'skrining_ibu_hamil';
    else if (type === 'bayi_balita') tableName = 'skrining_bayi_balita';
    else if (type === 'sekolah_remaja') tableName = 'skrining_sekolah_remaja';
    else if (type === 'dewasa_lansia_fisik') tableName = 'skrining_dewasa_lansia_fisik';
    else if (type === 'dewasa_lansia_jiwa') tableName = 'skrining_dewasa_lansia_jiwa';
    else if (type === 'lansia_skilas') tableName = 'skrining_lansia_skilas';
    else return res.status(400).json({ error: 'Tipe skrining tidak valid' });

    try {
        await pool.query(`DELETE FROM ${tableName} WHERE id_skrining = ?`, [id]);
        res.json({ message: 'Data skrining berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. EXPORT EXCEL & LIHAT RIWAYAT
// ==========================================
app.get('/api/riwayat/:type/:id', async (req, res) => {
    const type = req.params.type;
    const patientId = req.params.id;

    const templates = {
        'ibu_hamil': { table: 'skrining_ibu_hamil' },
        'bayi_balita': { table: 'skrining_bayi_balita' },
        'sekolah_remaja': { table: 'skrining_sekolah_remaja' },
        'dewasa_lansia_fisik': { table: 'skrining_dewasa_lansia_fisik' },
        'dewasa_lansia_jiwa': { table: 'skrining_dewasa_lansia_jiwa' },
        'lansia_skilas': { table: 'skrining_lansia_skilas' }
    };

    const config = templates[type];
    if (!config) return res.status(400).json({ error: 'Tipe tidak valid' });

    try {
        const [patients] = await pool.query('SELECT * FROM data_pasien WHERE id_pasien = ?', [patientId]);
        if (patients.length === 0) return res.status(404).json({ error: 'Pasien tidak ditemukan' });
        const patient = patients[0];

        const [screenings] = await pool.query(`SELECT * FROM ${config.table} WHERE id_pasien = ? ORDER BY tanggal_kunjungan DESC`, [patientId]);
        
        res.json({ patient, screenings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil riwayat skrining' });
    }
});

app.get('/api/export/:type/:id', async (req, res) => {
    const type = req.params.type;
    const patientId = req.params.id;

    const templates = {
        'ibu_hamil': { table: 'skrining_ibu_hamil', file: 'template_Ibu_Hamil.xlsx' },
        'bayi_balita': { table: 'skrining_bayi_balita', file: 'template_Bayi_Balita.xlsx' },
        'sekolah_remaja': { table: 'skrining_sekolah_remaja', file: 'template_Sekolah_Remaja.xlsx' },
        'dewasa_lansia_fisik': { table: 'skrining_dewasa_lansia_fisik', file: 'template_Dewasa_Lansia_Fisik.xlsx' },
        'dewasa_lansia_jiwa': { table: 'skrining_dewasa_lansia_jiwa', file: 'template_Dewasa_Lansia_Jiwa.xlsx' },
        'lansia_skilas': { table: 'skrining_lansia_skilas', file: 'template_Lansia_SKILAS.xlsx' }
    };

    const config = templates[type];
    if (!config) return res.status(400).json({ error: 'Tipe tidak valid' });

    try {
        const [patients] = await pool.query('SELECT * FROM data_pasien WHERE id_pasien = ?', [patientId]);
        if (patients.length === 0) return res.status(404).json({ error: 'Pasien tidak ditemukan' });
        const patient = patients[0];

        // Ambil SEMUA riwayat skrining pasien ini, urutkan dari yang terlama ke terbaru
        const [screenings] = await pool.query(`SELECT * FROM ${config.table} WHERE id_pasien = ? ORDER BY tanggal_kunjungan ASC`, [patientId]);
        
        const templatePath = path.join(__dirname, config.file);
        
        const workbook = new excel.Workbook();
        if (fs.existsSync(templatePath)) {
            await workbook.xlsx.readFile(templatePath);
        } else {
            workbook.addWorksheet('Sheet1'); 
        }
        
        const worksheet = workbook.worksheets[0];

        // LOGIKA KUSTOM UNTUK MASING-MASING TEMPLATE
        if (type === 'dewasa_lansia_fisik') {
            // Identity mapping
            worksheet.getCell('C2').value = patient.nama;
            worksheet.getCell('C3').value = patient.nik;
            worksheet.getCell('C4').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C5').value = patient.jenis_kelamin;
            worksheet.getCell('C6').value = patient.status_perkawinan;
            worksheet.getCell('C7').value = patient.pekerjaan;
            worksheet.getCell('C8').value = patient.alamat;
            worksheet.getCell('C9').value = patient.no_telepon;
            
            // Lokasi (Dusun, Desa dll) => 2T, 3T, 4T, 5T
            worksheet.getCell('T2').value = 'Kecamatan'; 
            worksheet.getCell('T3').value = 'Desa';
            worksheet.getCell('T4').value = 'Dusun';
            worksheet.getCell('T5').value = 'Posyandu';

            let startRow = 20;
            const formatYT = (v) => v === 1 ? 'Y' : (v === 0 ? 'T' : '');

            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID'); // 1
                worksheet.getCell('B' + startRow).value = screening.berat_badan; // 2
                worksheet.getCell('C' + startRow).value = screening.tinggi_badan; // 3
                worksheet.getCell('D' + startRow).value = screening.status_tb; // 4
                worksheet.getCell('E' + startRow).value = screening.lingkar_perut; // 5
                
                // 6: Sistole / Diastole
                worksheet.getCell('F' + startRow).value = (screening.sistole || '-') + ' / ' + (screening.diastole || '-');
                
                worksheet.getCell('G' + startRow).value = screening.hasil_tensi; // 7
                worksheet.getCell('H' + startRow).value = screening.gula_darah; // 8
                
                worksheet.getCell('I' + startRow).value = screening.mata_kanan; // 9
                worksheet.getCell('J' + startRow).value = screening.mata_kiri; // 10
                worksheet.getCell('K' + startRow).value = screening.telinga_kanan; // 11
                worksheet.getCell('L' + startRow).value = screening.telinga_kiri; // 12
                
                worksheet.getCell('M' + startRow).value = screening.kelamin; // 13
                worksheet.getCell('N' + startRow).value = screening.usia; // 14
                worksheet.getCell('O' + startRow).value = screening.merokok; // 15
                worksheet.getCell('P' + startRow).value = screening.nafas_pendek; // 16
                worksheet.getCell('Q' + startRow).value = screening.punya_dahak; // 17
                worksheet.getCell('R' + startRow).value = screening.spirometri; // 18
                worksheet.getCell('S' + startRow).value = screening.skor_ppok; // 19
                
                worksheet.getCell('T' + startRow).value = formatYT(screening.batuk_menerus); // 20
                worksheet.getCell('U' + startRow).value = formatYT(screening.demam_2_minggu); // 21
                worksheet.getCell('V' + startRow).value = formatYT(screening.bb_tidak_naik); // 22
                worksheet.getCell('W' + startRow).value = formatYT(screening.kontak_erat_tb); // 23
                worksheet.getCell('X' + startRow).value = screening.alat_kontrasepsi; // 24
                worksheet.getCell('Y' + startRow).value = screening.edukasi_diberikan; // 25

                startRow++;
            });

        } else if (type === 'bayi_balita') {
            // Mapping Data Pasien Bayi Balita
            worksheet.getCell('C3').value = patient.nama;
            worksheet.getCell('C4').value = patient.nik;
            worksheet.getCell('C5').value = patient.jenis_kelamin;
            worksheet.getCell('C6').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C7').value = patient.bb_lahir;
            worksheet.getCell('C8').value = patient.pb_lahir;
            worksheet.getCell('C9').value = patient.nama_ibu;
            worksheet.getCell('C10').value = patient.nama_ayah;
            worksheet.getCell('C11').value = patient.alamat;
            worksheet.getCell('C12').value = patient.no_telepon;

            let startRow = 19;
            const cols = ['B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y'];
            const keys = [
                'umur_bulan', 'checklist_perkembangan', 'berat_badan', 'bb_naik', 'bb_kurang', 
                'tinggi_badan', 'tb_pendek', 'status_gizi', 'lingkar_kepala', 'lk_normal', 
                'lila', 'lila_kurang', 'batuk_menerus', 'demam_2_minggu', 'bb_tidak_naik', 
                'kontak_erat_tb', 'asi_eks', 'mp_asi', 'jenis_imunisasi', 'vit_a', 
                'obat_cacing', 'dapat_mt', 'gejala_sakit', 'edukasi_diberikan'
            ];
            
            // Total = 24 kolom. Tanggal di A. Total A-Y = 25 kolom sesuai form.
            
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID');
                for (let i = 0; i < keys.length; i++) {
                    const cell = worksheet.getCell(cols[i] + startRow);
                    const keyName = keys[i];
                    let val = screening[keyName];
                    
                    if (keyName === 'tb_pendek') {
                        // Handle legacy values 1 or '1' as Pendek, 0 or '0' as Normal
                        if (val === 1 || val === '1') val = 'Stunting';
                        else if (val === 0 || val === '0') val = 'Normal';

                        // Hanya mengisi teks tanpa warna khusus
                        cell.value = val;
                    } else {
                        cell.value = val;
                    }
                }
                startRow++;
            });

        } else if (type === 'sekolah_remaja') {
            // Mapping Data Pasien Anak Sekolah & Remaja
            worksheet.getCell('C3').value = patient.nama;
            worksheet.getCell('C4').value = patient.nik;
            worksheet.getCell('C5').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C6').value = patient.jenis_kelamin;
            
            // Menggabungkan nama ibu dan ayah menjadi Nama Orangtua
            let namaOrtu = [];
            if (patient.nama_ibu) namaOrtu.push(patient.nama_ibu);
            if (patient.nama_ayah) namaOrtu.push(patient.nama_ayah);
            worksheet.getCell('C7').value = namaOrtu.join(' / ');
            
            worksheet.getCell('C8').value = patient.alamat;
            worksheet.getCell('C9').value = patient.no_telepon;

            let startRow = 20;
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID'); // 1
                worksheet.getCell('B' + startRow).value = screening.berat_badan; // 2
                worksheet.getCell('C' + startRow).value = screening.tinggi_badan; // 3
                worksheet.getCell('D' + startRow).value = screening.imt; // 4
                worksheet.getCell('E' + startRow).value = screening.lingkar_perut; // 5
                
                // 6: Sistole / Diastole
                worksheet.getCell('F' + startRow).value = (screening.sistole || '-') + ' / ' + (screening.diastole || '-');
                
                worksheet.getCell('G' + startRow).value = screening.tensi_klasifikasi; // 7
                worksheet.getCell('H' + startRow).value = screening.gula_darah; // 8
                worksheet.getCell('I' + startRow).value = screening.kadar_hb; // 9
                
                const formatYT = (v) => v === 1 ? 'Y' : (v === 0 ? 'T' : '');
                
                worksheet.getCell('J' + startRow).value = formatYT(screening.anemia); // 10
                worksheet.getCell('K' + startRow).value = formatYT(screening.batuk_menerus); // 11
                worksheet.getCell('L' + startRow).value = formatYT(screening.demam_2_minggu); // 12
                worksheet.getCell('M' + startRow).value = formatYT(screening.bb_tidak_naik); // 13
                worksheet.getCell('N' + startRow).value = formatYT(screening.kontak_erat_tb); // 14
                
                // HEEADSSS
                worksheet.getCell('O' + startRow).value = formatYT(screening.masalah_di_rumah); // 15
                worksheet.getCell('P' + startRow).value = formatYT(screening.beban_sekolah); // 16
                worksheet.getCell('Q' + startRow).value = formatYT(screening.tidak_suka_tubuh); // 17
                worksheet.getCell('R' + startRow).value = formatYT(screening.teman_diluar); // 18
                worksheet.getCell('S' + startRow).value = formatYT(screening.merokok_alkohol); // 19
                worksheet.getCell('T' + startRow).value = formatYT(screening.kesehatan_seksual); // 20
                worksheet.getCell('U' + startRow).value = formatYT(screening.tidak_aman); // 21
                worksheet.getCell('V' + startRow).value = formatYT(screening.ingin_bunuh_diri); // 22
                worksheet.getCell('W' + startRow).value = screening.edukasi_diberikan; // 23

                startRow++;
            });

        } else if (type === 'ibu_hamil') {
            // Mapping Data Pasien Ibu Hamil
            worksheet.getCell('C3').value = patient.nama;
            worksheet.getCell('C4').value = patient.nik;
            worksheet.getCell('C5').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID'); // Umur/Tgl Lahir
            worksheet.getCell('C6').value = patient.nama_suami;
            worksheet.getCell('C7').value = patient.alamat;
            worksheet.getCell('C8').value = patient.no_telepon;
            worksheet.getCell('C9').value = patient.jarak_kehamilan;
            worksheet.getCell('C12').value = patient.jarak_kehamilan; // Diminta user di 9C dan 12C
            worksheet.getCell('C13').value = patient.hamil_anak_ke;
            
            // Kolom BB Awal dan TB Awal
            worksheet.getCell('H12').value = patient.bb_awal;
            worksheet.getCell('H13').value = patient.tb_awal;

            let startRow = 20;
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID');
                
                worksheet.getCell('B' + startRow).value = screening.usia_kehamilan;
                worksheet.getCell('C' + startRow).value = screening.berat_badan;
                worksheet.getCell('D' + startRow).value = screening.bb_sesuai_kia;
                worksheet.getCell('E' + startRow).value = screening.lila;
                worksheet.getCell('F' + startRow).value = screening.lila_lebih_23_5;
                
                // Kolom G adalah gabungan Sistole / Diastole
                worksheet.getCell('G' + startRow).value = (screening.sistole || '-') + ' / ' + (screening.diastole || '-');
                
                worksheet.getCell('H' + startRow).value = screening.tensi_sesuai_kia;
                worksheet.getCell('I' + startRow).value = screening.batuk_menerus;
                worksheet.getCell('J' + startRow).value = screening.demam_2_minggu;
                worksheet.getCell('K' + startRow).value = screening.bb_tidak_naik;
                worksheet.getCell('L' + startRow).value = screening.kontak_erat_tb;
                worksheet.getCell('M' + startRow).value = screening.diberikan_ttd;
                worksheet.getCell('N' + startRow).value = screening.konsumsi_ttd;
                worksheet.getCell('O' + startRow).value = screening.diberikan_mt_bumil_kek;
                worksheet.getCell('P' + startRow).value = screening.konsumsi_mt;
                worksheet.getCell('Q' + startRow).value = screening.ikut_kelas_bumil;
                
                worksheet.getCell('R' + startRow).value = screening.edukasi_diberikan; // R: Edukasi
                worksheet.getCell('S' + startRow).value = screening.rujuk; // S: Rujuk

                startRow++;
            });
        } else if (type === 'lansia_skilas') {
            // Identity mapping
            worksheet.getCell('C2').value = patient.nama;
            worksheet.getCell('C3').value = patient.nik;
            worksheet.getCell('C4').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C5').value = patient.jenis_kelamin;
            worksheet.getCell('C6').value = patient.status_perkawinan;
            worksheet.getCell('C7').value = patient.pekerjaan;
            worksheet.getCell('C8').value = patient.alamat;
            worksheet.getCell('C9').value = patient.no_telepon;
            
            let startRow = 19;
            const formatYT = (v) => v === 1 ? 'Y' : (v === 0 ? 'T' : '');
            
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID');
                
                // Pertanyaan SKILAS (B-M)
                worksheet.getCell('B' + startRow).value = formatYT(screening.orientasi);
                worksheet.getCell('C' + startRow).value = formatYT(screening.mengulang_kata);
                worksheet.getCell('D' + startRow).value = formatYT(screening.berdiri_kursi);
                worksheet.getCell('E' + startRow).value = formatYT(screening.bb_turun);
                worksheet.getCell('F' + startRow).value = formatYT(screening.hilang_nafsu_makan);
                worksheet.getCell('G' + startRow).value = formatYT(screening.lila_kurang_21);
                worksheet.getCell('H' + startRow).value = formatYT(screening.masalah_mata);
                worksheet.getCell('I' + startRow).value = formatYT(screening.tes_melihat);
                worksheet.getCell('J' + startRow).value = formatYT(screening.tes_bisik);
                worksheet.getCell('K' + startRow).value = formatYT(screening.tidak_dapat_dilakukan);
                worksheet.getCell('L' + startRow).value = formatYT(screening.perasaan_sedih);
                worksheet.getCell('M' + startRow).value = formatYT(screening.sedikit_minat);
                
                // Edukasi
                worksheet.getCell('N' + startRow).value = screening.edukasi_diberikan; 
                
                startRow++;
            });
        } else if (type === 'dewasa_lansia_jiwa') {
            // Identity mapping
            worksheet.getCell('C2').value = patient.nama;
            worksheet.getCell('C3').value = patient.nik;
            worksheet.getCell('C4').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C5').value = patient.jenis_kelamin;
            worksheet.getCell('C6').value = patient.status_perkawinan;
            worksheet.getCell('C7').value = patient.pekerjaan;
            worksheet.getCell('C8').value = patient.alamat;
            worksheet.getCell('C9').value = patient.no_telepon;
            
            let startRow = 23;
            const formatYT = (v) => v === 1 ? 'Y' : (v === 0 ? 'T' : '');
            const qCols = ['B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
            
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID');
                
                // q1 to q19 (B to T)
                for (let i = 1; i <= 19; i++) {
                    worksheet.getCell(qCols[i-1] + startRow).value = formatYT(screening['q'+i]);
                }
                
                // Edukasi
                worksheet.getCell('U' + startRow).value = screening.edukasi_diberikan; 
                
                // Tambahkan border agar tidak terlihat "di luar tabel"
                const borderStyle = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
                
                const allCols = ['A', ...qCols, 'U'];
                allCols.forEach(c => {
                    const cell = worksheet.getCell(c + startRow);
                    cell.border = borderStyle;
                    // Bisa juga sekalian alignment tengah
                    if (c !== 'U' && c !== 'A') {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
                
                startRow++;
            });
        } else if (type === 'ibu_hamil') {
            // Identity mapping
            worksheet.getCell('C3').value = patient.nama;
            worksheet.getCell('C4').value = patient.nik;
            worksheet.getCell('C5').value = new Date(patient.tanggal_lahir).toLocaleDateString('id-ID');
            worksheet.getCell('C6').value = patient.nama_suami;
            worksheet.getCell('C7').value = patient.alamat;
            worksheet.getCell('C8').value = patient.no_telepon;
            worksheet.getCell('C9').value = patient.jarak_kehamilan;
            worksheet.getCell('C12').value = patient.jarak_kehamilan;
            worksheet.getCell('C13').value = patient.hamil_anak_ke;
            
            worksheet.getCell('H12').value = patient.bb_awal;
            worksheet.getCell('H13').value = patient.tb_awal;
            
            let startRow = 20;
            const formatYT = (v) => v === 1 ? 'Y' : (v === 0 ? 'T' : '');
            
            screenings.forEach(screening => {
                worksheet.getCell('A' + startRow).value = new Date(screening.tanggal_kunjungan).toLocaleDateString('id-ID');
                worksheet.getCell('B' + startRow).value = screening.usia_kehamilan;
                worksheet.getCell('C' + startRow).value = screening.berat_badan;
                worksheet.getCell('D' + startRow).value = formatYT(screening.bb_sesuai_kia);
                worksheet.getCell('E' + startRow).value = screening.lila;
                worksheet.getCell('F' + startRow).value = formatYT(screening.lila_lebih_23_5);
                
                const tensi = (screening.sistole && screening.diastole) ? `${screening.sistole}/${screening.diastole}` : '';
                worksheet.getCell('G' + startRow).value = tensi;
                
                worksheet.getCell('H' + startRow).value = formatYT(screening.tensi_sesuai_kia);
                worksheet.getCell('I' + startRow).value = formatYT(screening.batuk_menerus);
                worksheet.getCell('J' + startRow).value = formatYT(screening.demam_2_minggu);
                worksheet.getCell('K' + startRow).value = formatYT(screening.bb_tidak_naik);
                worksheet.getCell('L' + startRow).value = formatYT(screening.kontak_erat_tb);
                worksheet.getCell('M' + startRow).value = screening.diberikan_ttd;
                worksheet.getCell('N' + startRow).value = formatYT(screening.konsumsi_ttd);
                worksheet.getCell('O' + startRow).value = screening.diberikan_mt_bumil_kek;
                worksheet.getCell('P' + startRow).value = formatYT(screening.konsumsi_mt);
                worksheet.getCell('Q' + startRow).value = formatYT(screening.ikut_kelas_bumil);
                worksheet.getCell('R' + startRow).value = screening.rujuk;
                worksheet.getCell('S' + startRow).value = screening.edukasi_diberikan;
                
                startRow++;
            });
        } else {
            // LOGIKA DEFAULT UNTUK TEMPLATE LAINNYA (Bisa disesuaikan nanti)
            let rowIdx = 2; // Default baris
            const screening = screenings.length > 0 ? screenings[screenings.length - 1] : {}; // Ambil yg terbaru saja untuk default
            const row = worksheet.getRow(rowIdx); 
            
            let colIndex = 1;

            const excludePatientKeys = ['id_pasien'];
            for (const [key, val] of Object.entries(patient)) {
                if (!excludePatientKeys.includes(key)) {
                    row.getCell(colIndex++).value = val;
                }
            }

            const excludeScreeningKeys = ['id_skrining', 'id_pasien'];
            for (const [key, val] of Object.entries(screening)) {
                if (!excludeScreeningKeys.includes(key)) {
                    row.getCell(colIndex++).value = val;
                }
            }
            row.commit();
        }

        const exportPath = path.join(os.tmpdir(), `Export_${patient.nama.replace(/[^a-z0-9]/gi, '_')}_${type}.xlsx`);
        await workbook.xlsx.writeFile(exportPath);
        
        res.download(exportPath, () => {
            if (fs.existsSync(exportPath)) {
                fs.unlinkSync(exportPath); // Hapus setelah didownload
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/posyandu', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT nama_posyandu FROM users WHERE nama_posyandu IS NOT NULL AND nama_posyandu != ""');
        const posyandus = rows.map(r => r.nama_posyandu);
        res.json(posyandus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/export-rekap', async (req, res) => {
    const { kategori, tahun, format, posyandu } = req.query;
    const isJson = format === 'json';
    const previewData = [];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (!kategori || !tahun) {
        return res.status(400).send('Kategori dan tahun diperlukan');
    }

    try {
        let templateFile = '';
        let tableName = '';

        if (kategori === 'Ibu Hamil') {
            templateFile = 'rekap_Ibu_Hamil.xlsx';
            tableName = 'skrining_ibu_hamil';
        } else if (kategori === 'Bayi & Balita') {
            templateFile = 'rekap_Bayi_Balita.xlsx';
            tableName = 'skrining_bayi_balita';
        } else if (kategori === 'Sekolah & Remaja') {
            templateFile = 'rekap_Sekolah_Remaja.xlsx';
            tableName = 'skrining_sekolah_remaja';
        } else if (kategori === 'Dewasa & Lansia') {
            // Note: Currently DB separates fisik and jiwa, we'll join physically for now
            // or just use fisik as base for count
            templateFile = 'rekap_Dewasa_Lansia.xlsx';
            tableName = 'skrining_dewasa_lansia_fisik';
        } else {
            return res.status(400).send('Kategori tidak valid');
        }

        const templatePath = path.join(__dirname, templateFile);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).send(`Template file ${templateFile} belum dibuat oleh admin.`);
        }
        let workbook = new excel.Workbook();
        await workbook.xlsx.readFile(templatePath);
        let worksheet = workbook.worksheets[0];

        // Perform aggregation per month for the selected year
        for (let month = 1; month <= 12; month++) {
            if (kategori === 'Ibu Hamil') {
                const rowIdx = 9 + month; // JAN 2026 = baris 10
                
                const [rows] = await pool.execute(
                    `SELECT s.*, p.sub_kategori FROM skrining_ibu_hamil s 
                     JOIN data_pasien p ON s.id_pasien = p.id_pasien 
                     WHERE YEAR(s.tanggal_kunjungan) = ? AND MONTH(s.tanggal_kunjungan) = ? ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, posyandu] : [tahun, month]
                );

                if (rows.length === 0) continue; // Biarkan kosong jika tidak ada data

                let datangHamil = 0, datangNifas = 0;
                let bb_hijau = 0, bb_merah = 0;
                let lila_hijau = 0, lila_merah = 0;
                let td_hijau = 0, td_merah = 0;
                let tbc = 0, dapat_ttd = 0, ttd_ya = 0, ttd_tidak = 0;
                let dapat_pmt = 0, pmt_ya = 0, pmt_tidak = 0;
                let kelas_ya = 0, kelas_tidak = 0;
                let edukasi = 0, rujuk = 0;

                for (const r of rows) {
                    if (r.sub_kategori === 'Ibu Nifas/Menyusui') datangNifas++;
                    else datangHamil++;

                    if (r.bb_sesuai_kia === 1) bb_hijau++;
                    else if (r.bb_sesuai_kia === 0) bb_merah++;

                    if (r.lila_lebih_23_5 === 1) lila_hijau++;
                    else if (r.lila_lebih_23_5 === 0) lila_merah++;

                    if (r.tensi_sesuai_kia === 1) td_hijau++;
                    else if (r.tensi_sesuai_kia === 0) td_merah++;

                    const gejalaTBC = (r.batuk_menerus ? 1 : 0) + (r.demam_2_minggu ? 1 : 0) + (r.bb_tidak_naik ? 1 : 0) + (r.kontak_erat_tb ? 1 : 0);
                    if (gejalaTBC >= 2) tbc++;

                    if (r.diberikan_ttd > 0) dapat_ttd++;
                    if (r.konsumsi_ttd === 1) ttd_ya++;
                    else if (r.konsumsi_ttd === 0) ttd_tidak++;

                    if (r.diberikan_mt_bumil_kek && r.diberikan_mt_bumil_kek.trim() !== '') dapat_pmt++;
                    if (r.konsumsi_mt === 1) pmt_ya++;
                    else if (r.konsumsi_mt === 0) pmt_tidak++;

                    if (r.ikut_kelas_bumil === 1) kelas_ya++;
                    else if (r.ikut_kelas_bumil === 0) kelas_tidak++;

                    if (r.edukasi_diberikan && r.edukasi_diberikan.trim() !== '') edukasi++;
                    if (r.rujuk && r.rujuk.trim() !== '') rujuk++;
                }

                const [pasienData] = await pool.execute(
                    `SELECT 
                        SUM(CASE WHEN p.sub_kategori = 'Ibu Nifas/Menyusui' THEN 1 ELSE 0 END) as sasaran_nifas,
                        SUM(CASE WHEN p.sub_kategori != 'Ibu Nifas/Menyusui' OR p.sub_kategori IS NULL THEN 1 ELSE 0 END) as sasaran_hamil
                     FROM data_pasien p WHERE p.kategori = 'Ibu Hamil' ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [posyandu] : []
                );
                const sasaranHamil = parseInt(pasienData[0].sasaran_hamil) || 0;
                const sasaranNifas = parseInt(pasienData[0].sasaran_nifas) || 0;
                const tidakDatangHamil = Math.max(0, sasaranHamil - datangHamil);
                const tidakDatangNifas = Math.max(0, sasaranNifas - datangNifas);

                if (false) {
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
                if (false) {
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
                worksheet.getCell('B' + rowIdx).value = sasaranHamil;
                worksheet.getCell('C' + rowIdx).value = sasaranNifas; // Nifas
                worksheet.getCell('D' + rowIdx).value = datangHamil;
                worksheet.getCell('E' + rowIdx).value = datangNifas; // Datang Nifas
                worksheet.getCell('F' + rowIdx).value = tidakDatangHamil;
                worksheet.getCell('G' + rowIdx).value = tidakDatangNifas; // Tidak Datang Nifas
                worksheet.getCell('H' + rowIdx).value = bb_hijau;
                worksheet.getCell('I' + rowIdx).value = bb_merah;
                worksheet.getCell('J' + rowIdx).value = lila_hijau;
                worksheet.getCell('K' + rowIdx).value = lila_merah;
                worksheet.getCell('L' + rowIdx).value = td_hijau;
                worksheet.getCell('M' + rowIdx).value = td_merah;
                worksheet.getCell('N' + rowIdx).value = tbc;
                worksheet.getCell('O' + rowIdx).value = dapat_ttd;
                worksheet.getCell('P' + rowIdx).value = ttd_ya;
                worksheet.getCell('Q' + rowIdx).value = ttd_tidak;
                worksheet.getCell('R' + rowIdx).value = dapat_pmt;
                worksheet.getCell('S' + rowIdx).value = pmt_ya;
                worksheet.getCell('T' + rowIdx).value = pmt_tidak;
                worksheet.getCell('U' + rowIdx).value = kelas_ya;
                worksheet.getCell('V' + rowIdx).value = kelas_tidak;
                worksheet.getCell('W' + rowIdx).value = 0; // Vit A Nifas
                worksheet.getCell('X' + rowIdx).value = 0;
                worksheet.getCell('Y' + rowIdx).value = 0; // KB Nifas
                worksheet.getCell('Z' + rowIdx).value = 0;
                worksheet.getCell('AA' + rowIdx).value = edukasi;
                worksheet.getCell('AB' + rowIdx).value = rujuk;
                worksheet.getCell('AC' + rowIdx).value = 0; // Rujuk Nifas
                }
                }

            } else if (kategori === 'Sekolah & Remaja') {
                const rowIdx = 9 + month; // JAN 2026 = baris 10
                
                const [rows] = await pool.execute(
                    `SELECT s.*, p.tanggal_lahir, 
                     TIMESTAMPDIFF(YEAR, p.tanggal_lahir, s.tanggal_kunjungan) as hitung_umur_tahun
                     FROM skrining_sekolah_remaja s 
                     JOIN data_pasien p ON s.id_pasien = p.id_pasien 
                     WHERE YEAR(s.tanggal_kunjungan) = ? AND MONTH(s.tanggal_kunjungan) = ? ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, posyandu] : [tahun, month]
                );

                if (rows.length === 0) continue; // Biarkan kosong jika tidak ada data

                let datang6 = 0, datang15 = 0;
                let sangat_kurus = 0, kurus = 0, normal = 0, gemuk = 0, obesitas = 0;
                let lingkar_perut = 0;
                let td_rendah = 0, td_normal = 0, td_tinggi = 0;
                let gd_rendah = 0, gd_normal = 0, gd_tinggi = 0;
                let anemia = 0, tidak_anemia = 0;
                let tbc = 0, headdsss = 0, edukasi = 0, rujuk = 0;

                for (const r of rows) {
                    const umur = r.hitung_umur_tahun || 0;
                    if (umur <= 14) datang6++;
                    else datang15++;

                    if (r.status_imt === 0) sangat_kurus++;
                    else if (r.status_imt === 1) kurus++;
                    else if (r.status_imt === 2) normal++;
                    else if (r.status_imt === 3) gemuk++;
                    else if (r.status_imt === 4) obesitas++;

                    if (r.lingkar_perut > 0) lingkar_perut++;

                    if (r.tensi_sesuai_kia === 1) td_normal++;
                    else if (r.tensi_sesuai_kia === 0) td_tinggi++;

                    if (r.gula_darah === 1) gd_normal++;
                    else if (r.gula_darah === 0) gd_tinggi++;

                    if (r.anemia === 1) anemia++;
                    else if (r.anemia === 0) tidak_anemia++;

                    const gejalaTBC = (r.batuk_menerus ? 1 : 0) + (r.demam_2_minggu ? 1 : 0) + (r.bb_tidak_naik ? 1 : 0) + (r.kontak_erat_tb ? 1 : 0);
                    if (gejalaTBC >= 2) tbc++;

                    if (r.skrining_jiwa_headdsss === 1) headdsss++;

                    if (r.edukasi_diberikan && r.edukasi_diberikan.trim() !== '') edukasi++;
                    if (r.rujuk && r.rujuk.trim() !== '') rujuk++;
                }

                const [pasienData] = await pool.execute(
                    `SELECT 
                        SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) <= 14 THEN 1 ELSE 0 END) as sasaran_6_14,
                        SUM(CASE WHEN TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) > 14 THEN 1 ELSE 0 END) as sasaran_15_18
                     FROM data_pasien p WHERE p.kategori = 'Sekolah & Remaja' ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, tahun, month, posyandu] : [tahun, month, tahun, month]
                );
                
                const sasaran6 = parseInt(pasienData[0].sasaran_6_14) || 0;
                const sasaran15 = parseInt(pasienData[0].sasaran_15_18) || 0;

                const tidakDatang6 = Math.max(0, sasaran6 - datang6);
                const tidakDatang15 = Math.max(0, sasaran15 - datang15);

                worksheet.getCell('B' + rowIdx).value = datang6;
                worksheet.getCell('C' + rowIdx).value = datang15;
                worksheet.getCell('D' + rowIdx).value = tidakDatang6;
                worksheet.getCell('E' + rowIdx).value = tidakDatang15;
                worksheet.getCell('F' + rowIdx).value = sangat_kurus;
                worksheet.getCell('G' + rowIdx).value = kurus;
                worksheet.getCell('H' + rowIdx).value = normal;
                worksheet.getCell('I' + rowIdx).value = gemuk;
                worksheet.getCell('J' + rowIdx).value = obesitas;
                worksheet.getCell('K' + rowIdx).value = lingkar_perut;
                worksheet.getCell('L' + rowIdx).value = td_rendah;
                worksheet.getCell('M' + rowIdx).value = td_normal;
                worksheet.getCell('N' + rowIdx).value = td_tinggi;
                worksheet.getCell('O' + rowIdx).value = gd_rendah;
                worksheet.getCell('P' + rowIdx).value = gd_normal;
                worksheet.getCell('Q' + rowIdx).value = gd_tinggi;
                worksheet.getCell('R' + rowIdx).value = anemia;
                worksheet.getCell('S' + rowIdx).value = tidak_anemia;
                worksheet.getCell('T' + rowIdx).value = tbc;
                worksheet.getCell('U' + rowIdx).value = headdsss;
                worksheet.getCell('V' + rowIdx).value = edukasi;
                worksheet.getCell('W' + rowIdx).value = rujuk;

            } else if (kategori === 'Bayi & Balita') {
                const rowIdx = 10 + month; // 10+1=11 (JAN 2026 = baris 11)

                // Ambil semua skrining di bulan tsb + gabung dgn data_pasien utk cek umur
                const [rows] = await pool.execute(
                    `SELECT s.*, p.tanggal_lahir, 
                     TIMESTAMPDIFF(MONTH, p.tanggal_lahir, s.tanggal_kunjungan) as hitung_umur_bulan 
                     FROM skrining_bayi_balita s 
                     JOIN data_pasien p ON s.id_pasien = p.id_pasien 
                     WHERE YEAR(s.tanggal_kunjungan) = ? AND MONTH(s.tanggal_kunjungan) = ? ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, posyandu] : [tahun, month]
                );

                // LOGIKA: Jika tidak ada data skrining sama sekali di bulan ini, biarkan baris di Excel kosong
                if (rows.length === 0) {
                    continue; 
                }

                let datangBayi = 0, datangBalita = 0;
                let ceklisLengkap = 0, ceklisTidakLengkap = 0;
                let bb_N = 0, bb_T = 0, gizi_baik = 0, gizi_buruk = 0;
                let sangat_pendek = 0, pendek_normal = 0;
                let gizi_baik_bb_tb = 0, gizi_buruk_bb_tb = 0;
                let lk_normal = 0, lk_kurang_lebih = 0;
                let tbc = 0, asi = 0, mpasi = 0, imunisasi = 0, vita = 0, obat_cacing = 0, mt = 0;
                let edukasi = 0, balita_sakit = 0, rujuk_bayi = 0, rujuk_balita = 0;

                for (const r of rows) {
                    const umur = r.umur_bulan || r.hitung_umur_bulan || 0;
                    const isBayi = umur <= 6;
                    
                    if (isBayi) datangBayi++;
                    else datangBalita++;

                    if (r.checklist_perkembangan === 1) ceklisLengkap++;
                    else if (r.checklist_perkembangan === 0) ceklisTidakLengkap++;

                    if (r.bb_naik === 1) bb_N++;
                    if (r.bb_kurang === 1) bb_T++;

                    if (r.status_gizi === 0) { gizi_baik++; gizi_baik_bb_tb++; }
                    if (r.status_gizi === 1) { gizi_buruk++; gizi_buruk_bb_tb++; }

                    if (r.tb_pendek === 1 || r.tb_pendek === '1' || r.tb_pendek === 'Stunting' || r.tb_pendek === 'Sangat Pendek (Stunting)' || r.tb_pendek === 'Pendek (Stunting)') sangat_pendek++;
                    if (r.tb_pendek === 0 || r.tb_pendek === '0' || r.tb_pendek === 'Normal' || r.tb_pendek === 'Tinggi (Lebih)') pendek_normal++;

                    if (r.lk_normal === 1) lk_normal++;
                    else if (r.lk_normal === 0) lk_kurang_lebih++;

                    if (r.batuk_menerus || r.demam_2_minggu || r.bb_tidak_naik || r.kontak_erat_tb) tbc++;
                    
                    if (r.asi_eks === 1) asi++;
                    if (r.mp_asi === 1) mpasi++;
                    if (r.jenis_imunisasi && r.jenis_imunisasi.trim() !== '') imunisasi++;
                    if (r.vit_a === 1) vita++;
                    if (r.obat_cacing === 1) obat_cacing++;
                    if (r.dapat_mt === 1) mt++;
                    if (r.edukasi_diberikan && r.edukasi_diberikan.trim() !== '') edukasi++;
                    if (r.gejala_sakit && r.gejala_sakit.trim() !== '') balita_sakit++;
                }

                // Hitung Sasaran (Total seluruh pasien terdaftar di DB yang umurnya sesuai pada bulan tersebut)
                const [pasienData] = await pool.execute(
                    `SELECT 
                        SUM(CASE WHEN TIMESTAMPDIFF(MONTH, p.tanggal_lahir, CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) <= 6 THEN 1 ELSE 0 END) as sasaran_bayi,
                        SUM(CASE WHEN TIMESTAMPDIFF(MONTH, p.tanggal_lahir, CONCAT(?, '-', LPAD(?, 2, '0'), '-01')) > 6 THEN 1 ELSE 0 END) as sasaran_balita
                    FROM data_pasien p WHERE p.kategori = 'Bayi & Balita' ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`, 
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, tahun, month, posyandu] : [tahun, month, tahun, month]
                );
                const sasaranBayi = parseInt(pasienData[0].sasaran_bayi) || 0;
                const sasaranBalita = parseInt(pasienData[0].sasaran_balita) || 0;

                const tidakDatangBayi = Math.max(0, sasaranBayi - datangBayi);
                const tidakDatangBalita = Math.max(0, sasaranBalita - datangBalita);

                // Mapping ke Cell
                if (false) {
                    previewData.push({
                        "Bulan": monthNames[month - 1],
                        "Sasaran Bayi": sasaranBayi,
                        "Sasaran Balita": sasaranBalita,
                        "Datang Bayi": datangBayi,
                        "Datang Balita": datangBalita,
                        "Tidak Datang Bayi": tidakDatangBayi,
                        "Tidak Datang Balita": tidakDatangBalita,
                        "Ceklis Lengkap": ceklisLengkap,
                        "Ceklis Tdk Lengkap": ceklisTidakLengkap,
                        "BB Naik Sesuai": bb_N,
                        "BB Tidak Naik": bb_T,
                        "Gizi Baik": gizi_baik,
                        "Gizi Buruk/Lebih": gizi_buruk,
                        "Stunting": sangat_pendek,
                        "Normal / Tinggi": pendek_normal,
                        "Gizi Baik (PB/TB)": gizi_baik_bb_tb,
                        "Gizi Buruk (PB/TB)": gizi_buruk_bb_tb,
                        "LK Normal": lk_normal,
                        "LK Masalah": lk_kurang_lebih,
                        "Gejala TBC": tbc,
                        "ASI Eks": asi,
                        "MP ASI": mpasi,
                        "Imunisasi": imunisasi,
                        "Vit A": vita,
                        "Obat Cacing": obat_cacing,
                        "Dapat MT": mt,
                        "Edukasi": edukasi,
                        "Balita Sakit": balita_sakit
                    });
                } else {
                    worksheet.getCell('B' + rowIdx).value = sasaranBayi;
                    worksheet.getCell('C' + rowIdx).value = sasaranBalita;
                    worksheet.getCell('D' + rowIdx).value = datangBayi;
                    worksheet.getCell('E' + rowIdx).value = datangBalita;
                    worksheet.getCell('F' + rowIdx).value = tidakDatangBayi;
                    worksheet.getCell('G' + rowIdx).value = tidakDatangBalita;
                    worksheet.getCell('H' + rowIdx).value = ceklisLengkap;
                    worksheet.getCell('I' + rowIdx).value = ceklisTidakLengkap;
                    worksheet.getCell('J' + rowIdx).value = bb_N;
                    worksheet.getCell('K' + rowIdx).value = bb_T;
                    worksheet.getCell('L' + rowIdx).value = gizi_baik;
                    worksheet.getCell('M' + rowIdx).value = gizi_buruk;
                    worksheet.getCell('N' + rowIdx).value = sangat_pendek;
                    worksheet.getCell('O' + rowIdx).value = pendek_normal;
                    worksheet.getCell('P' + rowIdx).value = gizi_baik_bb_tb;
                    worksheet.getCell('Q' + rowIdx).value = gizi_buruk_bb_tb;
                    worksheet.getCell('R' + rowIdx).value = lk_normal;
                    worksheet.getCell('S' + rowIdx).value = lk_kurang_lebih;
                    worksheet.getCell('T' + rowIdx).value = tbc;
                    worksheet.getCell('U' + rowIdx).value = asi;
                    worksheet.getCell('V' + rowIdx).value = mpasi;
                    worksheet.getCell('W' + rowIdx).value = imunisasi;
                    worksheet.getCell('X' + rowIdx).value = vita;
                    worksheet.getCell('Y' + rowIdx).value = obat_cacing;
                    worksheet.getCell('Z' + rowIdx).value = mt;
                    worksheet.getCell('AA' + rowIdx).value = edukasi;
                    worksheet.getCell('AB' + rowIdx).value = balita_sakit;
                }
                worksheet.getCell('AC' + rowIdx).value = rujuk_bayi;
                worksheet.getCell('AD' + rowIdx).value = rujuk_balita;

            } else if (kategori === 'Dewasa & Lansia') {
                const rowIdx = 10 + month; // JAN 2026 = baris 11
                // Wait, row 1-3 = Header, row 5-10 = table headers. Jan 2026 is at row 11!
                
                const [rows] = await pool.execute(
                    `SELECT f.*, p.tanggal_lahir, p.jenis_kelamin,
                     TIMESTAMPDIFF(YEAR, p.tanggal_lahir, f.tanggal_kunjungan) as hitung_umur,
                     j.q1, j.q2, j.q3, j.q4, j.q5, j.q6, j.q7, j.q8, j.q9, j.q10, j.q11, j.q12, j.q13, j.q14, j.q15, j.q16, j.q17, j.q18, j.q19, j.q20,
                     s.orientasi, s.mengulang_kata, s.berdiri_kursi, s.bb_turun, s.hilang_nafsu_makan, s.lila_kurang_21, s.masalah_mata, s.tes_melihat, s.tes_bisik, s.perasaan_sedih, s.sedikit_minat, s.edukasi_diberikan as skilas_edukasi
                     FROM skrining_dewasa_lansia_fisik f
                     JOIN data_pasien p ON f.id_pasien = p.id_pasien
                     LEFT JOIN skrining_dewasa_lansia_jiwa j ON f.id_pasien = j.id_pasien AND f.tanggal_kunjungan = j.tanggal_kunjungan
                     LEFT JOIN skrining_lansia_skilas s ON f.id_pasien = s.id_pasien AND f.tanggal_kunjungan = s.tanggal_kunjungan
                     WHERE YEAR(f.tanggal_kunjungan) = ? AND MONTH(f.tanggal_kunjungan) = ? ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, posyandu] : [tahun, month]
                );

                if (rows.length === 0) continue; // Biarkan kosong jika tidak ada data

                let d_dewasa = 0, d_lansia = 0;
                let imt1 = 0, imt2 = 0, imt3 = 0, imt4 = 0, imt5 = 0;
                let lp_l = 0, lp_p = 0;
                let td_r = 0, td_n = 0, td_t = 0;
                let gd_r = 0, gd_n = 0, gd_t = 0;
                let jiwa_rendah = 0, jiwa_tinggi = 0;
                let ppok = 0;
                let kog_ya = 0, kog_tdk = 0;
                let gerak_ya = 0, gerak_tdk = 0;
                let mal_ya = 0, mal_tdk = 0;
                let pen_ya = 0, pen_tdk = 0;
                let li_ya = 0, li_tdk = 0;
                let dep_ya = 0, dep_tdk = 0;
                let edukasi = 0;

                for (const r of rows) {
                    const umur = r.hitung_umur || 0;
                    if (umur >= 60) d_lansia++;
                    else if (umur >= 18) d_dewasa++;

                    if (r.berat_badan && r.tinggi_badan) {
                        const tbM = r.tinggi_badan / 100;
                        const imt = r.berat_badan / (tbM * tbM);
                        if (imt < 17) imt1++;
                        else if (imt < 18.5) imt2++;
                        else if (imt <= 25) imt3++;
                        else if (imt <= 27) imt4++;
                        else imt5++;
                    }

                    if (r.lingkar_perut) {
                        if (r.jenis_kelamin === 'Laki-laki' && r.lingkar_perut > 90) lp_l++;
                        if (r.jenis_kelamin === 'Perempuan' && r.lingkar_perut > 80) lp_p++;
                    }

                    if (r.sistole && r.diastole) {
                        if (r.sistole >= 140 || r.diastole >= 90) td_t++;
                        else if (r.sistole < 90 || r.diastole < 60) td_r++;
                        else td_n++;
                    }

                    if (r.gula_darah) {
                        if (r.gula_darah > 200) gd_t++;
                        else if (r.gula_darah < 70) gd_r++;
                        else gd_n++;
                    }

                    const jScore = (r.q1||0)+(r.q2||0)+(r.q3||0)+(r.q4||0)+(r.q5||0)+(r.q6||0)+(r.q7||0)+(r.q8||0)+(r.q9||0)+(r.q10||0)+(r.q11||0)+(r.q12||0)+(r.q13||0)+(r.q14||0)+(r.q15||0)+(r.q16||0)+(r.q17||0)+(r.q18||0)+(r.q19||0)+(r.q20||0);
                    if (jScore <= 5) jiwa_rendah++;
                    else jiwa_tinggi++;

                    if (r.merokok === 1) ppok++;

                    if (r.orientasi !== null && r.orientasi !== undefined) {
                        if (r.orientasi === 1 || r.mengulang_kata === 1) kog_ya++; else kog_tdk++;
                    }
                    if (r.berdiri_kursi !== null && r.berdiri_kursi !== undefined) {
                        if (r.berdiri_kursi === 1) gerak_ya++; else gerak_tdk++;
                    }
                    if (r.bb_turun !== null && r.bb_turun !== undefined) {
                        if (r.bb_turun === 1 || r.hilang_nafsu_makan === 1 || r.lila_kurang_21 === 1) mal_ya++; else mal_tdk++;
                    }
                    if (r.tes_bisik !== null && r.tes_bisik !== undefined) {
                        if (r.tes_bisik === 1) pen_ya++; else pen_tdk++;
                    }
                    if (r.masalah_mata !== null && r.masalah_mata !== undefined) {
                        if (r.masalah_mata === 1 || r.tes_melihat === 1) li_ya++; else li_tdk++;
                    }
                    if (r.perasaan_sedih !== null && r.perasaan_sedih !== undefined) {
                        if (r.perasaan_sedih === 1 || r.sedikit_minat === 1) dep_ya++; else dep_tdk++;
                    }

                    if (r.skilas_edukasi && r.skilas_edukasi.trim() !== '') edukasi++;
                }

                worksheet.getCell('B' + rowIdx).value = d_dewasa;
                worksheet.getCell('C' + rowIdx).value = d_lansia;
                worksheet.getCell('D' + rowIdx).value = imt1; 
                worksheet.getCell('E' + rowIdx).value = imt2;
                worksheet.getCell('F' + rowIdx).value = imt3;
                worksheet.getCell('G' + rowIdx).value = imt4;
                worksheet.getCell('H' + rowIdx).value = imt5; 
                worksheet.getCell('I' + rowIdx).value = lp_l; 
                worksheet.getCell('J' + rowIdx).value = lp_p; 
                worksheet.getCell('K' + rowIdx).value = td_r; 
                worksheet.getCell('L' + rowIdx).value = td_n; 
                worksheet.getCell('M' + rowIdx).value = td_t; 
                worksheet.getCell('N' + rowIdx).value = gd_r; 
                worksheet.getCell('O' + rowIdx).value = gd_n; 
                worksheet.getCell('P' + rowIdx).value = gd_t; 
                worksheet.getCell('Q' + rowIdx).value = jiwa_rendah; 
                worksheet.getCell('R' + rowIdx).value = jiwa_tinggi; 
                worksheet.getCell('S' + rowIdx).value = ppok; 

                // T, U, V, W, X tidak diketahui format pastinya, dikosongkan 0
                worksheet.getCell('T' + rowIdx).value = 0; 
                worksheet.getCell('U' + rowIdx).value = 0;
                worksheet.getCell('V' + rowIdx).value = 0;
                worksheet.getCell('W' + rowIdx).value = 0;
                worksheet.getCell('X' + rowIdx).value = 0;

                worksheet.getCell('Y' + rowIdx).value = kog_ya; 
                worksheet.getCell('Z' + rowIdx).value = kog_tdk; 
                worksheet.getCell('AA' + rowIdx).value = gerak_ya; 
                worksheet.getCell('AB' + rowIdx).value = gerak_tdk; 
                worksheet.getCell('AC' + rowIdx).value = mal_ya; 
                worksheet.getCell('AD' + rowIdx).value = mal_tdk; 
                worksheet.getCell('AE' + rowIdx).value = pen_ya; 
                worksheet.getCell('AF' + rowIdx).value = pen_tdk; 
                worksheet.getCell('AG' + rowIdx).value = li_ya; 
                worksheet.getCell('AH' + rowIdx).value = li_tdk; 
                worksheet.getCell('AI' + rowIdx).value = dep_ya; 
                worksheet.getCell('AJ' + rowIdx).value = dep_tdk; 
                worksheet.getCell('AK' + rowIdx).value = edukasi; 
                worksheet.getCell('AL' + rowIdx).value = 0; 

            } else {
                const rowIdx = 9 + month; // Jan = row 10
                
                const [results] = await pool.execute(
                    `SELECT COUNT(*) as total_datang 
                     FROM ${tableName} t
                     JOIN data_pasien p ON t.id_pasien = p.id_pasien
                     WHERE YEAR(t.tanggal_kunjungan) = ? AND MONTH(t.tanggal_kunjungan) = ? ${posyandu && posyandu !== 'Semua Posyandu' ? 'AND p.posyandu = ?' : ''}`,
                    posyandu && posyandu !== 'Semua Posyandu' ? [tahun, month, posyandu] : [tahun, month]
                );

                const total = results[0].total_datang || 0;
                
                if (total > 0) {
                    worksheet.getCell('D' + rowIdx).value = total;
                }
            }
        }

        if (isJson) {
            const jsonResult = [];
            let startRow = 10;
            for (let i = 5; i <= 15; i++) {
                const val = worksheet.getCell('A' + i).value;
                if (val && val.toString().trim().toLowerCase().startsWith('jan')) {
                    startRow = i;
                    break;
                }
            }
            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            
            const headers = {};
            let maxCol = 2;
            for (let col = 2; col <= 50; col++) {
                let h1 = worksheet.getCell(startRow - 1, col).value;
                let h2 = worksheet.getCell(startRow - 2, col).value;
                let h3 = worksheet.getCell(startRow - 3, col).value;
                if (h1 || h2 || h3) maxCol = col;
            }

            for (let col = 2; col <= maxCol; col++) {
                let headerParts = [];
                for (let r = startRow - 1; r >= Math.max(1, startRow - 5); r--) {
                    let cellVal = worksheet.getCell(r, col).value;
                    if (typeof cellVal === 'object' && cellVal && cellVal.richText) {
                        cellVal = cellVal.richText.map(t => t.text).join(' ');
                    }
                    if (cellVal) {
                        let str = cellVal.toString().replace(/\n/g, ' ').trim();
                        // Ignore row numbers (e.g. 1, 2, 3...)
                        if (str && !/^\d+$/.test(str)) {
                            if (headerParts.length === 0 || headerParts[headerParts.length - 1] !== str) {
                                headerParts.push(str);
                            }
                        }
                    }
                }
                
                let distinctParts = [];
                for(let p of headerParts) {
                    if(!distinctParts.includes(p)) {
                        distinctParts.push(p);
                    }
                    if(distinctParts.length === 2) break; // Take up to bottom 2 levels to avoid overly long headers
                }
                
                distinctParts.reverse(); // Reverse so it reads TopLevel - SubLevel
                
                let headerStr = distinctParts.length > 0 ? distinctParts.join(' - ') : "Kolom " + col;
                
                let origHeaderStr = headerStr;
                let counter = 2;
                while (Object.values(headers).includes(headerStr)) {
                    headerStr = origHeaderStr + " (" + counter + ")";
                    counter++;
                }
                headers[col] = headerStr;
            }

            for (let m = 0; m < 12; m++) {
                let row = worksheet.getRow(startRow + m);
                let rowObj = { "Bulan": monthNames[m] };
                for (let col = 2; col <= maxCol; col++) {
                    let cellVal = row.getCell(col).value;
                    rowObj[headers[col]] = (cellVal !== null && cellVal !== undefined && cellVal !== '') ? cellVal : '';
                }
                jsonResult.push(rowObj);
            }
            return res.json({ data: jsonResult });
        }

        const exportPath = path.join(os.tmpdir(), `Export_Rekap_${kategori.replace(/[^a-z0-9]/gi, '_')}_${tahun}.xlsx`);
        await workbook.xlsx.writeFile(exportPath);
        
        res.download(exportPath, () => {
            if (fs.existsSync(exportPath)) {
                fs.unlinkSync(exportPath);
            }
        });

    } catch (err) {
        console.error('Export rekap error:', err);
        res.status(500).send('Terjadi kesalahan pada server saat export. Details: ' + err.message + '\n' + err.stack);
    }
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
        console.log(`Buka http://localhost:${PORT} di browser jika jalan di komputer lokal.`);
    });
}

// Export aplikasi untuk environment Serverless (seperti Vercel)
module.exports = app;
