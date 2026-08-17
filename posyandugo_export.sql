-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: posyandugo
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `data_pasien`
--

DROP TABLE IF EXISTS `data_pasien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `data_pasien` (
  `id_pasien` int(11) NOT NULL AUTO_INCREMENT,
  `kategori` enum('Ibu Hamil','Bayi & Balita','Anak Sekolah & Remaja','Dewasa','Lansia') NOT NULL,
  `sub_kategori` varchar(50) DEFAULT NULL,
  `nik` varchar(16) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') NOT NULL,
  `alamat` text DEFAULT NULL,
  `no_telepon` varchar(15) DEFAULT NULL,
  `nama_ibu` varchar(100) DEFAULT NULL,
  `nama_ayah` varchar(100) DEFAULT NULL,
  `bb_lahir` decimal(5,2) DEFAULT NULL,
  `pb_lahir` decimal(5,2) DEFAULT NULL,
  `nama_suami` varchar(100) DEFAULT NULL,
  `jarak_kehamilan` varchar(50) DEFAULT NULL,
  `hamil_anak_ke` int(11) DEFAULT NULL,
  `bb_awal` decimal(5,2) DEFAULT NULL,
  `tb_awal` decimal(5,2) DEFAULT NULL,
  `status_perkawinan` varchar(50) DEFAULT NULL,
  `pekerjaan` varchar(100) DEFAULT NULL,
  `posyandu` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_pasien`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `data_pasien`
--

