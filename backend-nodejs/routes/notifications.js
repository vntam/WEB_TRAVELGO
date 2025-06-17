const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

router.get("/", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        console.log("[NOTIFICATIONS] Request received for userId:", userId);
        if (!userId) {
            console.log("[NOTIFICATIONS] No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const checkCustomerQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'customer'
        `;
        const [customer] = await connection.execute(checkCustomerQuery, [userId]);
        console.log("[NOTIFICATIONS] Customer check result for userId", userId, ":", customer);

        if (customer.length === 0) {
            console.log("[NOTIFICATIONS] User", userId, "is not a customer, access denied");
            return res.status(403).json({ error: "Chỉ khách hàng mới có quyền xem notifications" });
        }

        const query = `
            SELECT b.booking_id, b.signup_id, b.room_id, b.booking_date, b.check_in, b.check_out, b.status, b.total_price, 
                   r.room_number, h.name AS hotel_name
            FROM booking b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.signup_id = ? AND b.status = 1 -- Chỉ lấy status = 1
        `;
        console.log("[NOTIFICATIONS] Executing query for userId", userId, ":", query);
        const [notifications] = await connection.execute(query, [userId]);
        console.log("[NOTIFICATIONS] Notifications fetched for userId", userId, ":", notifications.map(n => ({ booking_id: n.booking_id, status: n.status })));

        res.json(notifications);
    } catch (error) {
        console.error("[NOTIFICATIONS] Error fetching notifications:", {
            message: error.message,
            stack: error.stack,
            userId: req.headers.authorization?.split(" ")[1]
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("[NOTIFICATIONS] Database connection released for GET /notifications");
        }
    }
});

module.exports = router;