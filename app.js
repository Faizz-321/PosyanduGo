const API_URL = '/api';
let currentCategory = 'Ibu Hamil'; // Default kategori saat web dibuka
let patients = [];
let currentScreenings = [];
let currentUser = null;

// ==========================================
// INISIALISASI & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Cek Session Login
    const sessionStr = sessionStorage.getItem('posyandugo_user');
    if (!sessionStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(sessionStr);
    currentUser = user;

    // Logout handling
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('posyandugo_user');
            window.location.href = 'login.html';
        });
    }

    // Role-based UI limitations
    const brandLogoText = document.getElementById('brand-logo-text');
    if (user.role === 'Puskesmas') {
        if (brandLogoText) brandLogoText.textContent = 'PuskesmasGo';
        
        // Hanya boleh Bayi & Balita dan Rekap
        currentCategory = 'Bayi & Balita';
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
            const cat = btn.getAttribute('data-category');
            if (cat && cat !== 'Bayi & Balita' && cat !== 'Rekapitulasi' && cat !== 'Manajemen Akun') {
                btn.style.display = 'none';
            }
        });
        
        const btnAkun = document.getElementById('btnMenuAkun');
        if (btnAkun) btnAkun.style.display = 'flex';
        
        const filterPosyandu = document.getElementById('filterGlobalPosyandu');
        if (filterPosyandu) {
            filterPosyandu.style.display = 'block';
            fetch(`${API_URL}/posyandu`)
                .then(res => res.json())
                .then(data => {
                    data.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p;
                        opt.textContent = p;
                        filterPosyandu.appendChild(opt);
                    });
                })
                .catch(err => console.error(err));
            filterPosyandu.addEventListener('change', () => {
                applyFilters();
            });
        }
        
        // Pilih menu Bayi & Balita secara default
        const bayiBtn = document.querySelector('.sidebar-nav .nav-item[data-category="Bayi & Balita"]');
        if(bayiBtn) {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
            bayiBtn.classList.add('active');
        }
        
        document.getElementById('page-title').textContent = 'Daftar Pasien Bayi & Balita';
        const filterBayiContainer = document.getElementById('filterBayiContainer');
        if (filterBayiContainer) filterBayiContainer.style.display = 'none';
        
        // Sembunyikan tombol Tambah Pasien Baru
        const btnTambah = document.getElementById('btnTambahPasien');
        if (btnTambah) btnTambah.style.display = 'none';

        // (Semua kategori rekapitulasi kini diizinkan untuk puskesmas)
    }

    loadPatients();

    // Event listener untuk menu sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentCategory = e.target.getAttribute('data-category');
            
            if (currentCategory === 'Rekapitulasi') {
                document.getElementById('page-title').textContent = 'Rekapitulasi Bulanan';
                document.getElementById('page-subtitle').textContent = 'Download laporan rekapitulasi per bulan';
                document.getElementById('patientListSection').style.display = 'none';
                document.getElementById('rekapSection').style.display = 'block';
                document.getElementById('akunSection').style.display = 'none';
                document.querySelector('.header-actions').style.display = 'flex';
                document.getElementById('searchInput').style.display = 'none';
                const btnTambah = document.getElementById('btnTambahPasien');
                if (btnTambah) btnTambah.style.display = 'none';
            } else if (currentCategory === 'Manajemen Akun') {
                document.getElementById('page-title').textContent = 'Manajemen Akun Posyandu';
                document.getElementById('page-subtitle').textContent = 'Kelola akun kader untuk setiap posyandu';
                document.getElementById('patientListSection').style.display = 'none';
                document.getElementById('rekapSection').style.display = 'none';
                document.getElementById('akunSection').style.display = 'block';
                document.querySelector('.header-actions').style.display = 'none';
                loadAkun();
            } else {
                document.getElementById('page-title').textContent = `Daftar Pasien ${currentCategory}`;
                document.getElementById('page-subtitle').textContent = 'Kelola data skrining dan pemeriksaan kesehatan';
                document.getElementById('patientListSection').style.display = 'block';
                document.getElementById('rekapSection').style.display = 'none';
                document.getElementById('akunSection').style.display = 'none';
                document.querySelector('.header-actions').style.display = 'flex';
                document.getElementById('searchInput').style.display = 'inline-block';
                const btnTambah = document.getElementById('btnTambahPasien');
                if (btnTambah && currentUser && currentUser.role !== 'Puskesmas') {
                    btnTambah.style.display = 'inline-block';
                }
                
                const filterBayiContainer = document.getElementById('filterBayiContainer');
                if (filterBayiContainer) {
                    if ((currentCategory === 'Bayi, Balita & Pra-Sekolah' || currentCategory === 'Bayi & Balita') && (!currentUser || currentUser.role !== 'Puskesmas')) {
                        filterBayiContainer.style.display = 'flex';
                    } else {
                        filterBayiContainer.style.display = 'none';
                    }
                    document.getElementById('filterStunting').checked = false;
                }

                loadPatients();
            }

            // Tutup menu otomatis di tampilan mobile setelah memilih
            const sidebarNav = document.getElementById('sidebar-nav');
            if (window.innerWidth <= 768 && sidebarNav) {
                sidebarNav.classList.remove('show');
            }
        });
    });

    // Fitur Pencarian & Filter
    function applyFilters() {
        const term = document.getElementById('searchInput').value.toLowerCase();
        const filterStunting = document.getElementById('filterStunting');
        
        let posyVal = 'Semua Posyandu';
        if (currentUser && currentUser.role === 'Puskesmas') {
            const filterPosyandu = document.getElementById('filterGlobalPosyandu');
            posyVal = filterPosyandu ? filterPosyandu.value : 'Semua Posyandu';
        } else if (currentUser && currentUser.nama_posyandu) {
            posyVal = currentUser.nama_posyandu;
        }
        
        // Puskesmas HANYA boleh melihat pasien stunting / gizi kurang
        const showStunting = (currentUser && currentUser.role === 'Puskesmas') ? true : (filterStunting ? filterStunting.checked : false);
        
        const filtered = patients.filter(p => {
            const matchSearch = p.nama.toLowerCase().includes(term) || p.nik.includes(term);
            const isStunting = p.tb_pendek == 1 || p.tb_pendek === 'Stunting' || p.tb_pendek === 'Sangat Pendek (Stunting)' || p.tb_pendek === 'Pendek (Stunting)';
            const isGiziKurang = p.status_gizi == 1 || p.bb_kurang == 1;
            const matchStunting = showStunting ? (isStunting || isGiziKurang) : true;
            const matchPosyandu = (posyVal === 'Semua Posyandu') ? true : (p.posyandu === posyVal);
            return matchSearch && matchStunting && matchPosyandu;
        });
        renderTable(filtered);
    }
    window.applyFilters = applyFilters;

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    const filterCheckbox = document.getElementById('filterStunting');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', applyFilters);
    }

    // Tambah Pasien
    document.getElementById('btnTambahPasien').addEventListener('click', () => {
        document.getElementById('formPasien').reset();
        document.getElementById('idPasienEdit').value = '';
        document.getElementById('modal-pasien-title').textContent = 'Tambah Pasien Baru';
        document.getElementById('modal-pasien-subtitle').textContent = `Kategori: ${currentCategory}`;
        document.getElementById('kategoriPasien').value = currentCategory;
        
        // Atur field dinamis di form pasien
        document.querySelectorAll('.dynamic-field').forEach(el => el.style.display = 'none');
        document.getElementById('subKategori').removeAttribute('required');
        document.getElementById('fieldJenisKelamin').style.display = 'block'; // Tampilkan default
        document.getElementById('subKategori').innerHTML = '<option value="">-- Pilih --</option>';

        if (currentCategory === 'Dewasa & Lansia') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Dewasa">Dewasa (18 - 59 Tahun)</option>
                <option value="Lansia">Lansia (≥ 60 Tahun)</option>
            `;
            document.getElementById('fieldStatusPerkawinan').style.display = 'block';
            document.getElementById('fieldPekerjaan').style.display = 'block';
        } else if (currentCategory === 'Ibu Hamil') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Ibu Hamil">Ibu Hamil</option>
                <option value="Ibu Nifas/Menyusui">Ibu Nifas/Menyusui</option>
            `;
            document.getElementById('fieldNamaSuami').style.display = 'block';
            document.getElementById('fieldJarakKehamilan').style.display = 'block';
            document.getElementById('fieldHamilKe').style.display = 'block';
            document.querySelectorAll('.fieldIbuHamil').forEach(el => el.style.display = 'block');
            
            // Sembunyikan jenis kelamin dan set otomatis Perempuan
            document.getElementById('fieldJenisKelamin').style.display = 'none';
            document.getElementById('jkP').checked = true;
        } else if (currentCategory === 'Bayi & Balita') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Bayi (0 - 6 Bulan)">Bayi (0 - 6 Bulan)</option>
                <option value="Balita & Apras (6 Bulan - 6 Tahun)">Balita & Apras (6 Bulan - 6 Tahun)</option>
            `;
            document.querySelectorAll('.fieldAnak').forEach(el => el.style.display = 'block');
        } else if (currentCategory === 'Anak Sekolah & Remaja') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="6 - 14 Tahun">6 - 14 Tahun</option>
                <option value="15 - 18 Tahun">15 - 18 Tahun</option>
            `;
            document.querySelectorAll('.fieldRemaja').forEach(el => el.style.display = 'block');
        }

        document.getElementById('modalPasien').classList.remove('hidden');
    });

    // Toggle menu hamburger untuk mobile
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarNav = document.getElementById('sidebar-nav');
    if (hamburgerBtn && sidebarNav) {
        hamburgerBtn.addEventListener('click', () => {
            sidebarNav.classList.toggle('show');
        });
    }
});

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// ==========================================
// MANAJEMEN PASIEN
// ==========================================
async function loadPatients() {
    try {
        const res = await fetch(`${API_URL}/patients?kategori=${encodeURIComponent(currentCategory)}`, { cache: 'no-store' });
        patients = await res.json();
        applyFilters();
    } catch (err) {
        console.error('Gagal memuat data:', err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById('patientList');
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Belum ada data pasien di kategori ini.</td></tr>`;
        return;
    }

    data.forEach(p => {
        let aksiButtons = '';
        let exportButtons = '';

        let downloadBtnHtml = (type, id, nama, label) => `
            <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #3b82f6; color: white; border: none;" onclick="exportExcel('${type}', ${id})">⬇️ ${label} Excel</button>
        `;

        if (p.kategori === 'Ibu Hamil') {
            aksiButtons = `<button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="bukaFormSkrining('ibu_hamil', ${p.id_pasien}, '${p.nama}')">📝 Isi Skrining</button>`;
            exportButtons = `
                <div style="display:flex; gap: 4px;">
                    ${downloadBtnHtml('ibu_hamil', p.id_pasien, p.nama, 'Download')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('ibu_hamil', ${p.id_pasien})">👁️ Lihat</button>
                </div>`;
        } else if (p.kategori === 'Bayi & Balita') {
            aksiButtons = `<button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="bukaFormSkrining('bayi_balita', ${p.id_pasien}, '${p.nama}')">📝 Isi Skrining</button>`;
            exportButtons = `
                <div style="display:flex; gap: 4px;">
                    ${downloadBtnHtml('bayi_balita', p.id_pasien, p.nama, 'Download')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('bayi_balita', ${p.id_pasien})">👁️ Lihat</button>
                </div>`;
        } else if (p.kategori === 'Anak Sekolah & Remaja') {
            aksiButtons = `<button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="bukaFormSkrining('sekolah_remaja', ${p.id_pasien}, '${p.nama}')">📝 Isi Skrining</button>`;
            exportButtons = `
                <div style="display:flex; gap: 4px;">
                    ${downloadBtnHtml('sekolah_remaja', p.id_pasien, p.nama, 'Download')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('sekolah_remaja', ${p.id_pasien})">👁️ Lihat</button>
                </div>`;
        } else if (p.kategori === 'Dewasa') {
            aksiButtons = `
                <button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px; margin-bottom:4px;" onclick="bukaFormSkrining('dewasa_lansia_fisik', ${p.id_pasien}, '${p.nama}')">🩺 Fisik</button>
                <button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="bukaFormSkrining('dewasa_lansia_jiwa', ${p.id_pasien}, '${p.nama}')">🧠 Jiwa</button>
            `;
            exportButtons = `
                <div style="display:flex; gap: 4px; margin-bottom:4px;">
                    ${downloadBtnHtml('dewasa_lansia_fisik', p.id_pasien, p.nama, 'Download Fisik')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('dewasa_lansia_fisik', ${p.id_pasien})">👁️ Lihat</button>
                </div>
                <div style="display:flex; gap: 4px;">
                    ${downloadBtnHtml('dewasa_lansia_jiwa', p.id_pasien, p.nama, 'Download Jiwa')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('dewasa_lansia_jiwa', ${p.id_pasien})">👁️ Lihat</button>
                </div>
            `;
        } else if (p.kategori === 'Lansia') {
            aksiButtons = `
                <button class="btn btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="bukaFormSkrining('lansia_skilas', ${p.id_pasien}, '${p.nama}')">👵 SKILAS</button>
            `;
            exportButtons = `
                <div style="display:flex; gap: 4px;">
                    ${downloadBtnHtml('lansia_skilas', p.id_pasien, p.nama, 'Download')}
                    <button class="btn" style="font-size: 12px; padding: 6px 10px; flex: 1; background-color: #0ea5e9; color: white; border: none;" onclick="lihatRiwayat('lansia_skilas', ${p.id_pasien})">👁️ Lihat</button>
                </div>
            `;
        }

        const tr = document.createElement('tr');
        
        let namaHtml = `<strong>${p.nama}</strong>`;
        if (p.kategori === 'Bayi & Balita' || p.kategori === 'Bayi, Balita & Pra-Sekolah') {
            let tags = [];
            if (p.tb_pendek == 1 || p.tb_pendek === 'Stunting' || p.tb_pendek === 'Sangat Pendek (Stunting)' || p.tb_pendek === 'Pendek (Stunting)') {
                tags.push('<span style="background:var(--danger-light); color:var(--danger-color); font-size:11px; padding:4px 8px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px; border:1px solid rgba(239, 68, 68, 0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>Stunting</span>');
            }
            if (p.status_gizi == 1 || p.bb_kurang == 1) {
                tags.push('<span style="background:#fffbeb; color:#d97706; font-size:11px; padding:4px 8px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px; border:1px solid rgba(217, 119, 6, 0.2);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>Gizi Kurang</span>');
            }
            if (tags.length > 0) {
                namaHtml += '<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">' + tags.join('') + '</div>';
            }
        } // Closing bracket for Bayi & Balita

        if (p.sub_kategori) {
            namaHtml += `<br><small style="color:var(--secondary-color)">${p.sub_kategori}</small>`;
        } else if (p.kategori === 'Dewasa' || p.kategori === 'Lansia') {
            namaHtml += `<br><small style="color:var(--secondary-color)">${p.kategori}</small>`;
        }

        tr.innerHTML = `
            <td>${p.nik}</td>
            <td>${namaHtml}</td>
            <td>${p.posyandu || '-'}</td>
            <td>${new Date(p.tanggal_lahir).toLocaleDateString('id-ID')}</td>
            <td>${p.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
            <td>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${currentUser && currentUser.role !== 'Puskesmas' ? `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${aksiButtons}
                    </div>` : ''}
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        ${exportButtons}
                    </div>
                    ${currentUser && currentUser.role !== 'Puskesmas' ? `
                    <div style="display:flex; gap:4px; margin-top:4px;">
                        <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px; flex: 1;" onclick="editPasien(${p.id_pasien})">✏️ Edit</button>
                        <button class="btn btn-danger" style="font-size: 12px; padding: 6px 10px; flex: 1;" onclick="hapusPasien(${p.id_pasien})">🗑️ Hapus</button>
                    </div>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function simpanPasien() {
    const nik = document.getElementById('nik').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const tglLahir = document.getElementById('tanggalLahir').value;
    
    let jk = '';
    if(document.getElementById('jkL').checked) jk = 'Laki-laki';
    if(document.getElementById('jkP').checked) jk = 'Perempuan';

    let kat = document.getElementById('kategoriPasien').value;
    if (kat === 'Ibu Hamil') {
        jk = 'Perempuan'; // For Ibu Hamil, gender must be Perempuan
    }

    if (!nik || !nama || !tglLahir || !jk) {
        alert("Harap lengkapi semua data wajib (NIK, Nama, Tgl Lahir, Jenis Kelamin)!");
        return;
    }
    
    const subKategori = document.getElementById('subKategori').value;
    if (!subKategori) {
        alert("Harap pilih Sub-Kategori / Kelompok Usia Pasien!");
        return;
    }

    const idEdit = document.getElementById('idPasienEdit').value;

    let finalKategori = kat;
    if (kat === 'Dewasa & Lansia') {
        finalKategori = subKategori; // 'Dewasa' or 'Lansia'
    }

    const payload = {
        kategori: finalKategori,
        sub_kategori: subKategori,
        nik: document.getElementById('nik').value,
        nama: document.getElementById('nama').value,
        tanggal_lahir: document.getElementById('tanggalLahir').value,
        jenis_kelamin: document.querySelector('input[name="jenisKelamin"]:checked').value,
        nama_ibu: document.getElementById('namaIbu') ? document.getElementById('namaIbu').value : '',
        nama_ayah: document.getElementById('namaAyah') ? document.getElementById('namaAyah').value : '',
        bb_lahir: document.getElementById('bbLahir') ? document.getElementById('bbLahir').value : null,
        pb_lahir: document.getElementById('pbLahir') ? document.getElementById('pbLahir').value : null,
        status_perkawinan: document.getElementById('statusPerkawinan').value,
        pekerjaan: document.getElementById('pekerjaan').value,
        alamat: document.getElementById('alamat').value,
        no_telepon: document.getElementById('noTelepon').value,
        nama_suami: document.getElementById('namaSuami') ? document.getElementById('namaSuami').value : '',
        jarak_kehamilan: document.getElementById('jarakKehamilan') ? document.getElementById('jarakKehamilan').value : '',
        hamil_anak_ke: document.getElementById('hamilAnakKe') ? document.getElementById('hamilAnakKe').value : null,
        bb_awal: document.getElementById('bbAwal') ? document.getElementById('bbAwal').value : null,
        tb_awal: document.getElementById('tbAwal') ? document.getElementById('tbAwal').value : null,
        posyandu: currentUser && currentUser.nama_posyandu ? currentUser.nama_posyandu : 'Posyandu Utama'
    };

    try {
        let res;
        if (idEdit) {
            res = await fetch(`${API_URL}/patients/${idEdit}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_URL}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        const data = await res.json();
        closeModal('modalPasien');
        loadPatients();
    } catch (err) {
        alert("Gagal menyimpan pasien");
        console.error(err);
    }
}

function showConfirm(message, onConfirm) {
    document.getElementById('confirm-modal-message').innerText = message;
    document.getElementById('modalConfirm').classList.remove('hidden');
    
    const btn = document.getElementById('btnConfirmAction');
    btn.onclick = () => {
        closeModal('modalConfirm');
        onConfirm();
    };
}

async function hapusPasien(id) {
    showConfirm("Yakin ingin menghapus pasien ini?", async () => {
        try {
            await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
            loadPatients();
        } catch (err) {
            alert("Gagal menghapus");
        }
    });
}

function editPasien(id) {
    const p = patients.find(x => x.id_pasien === id);
    if(!p) return;
    
    document.getElementById('formPasien').reset();
    document.getElementById('idPasienEdit').value = p.id_pasien;
    
    // Set UI category based on current tab
    document.getElementById('kategoriPasien').value = p.kategori === 'Dewasa' || p.kategori === 'Lansia' ? 'Dewasa & Lansia' : p.kategori;
    
    // Trigger modal logic for dynamic fields
    document.getElementById('subKategori').removeAttribute('required');
    document.getElementById('subKategori').innerHTML = '<option value="">-- Pilih --</option>';
    
    const btnCategory = document.querySelector(`.nav-item[data-category="${document.getElementById('kategoriPasien').value}"]`);
    if(btnCategory) {
        document.querySelectorAll('.dynamic-field').forEach(el => el.style.display = 'none');
        
        let targetCategory = document.getElementById('kategoriPasien').value;
        
        if (targetCategory === 'Ibu Hamil') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Ibu Hamil">Ibu Hamil</option>
                <option value="Ibu Nifas/Menyusui">Ibu Nifas/Menyusui</option>
            `;
            document.getElementById('fieldNamaSuami').style.display = 'block';
            document.getElementById('fieldJarakKehamilan').style.display = 'block';
            document.getElementById('fieldHamilKe').style.display = 'block';
            document.querySelectorAll('.fieldIbuHamil').forEach(el => el.style.display = 'block');
            document.getElementById('fieldJenisKelamin').style.display = 'none';
        } else if (targetCategory === 'Bayi & Balita') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Bayi (0 - 6 Bulan)">Bayi (0 - 6 Bulan)</option>
                <option value="Balita & Apras (6 Bulan - 6 Tahun)">Balita & Apras (6 Bulan - 6 Tahun)</option>
            `;
            document.querySelectorAll('.fieldAnak').forEach(el => el.style.display = 'block');
            document.getElementById('fieldJenisKelamin').style.display = 'block';
        } else if (targetCategory === 'Anak Sekolah & Remaja') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="6 - 14 Tahun">6 - 14 Tahun</option>
                <option value="15 - 18 Tahun">15 - 18 Tahun</option>
            `;
            document.querySelectorAll('.fieldRemaja').forEach(el => el.style.display = 'block');
            document.getElementById('fieldJenisKelamin').style.display = 'block';
        } else if (targetCategory === 'Dewasa & Lansia') {
            document.getElementById('fieldPilihKategoriUsia').style.display = 'block';
            document.getElementById('subKategori').setAttribute('required', 'true');
            document.getElementById('subKategori').innerHTML += `
                <option value="Dewasa">Dewasa (18 - 59 Tahun)</option>
                <option value="Lansia">Lansia (≥ 60 Tahun)</option>
            `;
            document.getElementById('fieldStatusPerkawinan').style.display = 'block';
            document.getElementById('fieldPekerjaan').style.display = 'block';
            document.getElementById('fieldJenisKelamin').style.display = 'block';
        }
    }
    
    // Set value subKategori
    if (p.kategori === 'Dewasa' || p.kategori === 'Lansia') {
        document.getElementById('subKategori').value = p.kategori;
    } else if (p.sub_kategori) {
        document.getElementById('subKategori').value = p.sub_kategori;
    }
    
    document.getElementById('nik').value = p.nik;
    document.getElementById('nama').value = p.nama;
    document.getElementById('tanggalLahir').value = new Date(p.tanggal_lahir).toISOString().split('T')[0];
    
    if(p.jenis_kelamin === 'Laki-laki') {
        document.getElementById('jkL').checked = true;
    } else {
        document.getElementById('jkP').checked = true;
    }

    if (document.getElementById('namaIbu')) document.getElementById('namaIbu').value = p.nama_ibu || '';
    if (document.getElementById('namaAyah')) document.getElementById('namaAyah').value = p.nama_ayah || '';
    if (document.getElementById('bbLahir')) document.getElementById('bbLahir').value = p.bb_lahir || '';
    if (document.getElementById('pbLahir')) document.getElementById('pbLahir').value = p.pb_lahir || '';
    if (document.getElementById('statusPerkawinan')) document.getElementById('statusPerkawinan').value = p.status_perkawinan || '';
    if (document.getElementById('pekerjaan')) document.getElementById('pekerjaan').value = p.pekerjaan || '';
    if (document.getElementById('alamat')) document.getElementById('alamat').value = p.alamat || '';
    if (document.getElementById('noTelepon')) document.getElementById('noTelepon').value = p.no_telepon || '';
    if (document.getElementById('namaSuami')) document.getElementById('namaSuami').value = p.nama_suami || '';
    if (document.getElementById('jarakKehamilan')) document.getElementById('jarakKehamilan').value = p.jarak_kehamilan || '';
    if (document.getElementById('hamilAnakKe')) document.getElementById('hamilAnakKe').value = p.hamil_anak_ke || '';
    if (document.getElementById('bbAwal')) document.getElementById('bbAwal').value = p.bb_awal || '';
    if (document.getElementById('tbAwal')) document.getElementById('tbAwal').value = p.tb_awal || '';
    
    document.getElementById('modalPasien').classList.remove('hidden');
}


// ==========================================
// LOGIKA FORM SKRINING (DINAMIS)
// ==========================================


// ==========================================
// ==========================================
// DATA STANDAR WHO (LMS) UNTUK Z-SCORE STUNTING
// ==========================================
const lmsLookup = {
  "boys": [
    {
      "L": 1,
      "M": 49.8842,
      "S": 0.03795
    },
    {
      "L": 1,
      "M": 54.6645,
      "S": 0.03559
    },
    {
      "L": 1,
      "M": 58.4384,
      "S": 0.03423
    },
    {
      "L": 1,
      "M": 61.4013,
      "S": 0.03329
    },
    {
      "L": 1,
      "M": 63.9041,
      "S": 0.03257
    },
    {
      "L": 1,
      "M": 65.8912,
      "S": 0.03204
    },
    {
      "L": 1,
      "M": 67.6435,
      "S": 0.03165
    },
    {
      "L": 1,
      "M": 69.1615,
      "S": 0.03139
    },
    {
      "L": 1,
      "M": 70.6224,
      "S": 0.03124
    },
    {
      "L": 1,
      "M": 71.9714,
      "S": 0.03117
    },
    {
      "L": 1,
      "M": 73.2653,
      "S": 0.03118
    },
    {
      "L": 1,
      "M": 74.5464,
      "S": 0.03125
    },
    {
      "L": 1,
      "M": 75.7391,
      "S": 0.03137
    },
    {
      "L": 1,
      "M": 76.9304,
      "S": 0.03154
    },
    {
      "L": 1,
      "M": 78.0451,
      "S": 0.03174
    },
    {
      "L": 1,
      "M": 79.1613,
      "S": 0.03197
    },
    {
      "L": 1,
      "M": 80.2113,
      "S": 0.03222
    },
    {
      "L": 1,
      "M": 81.234,
      "S": 0.03249
    },
    {
      "L": 1,
      "M": 82.2628,
      "S": 0.03279
    },
    {
      "L": 1,
      "M": 83.2318,
      "S": 0.0331
    },
    {
      "L": 1,
      "M": 84.2074,
      "S": 0.03342
    },
    {
      "L": 1,
      "M": 85.1291,
      "S": 0.03375
    },
    {
      "L": 1,
      "M": 86.0589,
      "S": 0.0341
    },
    {
      "L": 1,
      "M": 86.9392,
      "S": 0.03445
    },
    {
      "L": 1,
      "M": 87.1303,
      "S": 0.03508
    },
    {
      "L": 1,
      "M": 87.9737,
      "S": 0.03542
    },
    {
      "L": 1,
      "M": 88.7964,
      "S": 0.03576
    },
    {
      "L": 1,
      "M": 89.6247,
      "S": 0.0361
    },
    {
      "L": 1,
      "M": 90.4056,
      "S": 0.03642
    },
    {
      "L": 1,
      "M": 91.1906,
      "S": 0.03674
    },
    {
      "L": 1,
      "M": 91.9297,
      "S": 0.03704
    },
    {
      "L": 1,
      "M": 92.6735,
      "S": 0.03733
    },
    {
      "L": 1,
      "M": 93.3753,
      "S": 0.03761
    },
    {
      "L": 1,
      "M": 94.0612,
      "S": 0.03787
    },
    {
      "L": 1,
      "M": 94.7559,
      "S": 0.03812
    },
    {
      "L": 1,
      "M": 95.4168,
      "S": 0.03836
    },
    {
      "L": 1,
      "M": 96.0889,
      "S": 0.03858
    },
    {
      "L": 1,
      "M": 96.7298,
      "S": 0.03879
    },
    {
      "L": 1,
      "M": 97.3827,
      "S": 0.039
    },
    {
      "L": 1,
      "M": 98.006,
      "S": 0.03919
    },
    {
      "L": 1,
      "M": 98.6412,
      "S": 0.03937
    },
    {
      "L": 1,
      "M": 99.2471,
      "S": 0.03954
    },
    {
      "L": 1,
      "M": 99.8441,
      "S": 0.0397
    },
    {
      "L": 1,
      "M": 100.4522,
      "S": 0.03986
    },
    {
      "L": 1,
      "M": 101.0326,
      "S": 0.04002
    },
    {
      "L": 1,
      "M": 101.6246,
      "S": 0.04017
    },
    {
      "L": 1,
      "M": 102.191,
      "S": 0.04031
    },
    {
      "L": 1,
      "M": 102.7706,
      "S": 0.04045
    },
    {
      "L": 1,
      "M": 103.3273,
      "S": 0.04059
    },
    {
      "L": 1,
      "M": 103.8806,
      "S": 0.04073
    },
    {
      "L": 1,
      "M": 104.4496,
      "S": 0.04086
    },
    {
      "L": 1,
      "M": 104.9984,
      "S": 0.041
    },
    {
      "L": 1,
      "M": 105.5641,
      "S": 0.04113
    },
    {
      "L": 1,
      "M": 106.1104,
      "S": 0.04126
    },
    {
      "L": 1,
      "M": 106.6736,
      "S": 0.04139
    },
    {
      "L": 1,
      "M": 107.2176,
      "S": 0.04152
    },
    {
      "L": 1,
      "M": 107.7788,
      "S": 0.04165
    },
    {
      "L": 1,
      "M": 108.3209,
      "S": 0.04177
    },
    {
      "L": 1,
      "M": 108.8621,
      "S": 0.0419
    },
    {
      "L": 1,
      "M": 109.4203,
      "S": 0.04202
    },
    {
      "L": 1,
      "M": 109.9593,
      "S": 0.04214
    }
  ],
  "girls": [
    {
      "L": 1,
      "M": 49.1477,
      "S": 0.0379
    },
    {
      "L": 1,
      "M": 53.6326,
      "S": 0.03641
    },
    {
      "L": 1,
      "M": 57.0796,
      "S": 0.03568
    },
    {
      "L": 1,
      "M": 59.7773,
      "S": 0.0352
    },
    {
      "L": 1,
      "M": 62.1071,
      "S": 0.03486
    },
    {
      "L": 1,
      "M": 64.019,
      "S": 0.03463
    },
    {
      "L": 1,
      "M": 65.751,
      "S": 0.03448
    },
    {
      "L": 1,
      "M": 67.2842,
      "S": 0.03441
    },
    {
      "L": 1,
      "M": 68.7732,
      "S": 0.0344
    },
    {
      "L": 1,
      "M": 70.1463,
      "S": 0.03444
    },
    {
      "L": 1,
      "M": 71.4656,
      "S": 0.03452
    },
    {
      "L": 1,
      "M": 72.7788,
      "S": 0.03464
    },
    {
      "L": 1,
      "M": 74.0049,
      "S": 0.03479
    },
    {
      "L": 1,
      "M": 75.2297,
      "S": 0.03496
    },
    {
      "L": 1,
      "M": 76.377,
      "S": 0.03514
    },
    {
      "L": 1,
      "M": 77.5258,
      "S": 0.03534
    },
    {
      "L": 1,
      "M": 78.6055,
      "S": 0.03555
    },
    {
      "L": 1,
      "M": 79.6559,
      "S": 0.03576
    },
    {
      "L": 1,
      "M": 80.7121,
      "S": 0.03598
    },
    {
      "L": 1,
      "M": 81.708,
      "S": 0.0362
    },
    {
      "L": 1,
      "M": 82.7116,
      "S": 0.03643
    },
    {
      "L": 1,
      "M": 83.6595,
      "S": 0.03665
    },
    {
      "L": 1,
      "M": 84.6154,
      "S": 0.03689
    },
    {
      "L": 1,
      "M": 85.5184,
      "S": 0.03711
    },
    {
      "L": 1,
      "M": 85.7299,
      "S": 0.03764
    },
    {
      "L": 1,
      "M": 86.5922,
      "S": 0.03786
    },
    {
      "L": 1,
      "M": 87.4358,
      "S": 0.03808
    },
    {
      "L": 1,
      "M": 88.2881,
      "S": 0.0383
    },
    {
      "L": 1,
      "M": 89.0938,
      "S": 0.03851
    },
    {
      "L": 1,
      "M": 89.9072,
      "S": 0.03872
    },
    {
      "L": 1,
      "M": 90.6765,
      "S": 0.03893
    },
    {
      "L": 1,
      "M": 91.4539,
      "S": 0.03913
    },
    {
      "L": 1,
      "M": 92.1906,
      "S": 0.03933
    },
    {
      "L": 1,
      "M": 92.9135,
      "S": 0.03952
    },
    {
      "L": 1,
      "M": 93.6473,
      "S": 0.03971
    },
    {
      "L": 1,
      "M": 94.346,
      "S": 0.03989
    },
    {
      "L": 1,
      "M": 95.0572,
      "S": 0.04007
    },
    {
      "L": 1,
      "M": 95.7356,
      "S": 0.04024
    },
    {
      "L": 1,
      "M": 96.427,
      "S": 0.04041
    },
    {
      "L": 1,
      "M": 97.0871,
      "S": 0.04057
    },
    {
      "L": 1,
      "M": 97.7601,
      "S": 0.04074
    },
    {
      "L": 1,
      "M": 98.4028,
      "S": 0.04089
    },
    {
      "L": 1,
      "M": 99.0369,
      "S": 0.04105
    },
    {
      "L": 1,
      "M": 99.6834,
      "S": 0.0412
    },
    {
      "L": 1,
      "M": 100.3007,
      "S": 0.04135
    },
    {
      "L": 1,
      "M": 100.9301,
      "S": 0.0415
    },
    {
      "L": 1,
      "M": 101.5312,
      "S": 0.04164
    },
    {
      "L": 1,
      "M": 102.1446,
      "S": 0.04179
    },
    {
      "L": 1,
      "M": 102.7312,
      "S": 0.04193
    },
    {
      "L": 1,
      "M": 103.3113,
      "S": 0.04206
    },
    {
      "L": 1,
      "M": 103.9045,
      "S": 0.0422
    },
    {
      "L": 1,
      "M": 104.4727,
      "S": 0.04233
    },
    {
      "L": 1,
      "M": 105.0541,
      "S": 0.04247
    },
    {
      "L": 1,
      "M": 105.6114,
      "S": 0.04259
    },
    {
      "L": 1,
      "M": 106.1817,
      "S": 0.04272
    },
    {
      "L": 1,
      "M": 106.7284,
      "S": 0.04285
    },
    {
      "L": 1,
      "M": 107.2878,
      "S": 0.04298
    },
    {
      "L": 1,
      "M": 107.8238,
      "S": 0.0431
    },
    {
      "L": 1,
      "M": 108.3547,
      "S": 0.04322
    },
    {
      "L": 1,
      "M": 108.8981,
      "S": 0.04335
    },
    {
      "L": 1,
      "M": 109.4189,
      "S": 0.04346
    }
  ]
};

function calculateStunting() {
    const tbInput = document.getElementById('dyn_tinggi_badan');
    const tbPendekSelect = document.getElementById('dyn_tb_pendek');
    const idPasien = document.getElementById('skriningPasienId').value;
    
    if (!tbInput || !tbPendekSelect || !idPasien) return;
    
    const tbValue = parseFloat(tbInput.value);
    if (isNaN(tbValue)) {
        tbPendekSelect.value = '';
        return;
    }
    
    const p = patients.find(x => x.id_pasien == idPasien);
    if (!p) return;
    
    const tglLahir = new Date(p.tanggal_lahir);
    const tglKunjungan = new Date(document.getElementById('tanggalKunjungan').value || new Date());
    
    let umurBulan = (tglKunjungan.getFullYear() - tglLahir.getFullYear()) * 12;
    umurBulan += tglKunjungan.getMonth() - tglLahir.getMonth();
    if (tglKunjungan.getDate() < tglLahir.getDate()) {
        umurBulan--;
    }
    
    if (umurBulan < 0) umurBulan = 0;
    if (umurBulan > 60) umurBulan = 60;
    
    const jk = p.jenis_kelamin === 'Laki-laki' ? 'boys' : 'girls';
    const lms = lmsLookup[jk][umurBulan];
    
    if (lms) {
        const { L, M, S } = lms;
        let zScore;
        if (Math.abs(L) < 0.0001) {
            zScore = Math.log(tbValue / M) / S;
        } else {
            zScore = (Math.pow(tbValue / M, L) - 1) / (L * S);
        }
        
        if (zScore < -2) {
            tbPendekSelect.value = 'Stunting';
        } else if (zScore > 3) {
            tbPendekSelect.value = 'Tinggi (Lebih)';
        } else {
            tbPendekSelect.value = 'Normal';
        }
    }
}

const lmsBBTB = {
    boys: [
        { tb: 45, L: -0.352, M: 2.45, S: 0.113 },
        { tb: 50, L: -0.352, M: 3.32, S: 0.107 },
        { tb: 55, L: -0.352, M: 4.47, S: 0.099 },
        { tb: 60, L: -0.352, M: 5.74, S: 0.092 },
        { tb: 65, L: -0.352, M: 7.12, S: 0.087 },
        { tb: 70, L: -0.352, M: 8.41, S: 0.083 },
        { tb: 75, L: -0.352, M: 9.64, S: 0.081 },
        { tb: 80, L: -0.352, M: 10.7, S: 0.081 },
        { tb: 85, L: -0.352, M: 11.7, S: 0.081 },
        { tb: 90, L: -0.352, M: 12.8, S: 0.081 },
        { tb: 95, L: -0.352, M: 14.1, S: 0.082 },
        { tb: 100, L: -0.352, M: 15.3, S: 0.083 },
        { tb: 105, L: -0.352, M: 16.7, S: 0.083 },
        { tb: 110, L: -0.352, M: 18.2, S: 0.084 },
        { tb: 115, L: -0.352, M: 19.9, S: 0.085 },
        { tb: 120, L: -0.352, M: 21.6, S: 0.085 }
    ],
    girls: [
        { tb: 45, L: -0.381, M: 2.45, S: 0.107 },
        { tb: 50, L: -0.381, M: 3.25, S: 0.101 },
        { tb: 55, L: -0.381, M: 4.27, S: 0.096 },
        { tb: 60, L: -0.381, M: 5.37, S: 0.091 },
        { tb: 65, L: -0.381, M: 6.53, S: 0.088 },
        { tb: 70, L: -0.381, M: 7.73, S: 0.086 },
        { tb: 75, L: -0.381, M: 8.92, S: 0.085 },
        { tb: 80, L: -0.381, M: 10.0, S: 0.085 },
        { tb: 85, L: -0.381, M: 11.2, S: 0.086 },
        { tb: 90, L: -0.381, M: 12.4, S: 0.087 },
        { tb: 95, L: -0.381, M: 13.7, S: 0.088 },
        { tb: 100, L: -0.381, M: 15.1, S: 0.089 },
        { tb: 105, L: -0.381, M: 16.5, S: 0.090 },
        { tb: 110, L: -0.381, M: 18.1, S: 0.091 },
        { tb: 115, L: -0.381, M: 19.8, S: 0.091 },
        { tb: 120, L: -0.381, M: 21.5, S: 0.091 }
    ]
};

function getInterpolatedLMS(jk, tb) {
    const table = lmsBBTB[jk];
    if (tb <= table[0].tb) return table[0];
    if (tb >= table[table.length-1].tb) return table[table.length-1];
    
    for (let i=0; i<table.length-1; i++) {
        if (tb >= table[i].tb && tb < table[i+1].tb) {
            const p1 = table[i];
            const p2 = table[i+1];
            const t = (tb - p1.tb) / (p2.tb - p1.tb);
            return {
                L: p1.L + t * (p2.L - p1.L),
                M: p1.M + t * (p2.M - p1.M),
                S: p1.S + t * (p2.S - p1.S)
            };
        }
    }
    return table[table.length-1];
}

function calculateStatusGizi() {
    const tbInput = document.getElementById('dyn_tinggi_badan');
    const bbInput = document.getElementById('dyn_berat_badan');
    const statusGiziSelect = document.getElementById('dyn_status_gizi');
    const idPasien = document.getElementById('skriningPasienId').value;

    if (!tbInput || !bbInput || !statusGiziSelect || !idPasien) return;

    const tbValue = parseFloat(tbInput.value);
    const bbValue = parseFloat(bbInput.value);
    if (isNaN(tbValue) || isNaN(bbValue)) {
        statusGiziSelect.value = '';
        return;
    }

    const p = patients.find(x => x.id_pasien == idPasien);
    if (!p) return;

    const jk = p.jenis_kelamin === 'Laki-laki' ? 'boys' : 'girls';
    const lms = getInterpolatedLMS(jk, tbValue);

    if (lms) {
        const { L, M, S } = lms;
        let zScore;
        if (Math.abs(L) < 0.0001) {
            zScore = Math.log(bbValue / M) / S;
        } else {
            zScore = (Math.pow(bbValue / M, L) - 1) / (L * S);
        }

        if (zScore < -2 || zScore > 2) {
            statusGiziSelect.value = '1';
        } else {
            statusGiziSelect.value = '0';
        }
    }
}
const formDefinitions = {
    ibu_hamil: [
        { id: 'usia_kehamilan', label: 'Usia Kehamilan (Minggu)', type: 'number' },
        { id: 'berat_badan', label: 'Berat Badan (kg)', type: 'number', step: '0.1' },
        { id: 'bb_sesuai_kia', label: 'BB Naik Sesuai Buku KIA?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'lila', label: 'LILA (cm)', type: 'number', step: '0.1' },
        { id: 'lila_lebih_23_5', label: 'LILA > 23.5?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tensi_gabungan', label: 'Tensi Sistole/Diastole (misal 120/80)', type: 'text' },
        { id: 'tensi_sesuai_kia', label: 'Tensi Sesuai KIA?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'batuk_menerus', label: 'Batuk Menerus?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'demam_2_minggu', label: 'Demam > 2 Minggu?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_tidak_naik', label: 'BB Tidak Naik?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'kontak_erat_tb', label: 'Kontak Erat TB?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'diberikan_ttd', label: 'Diberikan TTD (Jumlah)', type: 'text' },
        { id: 'konsumsi_ttd', label: 'Konsumsi TTD?', type: 'select', options: {'1':'Setiap Hari', '0':'Tidak'} },
        { id: 'diberikan_mt_bumil_kek', label: 'Diberikan Makanan Tambahan', type: 'text' },
        { id: 'konsumsi_mt', label: 'Konsumsi MT?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'ikut_kelas_bumil', label: 'Ikut Kelas Bumil?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'rujuk', label: 'Rujuk Pustu/Puskesmas/Rumah Sakit', type: 'text' }
    ],
    bayi_balita: [
        { id: 'umur_bulan', label: 'Umur (Bulan)', type: 'number' },
        { id: 'checklist_perkembangan', label: 'Checklist Perkembangan Lengkap?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'berat_badan', label: 'Berat Badan (kg)', type: 'number', step: '0.1' },
        { id: 'bb_naik', label: 'BB Naik Sesuai Kurva?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_kurang', label: 'BB Kurang (BGM)?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tinggi_badan', label: 'Tinggi Badan (cm)', type: 'number', step: '0.1' },
        { id: 'tb_pendek', label: 'TB Pendek (Stunting)?', type: 'select', options: {'Stunting':'Stunting', 'Normal':'Normal', 'Tinggi (Lebih)':'Tinggi (Lebih)'} },
        { id: 'status_gizi', label: 'Status Gizi Buruk/Lebih?', type: 'select', options: {'1':'Ya (Masalah)', '0':'Tidak (Normal)'} },
        { id: 'lingkar_kepala', label: 'Lingkar Kepala (cm)', type: 'number', step: '0.1' },
        { id: 'lk_normal', label: 'LK Normal?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'lila', label: 'LILA (cm)', type: 'number', step: '0.1' },
        { id: 'lila_kurang', label: 'LILA Kurang?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'batuk_menerus', label: 'Batuk Menerus?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'demam_2_minggu', label: 'Demam > 2 Minggu?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_tidak_naik', label: 'BB Tidak Naik?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'kontak_erat_tb', label: 'Kontak Erat TB?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'asi_eks', label: 'Dapat ASI Eksklusif?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'mp_asi', label: 'Dapat MP ASI?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'jenis_imunisasi', label: 'Jenis Imunisasi', type: 'text' },
        { id: 'vit_a', label: 'Dapat Vitamin A?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'obat_cacing', label: 'Dapat Obat Cacing?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'dapat_mt', label: 'Dapat Makanan Tambahan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'gejala_sakit', label: 'Gejala Sakit Lain', type: 'text' }
    ],
    sekolah_remaja: [
        { id: 'berat_badan', label: 'Berat Badan (kg)', type: 'number', step: '0.1' },
        { id: 'tinggi_badan', label: 'Tinggi Badan (cm)', type: 'number', step: '0.1' },
        { id: 'imt', label: 'IMT', type: 'text' },
        { id: 'lingkar_perut', label: 'Lingkar Perut (cm)', type: 'number', step: '0.1' },
        { id: 'tensi_gabungan', label: 'Tensi Sistole/Diastole (misal 120/80)', type: 'text' },
        { id: 'tensi_klasifikasi', label: 'Klasifikasi Tekanan Darah (Rendah/Normal/Tinggi)', type: 'select', options: {'R':'Rendah (R)', 'N':'Normal (N)', 'T':'Tinggi (T)'} },
        { id: 'gula_darah', label: 'Gula Darah (Rendah/Normal/Tinggi)', type: 'select', options: {'R':'Rendah (R)', 'N':'Normal (N)', 'T':'Tinggi (T)'} },
        { id: 'kadar_hb', label: 'Kadar Hb (mg/dL)', type: 'number', step: '0.1' },
        { id: 'anemia', label: 'Anemia?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'batuk_menerus', label: 'Batuk Menerus?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'demam_2_minggu', label: 'Demam > 2 Minggu?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_tidak_naik', label: 'BB Tidak Naik?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'kontak_erat_tb', label: 'Kontak Erat TB?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'masalah_di_rumah', label: 'Ada Masalah di Rumah?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'beban_sekolah', label: 'Beban Pendidikan Berat?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tidak_suka_tubuh', label: 'Tidak Suka Bentuk Tubuh?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'teman_diluar', label: 'Bergaul Diluar (Bolos)?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'merokok_alkohol', label: 'Merokok/Alkohol/Narkoba?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'kesehatan_seksual', label: 'Masalah Kesehatan Seksual?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tidak_aman', label: 'Merasa Tidak Aman?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'ingin_bunuh_diri', label: 'Ingin Bunuh Diri?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'edukasi_diberikan', label: 'Edukasi yang diberikan', type: 'text' }
    ],
    dewasa_lansia_fisik: [
        { id: 'berat_badan', label: 'Berat Badan (kg)', type: 'number', step: '0.1' },
        { id: 'tinggi_badan', label: 'Tinggi Badan (cm)', type: 'number', step: '0.1' },
        { id: 'status_tb', label: 'Status TB (Normal/Pendek)', type: 'select', options: {'Normal':'Normal', 'Pendek':'Pendek'} },
        { id: 'lingkar_perut', label: 'Lingkar Perut (cm)', type: 'number', step: '0.1' },
        { id: 'tensi_gabungan', label: 'Tensi Sistole/Diastole (misal 120/80)', type: 'text' },
        { id: 'hasil_tensi', label: 'Hasil Tensi', type: 'select', options: {'Rendah':'Rendah', 'Normal':'Normal', 'Tinggi':'Tinggi'} },
        { id: 'gula_darah', label: 'Gula Darah (Rendah/Normal/Tinggi)', type: 'select', options: {'Rendah':'Rendah', 'Normal':'Normal', 'Tinggi':'Tinggi'} },
        { id: 'mata_kanan', label: 'Mata Kanan (Normal/Gangguan)', type: 'select', options: {'Normal':'Normal', 'Gangguan':'Gangguan / Kelainan'} },
        { id: 'mata_kiri', label: 'Mata Kiri', type: 'select', options: {'Normal':'Normal', 'Gangguan':'Gangguan / Kelainan'} },
        { id: 'telinga_kanan', label: 'Telinga Kanan (Normal/Gangguan)', type: 'select', options: {'Normal':'Normal', 'Gangguan':'Gangguan / Kelainan'} },
        { id: 'telinga_kiri', label: 'Telinga Kiri', type: 'select', options: {'Normal':'Normal', 'Gangguan':'Gangguan / Kelainan'} },
        { id: 'kelamin', label: 'Kelamin', type: 'select', options: {'0':'Perempuan = 0', '1':'Laki-laki = 1'} },
        { id: 'usia', label: 'Usia', type: 'select', options: {'0':'40-49 = 0', '1':'50-59 = 1', '2':'>= 60 = 2'} },
        { id: 'merokok', label: 'Merokok', type: 'select', options: {'0':'Tidak = 0', '1':'<20 bungkus/tahun = 1', '2':'20-30 bungkus/tahun = 2', '3':'>30 bungkus/tahun = 3'} },
        { id: 'nafas_pendek', label: 'Nafas pendek ketika berjalan di jalan datar?', type: 'select', options: {'0':'Tidak = 0', '1':'Ya = 1'} },
        { id: 'punya_dahak', label: 'Punya dahak dari paru atau kesulitan mengeluarkan dahak saat tidak flu?', type: 'select', options: {'0':'Tidak = 0', '1':'Ya = 1'} },
        { id: 'spirometri', label: 'Pernah diminta melakukan pemeriksaan spirometri atau peakflow meter?', type: 'select', options: {'0':'Tidak = 0', '1':'Ya = 1'} },
        { id: 'skor_ppok', label: 'Skor (<6 atau >= 6)', type: 'number' },
        { id: 'batuk_menerus', label: 'Batuk terus menerus?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'demam_2_minggu', label: 'Demam >= 2 minggu?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_tidak_naik', label: 'BB tidak naik dalam 2 bulan berturut-turut?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'kontak_erat_tb', label: 'Kontak erat dgn pasien TB?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'alat_kontrasepsi', label: 'Alat kontrasepsi yang digunakan', type: 'select', options: {'Iya':'Iya', 'Tidak':'Tidak'} }
    ],
    dewasa_lansia_jiwa: [
        { id: 'q1', label: 'Apakah Anda sering merasa sakit kepala?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q2', label: 'Apakah Anda kehilangan nafsu makan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q3', label: 'Apakah tidur Anda tidak nyenyak?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q4', label: 'Apakah Anda mudah merasa takut?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q5', label: 'Apakah tangan Anda gemetar?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q6', label: 'Apakah Anda mengalami gangguan pencernaan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q7', label: 'Apakah Anda merasa sulit berpikir jernih?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q8', label: 'Apakah Anda merasa tidak bahagia?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q9', label: 'Apakah Anda lebih sering menangis?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q10', label: 'Apakah Anda merasa sulit untuk menikmati aktivitas sehari-hari?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q11', label: 'Apakah Anda mengalami kesulitan untuk mengambil keputusan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q12', label: 'Apakah aktivitas/tugas sehari-hari Anda terbengkalai?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q13', label: 'Apakah Anda merasa tidak mampu berperan dalam kehidupan ini?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q14', label: 'Apakah Anda kehilangan minat terhadap banyak hal?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q15', label: 'Apakah Anda merasa tidak berharga?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q16', label: 'Apakah Anda mempunyai pikiran untuk mengakhiri hidup Anda?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q17', label: 'Apakah Anda merasa lelah sepanjang waktu?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q18', label: 'Apakah Anda merasa tidak enak di perut?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'q19', label: 'Apakah Anda mudah lelah?', type: 'select', options: {'1':'Ya', '0':'Tidak'} }
    ],
    lansia_skilas: [
        { id: 'orientasi', label: 'Salah menyebutkan tanggal, bulan, tahun?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'mengulang_kata', label: 'Tidak dapat mengulang 3 kata?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'berdiri_kursi', label: 'Berdiri dari kursi > 14 detik?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'bb_turun', label: 'BB turun di luar niat?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'hilang_nafsu_makan', label: 'Hilang nafsu makan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'lila_kurang_21', label: 'LILA < 21 cm?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'masalah_mata', label: 'Masalah pada mata (sulit lihat jauh dll)?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tes_melihat', label: 'Gagal tes melihat jari tangan (2 meter)?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tes_bisik', label: 'Gagal tes bisik?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'tidak_dapat_dilakukan', label: 'Tes Bisik tidak dapat dilakukan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'perasaan_sedih', label: 'Sering merasa sedih/depresi?', type: 'select', options: {'1':'Ya', '0':'Tidak'} },
        { id: 'sedikit_minat', label: 'Sedikit minat/kesenangan?', type: 'select', options: {'1':'Ya', '0':'Tidak'} }
    ]
};

function bukaFormSkrining(type, idPasien, namaPasien) {
    document.getElementById('formSkrining').reset();
    document.getElementById('skriningType').value = type;
    document.getElementById('skriningPasienId').value = idPasien;
    document.getElementById('idSkriningEdit').value = '';
    
    // Set judul modal
    const titles = {
        'ibu_hamil': 'Skrining Ibu Hamil',
        'bayi_balita': 'Skrining Bayi & Balita',
        'sekolah_remaja': 'Skrining Anak Sekolah & Remaja',
        'dewasa_lansia_fisik': 'Pemeriksaan Fisik (Dewasa & Lansia)',
        'dewasa_lansia_jiwa': 'Skrining Kesehatan Jiwa (SRQ-20)',
        'lansia_skilas': 'Skrining Lansia (SKILAS)'
    };
    
    document.getElementById('skrining-modal-title').textContent = titles[type];
    document.getElementById('skrining-modal-subtitle').textContent = `Pasien: ${namaPasien}`;

    // Generate Form Dinamis
    const container = document.getElementById('skriningDynamicFields');
    container.innerHTML = '';
    
    // Grid system agar form panjang tampil 2 kolom di HP lebar/desktop
    const gridDiv = document.createElement('div');
    gridDiv.style.display = 'grid';
    gridDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
    gridDiv.style.gap = '15px';
    gridDiv.style.marginTop = '15px';

    formDefinitions[type].forEach(field => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = 'dyn_' + field.id;
        label.textContent = field.label;
        div.appendChild(label);

        if (field.type === 'select') {
            const select = document.createElement('select');
            select.id = 'dyn_' + field.id;
            select.className = 'form-control';
            select.style.width = '100%';
            select.style.padding = '10px';
            select.style.borderRadius = '6px';
            select.style.border = '1px solid #e2e8f0';
            
            const optDef = document.createElement('option');
            optDef.value = '';
            optDef.textContent = '-- Pilih --';
            select.appendChild(optDef);
            
            for (const [val, txt] of Object.entries(field.options)) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = txt;
                select.appendChild(opt);
            }
            div.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.type = field.type;
            input.id = 'dyn_' + field.id;
            if (field.step) input.step = field.step;
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.borderRadius = '6px';
            input.style.border = '1px solid #e2e8f0';
            div.appendChild(input);
        }
        
        // Auto-calculate Stunting & Status Gizi for Bayi & Balita
        if (type === 'bayi_balita') {
            if (field.id === 'tinggi_badan') {
                const input = div.querySelector('input');
                if (input) {
                    input.addEventListener('input', () => {
                        calculateStunting();
                        calculateStatusGizi();
                    });
                }
            }
            if (field.id === 'berat_badan') {
                const input = div.querySelector('input');
                if (input) {
                    input.addEventListener('input', calculateStatusGizi);
                }
            }
        }
        
        gridDiv.appendChild(div);

    });

    container.appendChild(gridDiv);
    document.getElementById('modalSkrining').classList.remove('hidden');
    
    // Listener tambahan
    if (type === 'bayi_balita') {
        const tglInput = document.getElementById('tanggalKunjungan');
        if (tglInput) {
            // hapus listener lama jika ada (buat clean)
            tglInput.removeEventListener('change', calculateStunting);
            tglInput.addEventListener('change', calculateStunting);
        }
    }
}

async function simpanSkrining() {
    const type = document.getElementById('skriningType').value;
    const idPasien = document.getElementById('skriningPasienId').value;
    const idEdit = document.getElementById('idSkriningEdit').value;
    
    if(!document.getElementById('tanggalKunjungan').value) {
        alert('Tanggal Kunjungan wajib diisi!');
        return;
    }

    const payload = {
        id_pasien: idPasien,
        tanggal_kunjungan: document.getElementById('tanggalKunjungan').value,
        edukasi_diberikan: document.getElementById('edukasiDiberikan').value || ''
    };

    // Ambil data dinamis
    formDefinitions[type].forEach(field => {
        const val = document.getElementById('dyn_' + field.id).value;
        if(val) {
            payload[field.id] = val;
        }
    });

    // Proses tensi gabungan jika ada (misal "120/80")
    if (payload.tensi_gabungan) {
        const parts = payload.tensi_gabungan.split('/');
        if (parts[0]) payload.sistole = parts[0].trim();
        if (parts[1]) payload.diastole = parts[1].trim();
        delete payload.tensi_gabungan;
    }

    // Tampilkan indikator loading
    const simpanBtn = document.getElementById('btnSimpanSkrining');
    simpanBtn.disabled = true;
    simpanBtn.innerText = 'Menyimpan...';

    try {
        let res;
        if (idEdit) {
            res = await fetch(`${API_URL}/screening/${type}/${idEdit}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_URL}/screening/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const data = await res.json();
        
        simpanBtn.disabled = false;
        simpanBtn.innerText = 'Simpan Hasil';
        
        if (res.ok) {
            closeModal('modalSkrining');
            
            // Segera refresh tabel pasien agar status stunting langsung muncul
            loadPatients();
            
            // If we are editing, refresh the riwayat view
            if(idEdit) {
                lihatRiwayat(type, idPasien);
            }
        } else {
            alert('Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan'));
        }
    } catch (err) {
        simpanBtn.disabled = false;
        simpanBtn.innerText = 'Simpan Hasil';
        alert('Gagal menyimpan hasil skrining');
        console.error(err);
    }
}

// ==========================================
// EXPORT DATA EXCEL
// ==========================================
function exportExcel(type, idPasien) {
    window.open(`${API_URL}/export/${type}/${idPasien}`, '_blank');
}

// ==========================================
// LIHAT RIWAYAT SKRINING
// ==========================================
async function lihatRiwayat(type, idPasien) {
    try {
        const titles = {
            'ibu_hamil': 'Ibu Hamil',
            'bayi_balita': 'Bayi & Balita',
            'sekolah_remaja': 'Anak Sekolah & Remaja',
            'dewasa_lansia_fisik': 'Dewasa & Lansia (Fisik)',
            'dewasa_lansia_jiwa': 'Kesehatan Jiwa (SRQ-20)',
            'lansia_skilas': 'Lansia (SKILAS)'
        };

        document.getElementById('riwayat-modal-title').textContent = `Riwayat: ${titles[type]}`;
        document.getElementById('riwayat-modal-subtitle').textContent = `Menampilkan data riwayat.`;
        document.getElementById('modalLihatRiwayat').classList.remove('hidden');

        document.getElementById('riwayatExcelContainer').innerHTML = '<p style="text-align:center; padding: 20px;">Memuat data excel...</p>';
        document.getElementById('riwayatDaftarContainer').innerHTML = '<p style="text-align:center; padding: 20px;">Memuat daftar edit...</p>';

        // Fetch the generated Excel file from the export endpoint
        const res = await fetch(`${API_URL}/export/${type}/${idPasien}`);
        if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            // Parse it with SheetJS
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert sheet to HTML string
            const htmlStr = XLSX.utils.sheet_to_html(worksheet, { id: 'riwayatExcelTable', editable: false });
            document.getElementById('riwayatExcelContainer').innerHTML = htmlStr;
        } else {
            document.getElementById('riwayatExcelContainer').innerHTML = '<p style="color:red; text-align:center;">Gagal memuat format Excel.</p>';
        }

        document.getElementById('riwayatDaftarContainer').innerHTML = `
            <h4 style="margin-bottom: 10px; font-size: 14px; color: #334155;">Daftar Tabel (Edit)</h4>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead id="riwayatDaftarHead"></thead>
                <tbody id="riwayatDaftarBody"></tbody>
            </table>
        `;
        
        // Fetch JSON data for Edit Table
        const resJson = await fetch(`${API_URL}/riwayat/${type}/${idPasien}`);
        if(resJson.ok) {
            const dataJson = await resJson.json();
            currentScreenings = dataJson.screenings;
            renderRiwayatEditTable(type, idPasien, currentScreenings);
        } else {
            throw new Error('Gagal mengambil data riwayat');
        }
    } catch (err) {
        console.error(err);
        document.getElementById('riwayatExcelContainer').innerHTML = '<p style="color:red; text-align:center;">Gagal memuat riwayat skrining.</p>';
        document.getElementById('riwayatDaftarContainer').innerHTML = '<p style="color:red; text-align:center;">Gagal memuat daftar edit.</p>';
    }
}

// Tabs dihapus, jadi switchRiwayatTab tidak diperlukan lagi

function renderRiwayatEditTable(type, idPasien, screenings) {
    const thead = document.getElementById('riwayatDaftarHead');
    const tbody = document.getElementById('riwayatDaftarBody');
    
    thead.innerHTML = `
        <tr style="background:#f8fafc;">
            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Tanggal Kunjungan</th>
            <th style="padding:10px; border-bottom:1px solid #e2e8f0;">Aksi</th>
        </tr>
    `;
    
    tbody.innerHTML = '';
    if(!screenings || screenings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="padding:15px; text-align:center;">Belum ada riwayat skrining.</td></tr>`;
        return;
    }
    
    screenings.forEach(s => {
        const tr = document.createElement('tr');
        const tglStr = new Date(s.tanggal_kunjungan).toLocaleDateString('id-ID');
        tr.innerHTML = `
            <td style="padding:10px; border-bottom:1px solid #e2e8f0;">${tglStr}</td>
            <td style="padding:10px; border-bottom:1px solid #e2e8f0;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px;" onclick="editSkrining('${type}', ${s.id_skrining}, ${idPasien})">✏️ Edit</button>
                    <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px; background-color: #ef4444; color: white; border: none;" onclick="hapusSkrining('${type}', ${s.id_skrining}, ${idPasien})">🗑️ Hapus</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editSkrining(type, idSkrining, idPasien) {
    const s = currentScreenings.find(x => x.id_skrining === idSkrining);
    if(!s) return;
    
    // Find patient name
    const p = patients.find(x => x.id_pasien === idPasien);
    const namaPasien = p ? p.nama : 'Pasien';
    
    bukaFormSkrining(type, idPasien, namaPasien);
    document.getElementById('idSkriningEdit').value = idSkrining;
    
    // Fill common field
    document.getElementById('tanggalKunjungan').value = new Date(s.tanggal_kunjungan).toISOString().split('T')[0];
    document.getElementById('edukasiDiberikan').value = s.edukasi_diberikan || '';
    
    // Fill dynamic fields
    formDefinitions[type].forEach(field => {
        const input = document.getElementById('dyn_' + field.id);
        if(input && s[field.id] !== undefined && s[field.id] !== null) {
            input.value = s[field.id];
        }
    });
    
    // Auto calculate for edit if applicable
    if (type === 'bayi_balita' && typeof calculateStunting === 'function') {
        calculateStunting();
    }
    
    // Handle special tensi_gabungan if physical adult
    if (type === 'dewasa_lansia_fisik' && s.sistole && s.diastole) {
        const inputTensi = document.getElementById('dyn_tensi_gabungan');
        if (inputTensi) {
            inputTensi.value = `${s.sistole}/${s.diastole}`;
        }
    }
}

async function hapusSkrining(type, idSkrining, idPasien) {
    showConfirm("Yakin ingin menghapus riwayat skrining ini?", async () => {
        try {
            const res = await fetch(`${API_URL}/screening/${type}/${idSkrining}`, { method: 'DELETE' });
            const data = await res.json();
            if(res.ok) {
                // Refresh table
                lihatRiwayat(type, idPasien);
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            alert("Gagal menghapus skrining");
        }
    });
}

function previewRekapitulasi(kategori) {
    const tahunInput = document.getElementById('rekapTahun');
    const tahun = tahunInput ? tahunInput.value : new Date().getFullYear();
    const bulanInput = document.getElementById('rekapBulan');
    const selectedBulan = bulanInput ? bulanInput.value : 'Semua Bulan';
    
    let posyanduQuery = '';
    if (currentUser && currentUser.role === 'Puskesmas') {
        const filterPosyandu = document.getElementById('filterGlobalPosyandu');
        posyanduQuery = (filterPosyandu && filterPosyandu.value !== 'Semua Posyandu') ? `&posyandu=${encodeURIComponent(filterPosyandu.value)}` : '';
    } else if (currentUser && currentUser.nama_posyandu) {
        posyanduQuery = `&posyandu=${encodeURIComponent(currentUser.nama_posyandu)}`;
    }

    const url = `${API_URL}/export-rekap?kategori=${encodeURIComponent(kategori)}&tahun=${tahun}&format=json${posyanduQuery}`;
    
    document.getElementById('previewContainer').style.display = 'block';
    document.getElementById('previewContainer').innerHTML = '<div style="text-align: center; padding: 20px;">⏳ Memuat data preview...</div>';

    fetch(url)
        .then(res => res.json())
        .then(data => {
            let filteredData = data.data;
            if (selectedBulan !== 'Semua Bulan') {
                filteredData = filteredData.filter(row => row.Bulan === selectedBulan);
            }
            renderPreviewTable(filteredData, kategori, tahun, selectedBulan);
        })
        .catch(err => {
            document.getElementById('previewContainer').innerHTML = '<div style="color: red; padding: 20px; text-align: center;">❌ Gagal memuat data preview. Pastikan database MySQL dan Server backend berjalan.</div>';
            console.error(err);
        });
}

function renderPreviewTable(data, kategori, tahun, selectedBulan = 'Semua Bulan') {
    if (!data || data.length === 0) {
        document.getElementById('previewContainer').innerHTML = '<div style="padding: 20px; text-align: center;">Tidak ada data rekapitulasi untuk kategori <b>' + kategori + '</b> pada bulan <b>' + selectedBulan + '</b> tahun <b>' + tahun + '</b>.</div>';
        return;
    }

    let html = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 10px;">';
    let title = 'Tabel Preview: ' + kategori + ' (' + tahun + ')';
    if (selectedBulan !== 'Semua Bulan') {
        title = 'Tabel Preview: ' + kategori + ' (' + selectedBulan + ' ' + tahun + ')';
    }
    html += '<h3 style="margin: 0; color: var(--text-primary);">' + title + '</h3>';
    html += '<button class="btn btn-primary" onclick="exportRekapitulasi(\'' + kategori + '\')" style="padding: 8px 15px; font-size: 0.9rem; background-color: #f59e0b; border-color: #f59e0b;">📥 Download Excel</button>';
    html += '</div>';

    html += '<div style="overflow-x: auto; width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">';
    html += '<table class="table" style="min-width: 1200px; margin-bottom: 0;">';
    
    // Headers
    const keys = Object.keys(data[0]);
    html += '<thead><tr style="background-color: var(--primary-color); color: white;">';
    keys.forEach(key => {
        html += '<th style="padding: 12px 15px; border-right: 1px solid rgba(255,255,255,0.1); white-space: nowrap; font-weight: 600; position: sticky; top: 0;">' + key + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Rows
    data.forEach((row, index) => {
        const bg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        html += '<tr style="background-color: ' + bg + ';">';
        keys.forEach(key => {
            html += '<td style="padding: 10px 15px; border: 1px solid #e5e7eb; white-space: nowrap; color: #4b5563;">' + row[key] + '</td>';
        });
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    document.getElementById('previewContainer').innerHTML = html;
}

function exportRekapitulasi(kategori) {
    const tahunInput = document.getElementById('rekapTahun');
    const tahun = tahunInput ? tahunInput.value : new Date().getFullYear();

    let posyanduQuery = '';
    if (currentUser && currentUser.role === 'Puskesmas') {
        const filterPosyandu = document.getElementById('filterGlobalPosyandu');
        posyanduQuery = (filterPosyandu && filterPosyandu.value !== 'Semua Posyandu') ? `&posyandu=${encodeURIComponent(filterPosyandu.value)}` : '';
    } else if (currentUser && currentUser.nama_posyandu) {
        posyanduQuery = `&posyandu=${encodeURIComponent(currentUser.nama_posyandu)}`;
    }

    // Make an API call to generate and download the recap
    const url = `${API_URL}/export-rekap?kategori=${encodeURIComponent(kategori)}&tahun=${tahun}${posyanduQuery}`;
    
    // Create an invisible anchor tag to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `Export_Rekap_${kategori.replace(/[^a-z0-9]/gi, '_')}_${tahun}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- Fitur pindah input menggunakan tombol Enter ---
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const target = e.target;
        // Berlaku untuk input atau select (tapi bukan button/submit)
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            if (target.type === 'submit' || target.type === 'button') return;
            
            e.preventDefault(); // Cegah submit form otomatis
            
            // Cari wadah (form / modal) terdekat
            const container = target.closest('form') || target.closest('.modal-content') || target.closest('.section-card') || document;
            
            // Cari semua elemen yang bisa difokuskan
            const focusable = container.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([disabled]), textarea:not([disabled])');
            const focusableArray = Array.from(focusable);
            const index = focusableArray.indexOf(target);
            
            // Pindahkan fokus ke elemen berikutnya
            if (index > -1 && index < focusableArray.length - 1) {
                focusableArray[index + 1].focus();
            }
        }
    }
});

// ==========================================
// MANAJEMEN AKUN POSYANDU
// ==========================================
function bukaModalAkun() {
    document.getElementById('formAkun').reset();
    document.getElementById('modalAkun').classList.remove('hidden');
}

async function loadAkun() {
    try {
        const res = await fetch(`${API_URL}/users`, { cache: 'no-store' });
        const users = await res.json();
        const tbody = document.getElementById('akunList');
        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Belum ada data akun posyandu.</td></tr>`;
            return;
        }
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${u.nama_posyandu || '-'}</strong></td>
                <td>${u.username}</td>
                <td><span style="background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:4px; font-size:12px;">${u.role}</span></td>
                <td>
                    <button class="btn btn-warning" style="font-size: 12px; padding: 6px 10px; margin-right: 4px; background-color: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="ubahSandiAkun(${u.id})">🔑 Ubah Sandi</button>
                    <button class="btn btn-danger" style="font-size: 12px; padding: 6px 10px;" onclick="hapusAkun(${u.id})">🗑️ Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Gagal memuat akun:', err);
    }
}

function hapusAkun(id) {
    showConfirm("Yakin ingin menghapus akun posyandu ini?", async () => {
        try {
            const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
            
            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json();
                    throw new Error(data.error || "Gagal menghapus dari server");
                } else {
                    throw new Error("Server error " + res.status);
                }
            }
            
            showCustomAlert("Akun berhasil dihapus!");
            loadAkun();
        } catch(err) {
            showCustomAlert("Gagal menghapus akun: " + err.message);
        }
    });
}

function showCustomAlert(msg) {
    const alertMsg = document.getElementById('customAlertMessage');
    const modalAlert = document.getElementById('modalAlert');
    if (alertMsg && modalAlert) {
        alertMsg.textContent = msg;
        modalAlert.classList.remove('hidden');
    } else {
        alert(msg); // Fallback
    }
}


function ubahSandiAkun(id) {
    document.getElementById('formUbahSandi').reset();
    document.getElementById('ubahSandiAccountId').value = id;
    document.getElementById('modalUbahSandi').classList.remove('hidden');
}

if (document.getElementById('formUbahSandi')) {
    document.getElementById('formUbahSandi').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('ubahSandiAccountId').value;
        const newPassword = document.getElementById('inputSandiBaru').value;
        
        if (!newPassword || newPassword.trim() === '') return;
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const res = await fetch(`${API_URL}/users/${id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: newPassword.trim() })
            });
            
            const data = await res.json();
            if (res.ok) {
                showCustomAlert('Sandi berhasil diubah!');
                closeModal('modalUbahSandi');
            } else {
                showCustomAlert('Gagal mengubah sandi: ' + (data.error || 'Terjadi kesalahan'));
            }
        } catch(err) {
            showCustomAlert("Gagal mengubah sandi: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan Sandi Baru';
        }
    });
}

document.getElementById('formAkun').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nama_posyandu: document.getElementById('akunNamaPosyandu').value,
        username: document.getElementById('akunUsername').value,
        password: document.getElementById('akunPassword').value
    };
    try {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Gagal menyimpan akun');
        }
        closeModal('modalAkun');
        loadAkun();
        alert("Akun posyandu berhasil ditambahkan!");
    } catch(err) {
        alert(err.message);
    }
});
