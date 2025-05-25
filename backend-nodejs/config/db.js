const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Thay bằng username MySQL của bạn
    password: '', // Thay bằng password MySQL của bạn
    database: 'hotel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const getConnection = async () => {
    return await pool.getConnection();
};

module.exports = { getConnection };