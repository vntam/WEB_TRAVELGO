const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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

router.post('/request', async (req, res) => {
    let connection;
    try {
        const { amount, userId, paymentMethod } = req.body;
        const userIdFromHeader = req.headers.authorization?.split(" ")[1];

        if (!userIdFromHeader || userIdFromHeader !== userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Số tiền không hợp lệ" });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const insertQuery = `
            INSERT INTO deposits (user_id, amount, payment_method, status, created_at)
            VALUES (?, ?, ?, 'pending', NOW())
        `;
        const [result] = await connection.execute(insertQuery, [userId, amount, paymentMethod]);

        await connection.commit();
        res.status(200).json({ 
            message: `Yêu cầu nạp tiền bằng ${paymentMethod} với số tiền ${amount.toLocaleString()} VNĐ đã được gửi. Vui lòng quét mã QR để hoàn tất.`, 
            depositId: result.insertId 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("[DEPOSITS] Error processing deposit request:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/generate-qr', async (req, res) => {
    try {
        const { method, amount } = req.query;
        if (!method || !amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Phương thức và số tiền không hợp lệ" });
        }

        const qrData = `Nạp tiền: ${amount} VNĐ qua ${method}, UserId: ${req.headers.authorization?.split(" ")[1] || 'unknown'}`;
        const qrFileName = `QR_${method}_${amount}_${uuidv4()}.png`;
        const qrPath = path.join(__dirname, '../public/images/QRCODE', qrFileName);

        const dir = path.join(__dirname, '../public/images/QRCODE');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        await QRCode.toFile(qrPath, qrData, {
            width: 200,
            margin: 1,
        });

        const qrUrl = `http://localhost:3000/images/QRCODE/${qrFileName}`;
        res.json({ url: qrUrl });
    } catch (error) {
        console.error("[DEPOSITS] Error generating QR code:", error);
        res.status(500).json({ error: "Lỗi khi tạo mã QR", details: error.message });
    }
});

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

router.put('/approve/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
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
        if (connection) await connection.rollback();
        console.error('Error in /approve:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

router.put('/reject/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
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