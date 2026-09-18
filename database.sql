CREATE DATABASE IF NOT EXISTS posyandugo;
USE posyandugo;

-- Hapus tabel lama jika ada agar tidak bentrok
DROP TABLE IF EXISTS skrining_ibu_hamil;
DROP TABLE IF EXISTS skrining_bayi_balita;
DROP TABLE IF EXISTS skrining_sekolah_remaja;
DROP TABLE IF EXISTS skrining_dewasa_lansia_fisik;
DROP TABLE IF EXISTS skrining_dewasa_lansia_jiwa;
DROP TABLE IF EXISTS skrining_lansia_skilas;
DROP TABLE IF EXISTS skrining_dewasa;
DROP TABLE IF EXISTS skrining_lansia;
DROP TABLE IF EXISTS skrining_bayi;
DROP TABLE IF EXISTS skrining_balita;
DROP TABLE IF EXISTS data_pasien;

-- Tabel Utama: Data Pasien
CREATE TABLE data_pasien (
    id_pasien INT AUTO_INCREMENT PRIMARY KEY,
    kategori ENUM('Ibu Hamil', 'Bayi & Balita', 'Anak Sekolah & Remaja', 'Dewasa', 'Lansia') NOT NULL,
    sub_kategori VARCHAR(50) DEFAULT NULL,
    nik VARCHAR(16) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    jenis_kelamin ENUM('Laki-laki', 'Perempuan') NOT NULL,
    alamat TEXT,
    no_telepon VARCHAR(15),
    -- Khusus Bayi/Balita/Remaja
    nama_ibu VARCHAR(100),
    nama_ayah VARCHAR(100),
    bb_lahir DECIMAL(5,2),
    pb_lahir DECIMAL(5,2),
    -- Khusus Ibu Hamil
    nama_suami VARCHAR(100),
    jarak_kehamilan VARCHAR(50),
    hamil_anak_ke INT,
    bb_awal DECIMAL(5,2),
    tb_awal DECIMAL(5,2),
    -- Khusus Dewasa/Lansia
    status_perkawinan VARCHAR(50),
    pekerjaan VARCHAR(100),
    -- Asal Posyandu
    posyandu VARCHAR(100)
);

