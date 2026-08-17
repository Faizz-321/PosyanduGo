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
        
        await connection.query(sql);
        console.log('Berhasil mereset dan membuat 6 tabel baru di database posyandugo!');
        
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

resetDB();
