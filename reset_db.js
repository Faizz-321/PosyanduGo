const fs = require('fs');
const mysql = require('mysql2/promise');

async function resetDB() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            multipleStatements: true
        });

        console.log('Terhubung ke MySQL...');
        const sql = fs.readFileSync('database.sql', 'utf8');
        
        console.log('Mengeksekusi database.sql...');
        await connection.query(sql);
        
        console.log('✅ Database BERHASIL di-reset dengan 5 tabel baru!');
        await connection.end();
    } catch (error) {
        console.error('❌ Gagal mereset database:', error.message);
    }
}

resetDB();
