const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hotel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Yêu cầu nạp tiền
router.post('/request', async (req, res) => {
    const { amount, userId, paymentMethod } = req.body;

    if (!userId || !amount || isNaN(amount) || amount <= 0 || !paymentMethod) {
        return res.status(400).json({ message: 'Dữ liệu không hợp lệ. Vui lòng cung cấp phương thức nạp tiền.' });
    }

    try {
        const connection = await pool.getConnection();
        await connection.execute(
            'INSERT INTO deposits (user_id, amount, status, payment_method) VALUES (?, ?, ?, ?)',
            [userId, amount, 'pending', paymentMethod]
        );
        connection.release();
        res.status(200).json({ success: true, message: 'Yêu cầu nạp tiền đã được gửi' });
    } catch (err) {
        console.error('Error in /request:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Lấy danh sách yêu cầu nạp tiền đang chờ xử lý
router.get('/pending', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            `SELECT d.id, u.name, u.email, d.amount, d.payment_method, d.created_at 
             FROM deposits d 
             JOIN signup u ON d.user_id = u.signup_id 
             WHERE d.status = 'pending'`
        );
        connection.release();
        res.status(200).json({ success: true, deposits: rows });
    } catch (err) {
        console.error('Error in /pending:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Duyệt yêu cầu nạp tiền
router.put('/approve/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await pool.getConnection();
        const [deposit] = await connection.execute(
            'SELECT user_id, amount FROM deposits WHERE id = ? AND status = ?', [id, 'pending']
        );

        if (deposit.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Yêu cầu không tồn tại' });
        }

        await connection.beginTransaction();
        await connection.execute(
            'UPDATE deposits SET status = ? WHERE id = ?', ['approved', id]
        );
        await connection.execute(
            'UPDATE signup SET balance = balance + ? WHERE signup_id = ?',
            [deposit[0].amount, deposit[0].user_id]
        );
        await connection.commit();
        connection.release();
        res.status(200).json({ success: true, message: 'Yêu cầu đã được duyệt' });
    } catch (err) {
        await connection.rollback();
        console.error('Error in /approve:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Từ chối yêu cầu nạp tiền
router.put('/reject/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const connection = await pool.getConnection();
        await connection.execute(
            'UPDATE deposits SET status = ? WHERE id = ?', ['rejected', id]
        );
        connection.release();
        res.status(200).json({ success: true, message: 'Yêu cầu đã bị từ chối' });
    } catch (err) {
        console.error('Error in /reject:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

module.exports = router;