-- Tabel Skrining: Ibu Hamil
CREATE TABLE skrining_ibu_hamil (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    usia_kehamilan INT,
    berat_badan DECIMAL(5,2),
    bb_sesuai_kia INT, -- 1=Ya, 0=Tidak
    lila DECIMAL(5,2),
    lila_lebih_23_5 INT, -- 1=>23.5, 0=<23.5
    sistole INT,
    diastole INT,
    tensi_sesuai_kia INT,
    -- TBC
    batuk_menerus INT,
    demam_2_minggu INT,
    bb_tidak_naik INT,
    kontak_erat_tb INT,
    -- TTD & KEK
    diberikan_ttd VARCHAR(100),
    konsumsi_ttd INT,
    diberikan_mt_bumil_kek VARCHAR(100),
    konsumsi_mt INT,
    -- Edukasi & Rujukan
    ikut_kelas_bumil INT,
    edukasi_diberikan VARCHAR(255),
    rujuk VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Skrining: Bayi, Balita & Pra-Sekolah
CREATE TABLE skrining_bayi_balita (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    umur_bulan INT,
    checklist_perkembangan INT, -- 1=Lengkap, 0=Tidak
    berat_badan DECIMAL(5,2),
    bb_naik INT,
    bb_kurang INT,
    tinggi_badan DECIMAL(5,2),
    tb_pendek INT,
    status_gizi INT, -- 1=Buruk/Kurang/Lebih/Obesitas, 0=Baik
    lingkar_kepala DECIMAL(5,2),
    lk_normal INT, -- 1=Kurang/Normal/Melebihi
    lila DECIMAL(5,2),
    lila_kurang INT,
    -- TBC
    batuk_menerus INT,
    demam_2_minggu INT,
    bb_tidak_naik INT,
    kontak_erat_tb INT,
    -- Layanan
    asi_eks INT,
    mp_asi INT,
    jenis_imunisasi VARCHAR(100),
    vit_a INT,
    obat_cacing INT,
    dapat_mt INT,
    edukasi_diberikan VARCHAR(255),
    gejala_sakit VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Skrining: Sekolah & Remaja
CREATE TABLE skrining_sekolah_remaja (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    berat_badan DECIMAL(5,2),
    tinggi_badan DECIMAL(5,2),
    imt VARCHAR(50),
    lingkar_perut DECIMAL(5,2),
    sistole INT,
    diastole INT,
    kadar_hb DECIMAL(5,2),
    tensi_klasifikasi VARCHAR(50),
    gula_darah VARCHAR(50),
    anemia INT,
    -- TBC
    batuk_menerus INT,
    demam_2_minggu INT,
    bb_tidak_naik INT,
    kontak_erat_tb INT,
    -- HEEADSSS (Ya=1, Tidak=0)
    masalah_di_rumah INT,
    beban_sekolah INT,
    tidak_suka_tubuh INT,
    teman_diluar INT,
    merokok_alkohol INT,
    kesehatan_seksual INT,
    tidak_aman INT,
    ingin_bunuh_diri INT,
    edukasi_diberikan VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Skrining: Dewasa & Lansia (FISIK)
CREATE TABLE skrining_dewasa_lansia_fisik (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    berat_badan DECIMAL(5,2),
    tinggi_badan DECIMAL(5,2),
    status_tb VARCHAR(50),
    lingkar_perut DECIMAL(5,2),
    sistole INT,
    diastole INT,
    hasil_tensi VARCHAR(50),
    gula_darah DECIMAL(5,2),
    mata_kanan VARCHAR(50),
    mata_kiri VARCHAR(50),
    telinga_kanan VARCHAR(50),
    telinga_kiri VARCHAR(50),
    -- PPOK (Skor/Jawaban)
    kelamin INT, -- 1=Laki, 0=Perempuan
    usia INT,
    merokok INT,
    nafas_pendek INT,
    punya_dahak INT,
    spirometri INT,
    skor_ppok INT,
    -- TBC
    batuk_menerus INT,
    demam_2_minggu INT,
    bb_tidak_naik INT,
    kontak_erat_tb INT,
    alat_kontrasepsi VARCHAR(100),
    edukasi_diberikan VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Skrining: Dewasa & Lansia (JIWA / SRQ-20)
CREATE TABLE skrining_dewasa_lansia_jiwa (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    q1 INT, q2 INT, q3 INT, q4 INT, q5 INT,
    q6 INT, q7 INT, q8 INT, q9 INT, q10 INT,
    q11 INT, q12 INT, q13 INT, q14 INT, q15 INT,
    q16 INT, q17 INT, q18 INT, q19 INT, q20 INT,
    edukasi_diberikan VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Skrining: Lansia (SKILAS)
CREATE TABLE skrining_lansia_skilas (
    id_skrining INT AUTO_INCREMENT PRIMARY KEY,
    id_pasien INT NOT NULL,
    tanggal_kunjungan DATE NOT NULL,
    orientasi INT,
    mengulang_kata INT,
    berdiri_kursi INT,
    bb_turun INT,
    hilang_nafsu_makan INT,
    lila_kurang_21 INT,
    masalah_mata INT,
    tes_melihat INT,
    tes_bisik INT,
    tidak_dapat_dilakukan INT,
    perasaan_sedih INT,
    sedikit_minat INT,
    edukasi_diberikan VARCHAR(255),
    FOREIGN KEY (id_pasien) REFERENCES data_pasien(id_pasien) ON DELETE CASCADE
);

-- Tabel Pengguna (Login)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Kader Posyandu', 'Puskesmas') NOT NULL,
    nama_posyandu VARCHAR(100)
);

-- Data Default (Kader dan Puskesmas)
INSERT IGNORE INTO users (username, password, role, nama_posyandu) VALUES 
('PuskesmassCempae@gmail.com', 'PuskesmasCempae', 'Puskesmas', NULL);

