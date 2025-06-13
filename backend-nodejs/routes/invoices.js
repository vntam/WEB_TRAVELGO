const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

// Lấy danh sách hóa đơn cho admin
router.get("/", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [userId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const query = `
            SELECT i.invoice_id, i.booking_id, i.user_id, i.amount, i.payment_date, i.status, s.name AS user_name
            FROM invoices i
            JOIN signup s ON i.user_id = s.signup_id
            ORDER BY i.payment_date DESC
        `;
        const [invoices] = await connection.execute(query);

        res.json(invoices);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

module.exports = router;