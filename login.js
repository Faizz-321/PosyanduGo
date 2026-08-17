const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Cek apakah sudah login, jika sudah langsung ke index.html
    const session = sessionStorage.getItem('posyandugo_user');
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const btnLogin = document.getElementById('btnLogin');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            showError('Username dan password harus diisi');
            return;
        }

        // Disable button while processing
        btnLogin.disabled = true;
        btnLogin.textContent = 'Memeriksa...';
        errorMessage.style.display = 'none';

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showError(data.error || 'Gagal login. Periksa username dan password.');
                btnLogin.disabled = false;
                btnLogin.textContent = 'Login';
                return;
            }

            // Simpan sesi login
            sessionStorage.setItem('posyandugo_user', JSON.stringify(data.user));
            
            // Redirect ke halaman utama
            window.location.href = 'index.html';
            
        } catch (err) {
            console.error(err);
            showError('Terjadi kesalahan jaringan atau server.');
            btnLogin.disabled = false;
            btnLogin.textContent = 'Login';
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    }
});
