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
        // Add nama_posyandu to users
        await pool.query(`
            ALTER TABLE users ADD COLUMN nama_posyandu VARCHAR(100);
        `).catch(e => console.log("Column nama_posyandu might already exist:", e.message));

        // Update existing kader user to have default posyandu
        await pool.query(`
            UPDATE users SET nama_posyandu = 'Posyandu Utama' WHERE username = 'kader';
        `);

        // Add posyandu to data_pasien
        await pool.query(`
            ALTER TABLE data_pasien ADD COLUMN posyandu VARCHAR(100);
        `).catch(e => console.log("Column posyandu might already exist:", e.message));

        // Set existing patients to default posyandu
        await pool.query(`
            UPDATE data_pasien SET posyandu = 'Posyandu Utama' WHERE posyandu IS NULL;
        `);

        console.log("Database updated successfully for posyandu feature");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