LOCK TABLES `data_pasien` WRITE;
/*!40000 ALTER TABLE `data_pasien` DISABLE KEYS */;
INSERT INTO `data_pasien` VALUES (1,'Bayi & Balita',NULL,'klnlkn','sjj','2026-03-11','Laki-laki','3232','3232323233','23','32',23.00,31.70,'','',NULL,NULL,NULL,'','','posyandu pusri'),(2,'Ibu Hamil',NULL,'1234567890098765','hjsfdj','2000-07-03','Perempuan','hdjf','12345678900','','',NULL,NULL,'ad','11',38,56.00,67.00,'','','posyandu pusri'),(3,'Ibu Hamil',NULL,'jakdhkjasdhlk','hasdjkg','2000-02-12','Perempuan','ewqwe','12345678909','','',NULL,NULL,'AD','2',3,64.80,54.80,'','','posyandu pusri'),(4,'Ibu Hamil',NULL,'0987654321123456','wrtq','2000-04-03','Perempuan','gfhghgf','12345678909','','',NULL,NULL,'kjkjdsfh','jfhhdfkj',1,78.00,78.20,'','','posyandu pusri'),(5,'Bayi & Balita',NULL,'7372073406250001','Faradiba','2025-06-14','Perempuan','jl. laupe','08234567899','Yunita','Aswan',10.90,96.00,'','',NULL,NULL,NULL,'','','posyandu pusri'),(7,'Bayi & Balita',NULL,'1234567890987654','fais','2026-07-03','Laki-laki','jl...','12345678909','ad','deh',4.00,40.00,'','',NULL,NULL,NULL,'','','posyandu pusri'),(8,'Ibu Hamil','Ibu Nifas/Menyusui','1234567890987654','aisdh','2026-11-10','Perempuan','kh','12345678909','','',NULL,NULL,'ad','deh',1,12.00,150.00,'','','posyandu pusri');
/*!40000 ALTER TABLE `data_pasien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_bayi_balita`
--

DROP TABLE IF EXISTS `skrining_bayi_balita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_bayi_balita` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `umur_bulan` int(11) DEFAULT NULL,
  `checklist_perkembangan` int(11) DEFAULT NULL,
  `berat_badan` decimal(5,2) DEFAULT NULL,
  `bb_naik` int(11) DEFAULT NULL,
  `bb_kurang` int(11) DEFAULT NULL,
  `tinggi_badan` decimal(5,2) DEFAULT NULL,
  `tb_pendek` varchar(50) DEFAULT NULL,
  `status_gizi` int(11) DEFAULT NULL,
  `lingkar_kepala` decimal(5,2) DEFAULT NULL,
  `lk_normal` int(11) DEFAULT NULL,
  `lila` decimal(5,2) DEFAULT NULL,
  `lila_kurang` int(11) DEFAULT NULL,
  `batuk_menerus` int(11) DEFAULT NULL,
  `demam_2_minggu` int(11) DEFAULT NULL,
  `bb_tidak_naik` int(11) DEFAULT NULL,
  `kontak_erat_tb` int(11) DEFAULT NULL,
  `asi_eks` int(11) DEFAULT NULL,
  `mp_asi` int(11) DEFAULT NULL,
  `jenis_imunisasi` varchar(100) DEFAULT NULL,
  `vit_a` int(11) DEFAULT NULL,
  `obat_cacing` int(11) DEFAULT NULL,
  `dapat_mt` int(11) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  `gejala_sakit` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_bayi_balita_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_bayi_balita`
--

LOCK TABLES `skrining_bayi_balita` WRITE;
/*!40000 ALTER TABLE `skrining_bayi_balita` DISABLE KEYS */;
INSERT INTO `skrining_bayi_balita` VALUES (1,1,'2026-08-10',2,0,23.00,1,0,32.00,'1',0,323.00,0,32.00,0,1,1,1,0,0,0,'323',0,0,0,'afddsdasd','323'),(2,1,'2026-09-10',5,1,23.00,1,0,23.00,'0',0,32.00,1,32.00,0,1,0,0,0,1,1,'32',1,1,1,'adaa','tidak ada'),(7,7,'2026-08-09',1,1,3.00,NULL,NULL,40.00,'Sangat Pendek (Stunting)',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(8,7,'2026-09-10',2,NULL,5.00,NULL,NULL,30.00,'Sangat Pendek (Stunting)',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(9,7,'2026-10-10',3,NULL,7.00,NULL,NULL,60.00,'Normal',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(10,7,'2026-11-10',2,NULL,5.00,NULL,NULL,20.00,'Stunting',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(11,1,'2026-11-10',1,NULL,5.00,NULL,NULL,40.00,'Stunting',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(12,5,'2026-11-10',2,NULL,7.00,0,0,70.00,'Stunting',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(13,5,'2026-12-10',5,NULL,7.00,NULL,NULL,87.00,'Normal',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL);
/*!40000 ALTER TABLE `skrining_bayi_balita` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_dewasa_lansia_fisik`
--

DROP TABLE IF EXISTS `skrining_dewasa_lansia_fisik`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_dewasa_lansia_fisik` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `berat_badan` decimal(5,2) DEFAULT NULL,
  `tinggi_badan` decimal(5,2) DEFAULT NULL,
  `status_tb` varchar(50) DEFAULT NULL,
  `lingkar_perut` decimal(5,2) DEFAULT NULL,
  `sistole` int(11) DEFAULT NULL,
  `diastole` int(11) DEFAULT NULL,
  `hasil_tensi` varchar(50) DEFAULT NULL,
  `gula_darah` decimal(5,2) DEFAULT NULL,
  `mata_kanan` varchar(50) DEFAULT NULL,
  `mata_kiri` varchar(50) DEFAULT NULL,
  `telinga_kanan` varchar(50) DEFAULT NULL,
  `telinga_kiri` varchar(50) DEFAULT NULL,
  `kelamin` int(11) DEFAULT NULL,
  `usia` int(11) DEFAULT NULL,
  `merokok` int(11) DEFAULT NULL,
  `nafas_pendek` int(11) DEFAULT NULL,
  `punya_dahak` int(11) DEFAULT NULL,
  `spirometri` int(11) DEFAULT NULL,
  `skor_ppok` int(11) DEFAULT NULL,
  `batuk_menerus` int(11) DEFAULT NULL,
  `demam_2_minggu` int(11) DEFAULT NULL,
  `bb_tidak_naik` int(11) DEFAULT NULL,
  `kontak_erat_tb` int(11) DEFAULT NULL,
  `alat_kontrasepsi` varchar(100) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_dewasa_lansia_fisik_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_dewasa_lansia_fisik`
--

LOCK TABLES `skrining_dewasa_lansia_fisik` WRITE;
/*!40000 ALTER TABLE `skrining_dewasa_lansia_fisik` DISABLE KEYS */;
/*!40000 ALTER TABLE `skrining_dewasa_lansia_fisik` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_dewasa_lansia_jiwa`
--

DROP TABLE IF EXISTS `skrining_dewasa_lansia_jiwa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_dewasa_lansia_jiwa` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `q1` int(11) DEFAULT NULL,
  `q2` int(11) DEFAULT NULL,
  `q3` int(11) DEFAULT NULL,
  `q4` int(11) DEFAULT NULL,
  `q5` int(11) DEFAULT NULL,
  `q6` int(11) DEFAULT NULL,
  `q7` int(11) DEFAULT NULL,
  `q8` int(11) DEFAULT NULL,
  `q9` int(11) DEFAULT NULL,
  `q10` int(11) DEFAULT NULL,
  `q11` int(11) DEFAULT NULL,
  `q12` int(11) DEFAULT NULL,
  `q13` int(11) DEFAULT NULL,
  `q14` int(11) DEFAULT NULL,
  `q15` int(11) DEFAULT NULL,
  `q16` int(11) DEFAULT NULL,
  `q17` int(11) DEFAULT NULL,
  `q18` int(11) DEFAULT NULL,
  `q19` int(11) DEFAULT NULL,
  `q20` int(11) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_dewasa_lansia_jiwa_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_dewasa_lansia_jiwa`
--

LOCK TABLES `skrining_dewasa_lansia_jiwa` WRITE;
/*!40000 ALTER TABLE `skrining_dewasa_lansia_jiwa` DISABLE KEYS */;
/*!40000 ALTER TABLE `skrining_dewasa_lansia_jiwa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_ibu_hamil`
--

DROP TABLE IF EXISTS `skrining_ibu_hamil`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_ibu_hamil` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `usia_kehamilan` int(11) DEFAULT NULL,
  `berat_badan` decimal(5,2) DEFAULT NULL,
  `bb_sesuai_kia` int(11) DEFAULT NULL,
  `lila` decimal(5,2) DEFAULT NULL,
  `lila_lebih_23_5` int(11) DEFAULT NULL,
  `sistole` int(11) DEFAULT NULL,
  `diastole` int(11) DEFAULT NULL,
  `tensi_sesuai_kia` int(11) DEFAULT NULL,
  `batuk_menerus` int(11) DEFAULT NULL,
  `demam_2_minggu` int(11) DEFAULT NULL,
  `bb_tidak_naik` int(11) DEFAULT NULL,
  `kontak_erat_tb` int(11) DEFAULT NULL,
  `diberikan_ttd` varchar(100) DEFAULT NULL,
  `konsumsi_ttd` int(11) DEFAULT NULL,
  `diberikan_mt_bumil_kek` varchar(100) DEFAULT NULL,
  `konsumsi_mt` int(11) DEFAULT NULL,
  `ikut_kelas_bumil` int(11) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  `rujuk` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_ibu_hamil_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_ibu_hamil`
--

LOCK TABLES `skrining_ibu_hamil` WRITE;
/*!40000 ALTER TABLE `skrining_ibu_hamil` DISABLE KEYS */;
INSERT INTO `skrining_ibu_hamil` VALUES (1,2,'2026-08-10',3,80.00,1,89.20,1,110,90,1,0,1,0,1,'12',1,'tidak',0,1,'jkgsalkgsdakf','tidak'),(2,3,'2026-08-10',4,80.00,1,90.00,1,120,90,1,0,1,0,1,'12',1,'12',1,1,'dmnbsdabsdamn','tidak'),(3,4,'2026-08-10',8,170.00,1,118.90,1,120,90,1,1,1,1,1,'12',1,'tidak',0,1,'jkagskjlghalkfdf','tdiak');
/*!40000 ALTER TABLE `skrining_ibu_hamil` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_lansia_skilas`
--

DROP TABLE IF EXISTS `skrining_lansia_skilas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_lansia_skilas` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `orientasi` int(11) DEFAULT NULL,
  `mengulang_kata` int(11) DEFAULT NULL,
  `berdiri_kursi` int(11) DEFAULT NULL,
  `bb_turun` int(11) DEFAULT NULL,
  `hilang_nafsu_makan` int(11) DEFAULT NULL,
  `lila_kurang_21` int(11) DEFAULT NULL,
  `masalah_mata` int(11) DEFAULT NULL,
  `tes_melihat` int(11) DEFAULT NULL,
  `tes_bisik` int(11) DEFAULT NULL,
  `tidak_dapat_dilakukan` int(11) DEFAULT NULL,
  `perasaan_sedih` int(11) DEFAULT NULL,
  `sedikit_minat` int(11) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_lansia_skilas_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_lansia_skilas`
--

LOCK TABLES `skrining_lansia_skilas` WRITE;
/*!40000 ALTER TABLE `skrining_lansia_skilas` DISABLE KEYS */;
/*!40000 ALTER TABLE `skrining_lansia_skilas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skrining_sekolah_remaja`
--

DROP TABLE IF EXISTS `skrining_sekolah_remaja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `skrining_sekolah_remaja` (
  `id_skrining` int(11) NOT NULL AUTO_INCREMENT,
  `id_pasien` int(11) NOT NULL,
  `tanggal_kunjungan` date NOT NULL,
  `berat_badan` decimal(5,2) DEFAULT NULL,
  `tinggi_badan` decimal(5,2) DEFAULT NULL,
  `imt` varchar(50) DEFAULT NULL,
  `lingkar_perut` decimal(5,2) DEFAULT NULL,
  `sistole` int(11) DEFAULT NULL,
  `diastole` int(11) DEFAULT NULL,
  `kadar_hb` decimal(5,2) DEFAULT NULL,
  `tensi_klasifikasi` varchar(50) DEFAULT NULL,
  `gula_darah` varchar(50) DEFAULT NULL,
  `anemia` int(11) DEFAULT NULL,
  `batuk_menerus` int(11) DEFAULT NULL,
  `demam_2_minggu` int(11) DEFAULT NULL,
  `bb_tidak_naik` int(11) DEFAULT NULL,
  `kontak_erat_tb` int(11) DEFAULT NULL,
  `masalah_di_rumah` int(11) DEFAULT NULL,
  `beban_sekolah` int(11) DEFAULT NULL,
  `tidak_suka_tubuh` int(11) DEFAULT NULL,
  `teman_diluar` int(11) DEFAULT NULL,
  `merokok_alkohol` int(11) DEFAULT NULL,
  `kesehatan_seksual` int(11) DEFAULT NULL,
  `tidak_aman` int(11) DEFAULT NULL,
  `ingin_bunuh_diri` int(11) DEFAULT NULL,
  `edukasi_diberikan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_skrining`),
  KEY `id_pasien` (`id_pasien`),
  CONSTRAINT `skrining_sekolah_remaja_ibfk_1` FOREIGN KEY (`id_pasien`) REFERENCES `data_pasien` (`id_pasien`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skrining_sekolah_remaja`
--

LOCK TABLES `skrining_sekolah_remaja` WRITE;
/*!40000 ALTER TABLE `skrining_sekolah_remaja` DISABLE KEYS */;
/*!40000 ALTER TABLE `skrining_sekolah_remaja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Kader Posyandu','Puskesmas') NOT NULL,
  `nama_posyandu` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'pusri','pusri123','Kader Posyandu','posyandu pusri'),(2,'puskesmas','puskesmas123','Puskesmas',NULL),(4,'Melati','Melati123','Kader Posyandu','Posyandu Melati');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-17 15:37:58
