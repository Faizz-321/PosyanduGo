const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'posyandugo',
        multipleStatements: true
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('Kader Posyandu', 'Puskesmas') NOT NULL
            );
        `);
        await pool.query(`
            INSERT IGNORE INTO users (username, password, role) VALUES 
            ('PuskesmasCempae@gmail.com', 'PuskesmasCempae', 'Puskesmas');
        `);
        console.log("Database updated successfully");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
