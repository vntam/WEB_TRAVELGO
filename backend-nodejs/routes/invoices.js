const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

router.get("/", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

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

router.put("/:invoiceId/approve", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [userId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const updateQuery = `
            UPDATE invoices
            SET status = 'completed'
            WHERE invoice_id = ? AND status = 'pending'
        `;
        const [result] = await connection.execute(updateQuery, [req.params.invoiceId]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Hóa đơn không tồn tại hoặc đã được xử lý" });
        }

        // Đồng bộ trạng thái booking thành 2 (đã thanh toán)
        const [invoice] = await connection.execute(
            `SELECT booking_id, user_id, amount FROM invoices WHERE invoice_id = ?`,
            [req.params.invoiceId]
        );
        if (invoice.length > 0) {
            const { booking_id, user_id, amount } = invoice[0];
            await connection.execute(
                `UPDATE booking SET status = 2 WHERE booking_id = ? AND signup_id = ?`,
                [booking_id, user_id]
            );
            await connection.execute(
                `UPDATE signup SET balance = balance - ? WHERE signup_id = ?`,
                [amount, user_id]
            );
        }

        const [updatedInvoice] = await connection.execute(
            `SELECT invoice_id, status FROM invoices WHERE invoice_id = ?`,
            [req.params.invoiceId]
        );

        res.json({ ...updatedInvoice[0], message: "Thanh toán thành công" });
    } catch (error) {
        console.error("Error approving invoice:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.put("/:invoiceId/reject", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [userId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const updateQuery = `
            UPDATE invoices
            SET status = 'rejected'
            WHERE invoice_id = ? AND status = 'pending'
        `;
        const [result] = await connection.execute(updateQuery, [req.params.invoiceId]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Hóa đơn không tồn tại hoặc đã được xử lý" });
        }

        // Đồng bộ trạng thái booking thành -1 (hủy) và hoàn tiền
        const [invoice] = await connection.execute(
            `SELECT booking_id, user_id, amount FROM invoices WHERE invoice_id = ?`,
            [req.params.invoiceId]
        );
        if (invoice.length > 0) {
            const { booking_id, user_id, amount } = invoice[0];
            await connection.execute(
                `UPDATE booking SET status = -1 WHERE booking_id = ? AND signup_id = ?`,
                [booking_id, user_id]
            );
            await connection.execute(
                `UPDATE signup SET balance = balance + ? WHERE signup_id = ?`,
                [amount, user_id]
            );
        }

        const [updatedInvoice] = await connection.execute(
            `SELECT invoice_id, status FROM invoices WHERE invoice_id = ?`,
            [req.params.invoiceId]
        );

        res.json({ ...updatedInvoice[0], message: "Hóa đơn đã bị từ chối, tiền đã được hoàn lại" });
    } catch (error) {
        console.error("Error rejecting invoice:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.get("/bookings", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const checkCustomerQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'customer'
        `;
        const [customer] = await connection.execute(checkCustomerQuery, [userId]);

        if (customer.length === 0) {
            return res.status(403).json({ error: "Chỉ khách hàng mới có quyền xem bookings" });
        }

        const query = `
            SELECT b.booking_id, b.hotel_name, b.room_number, b.price, b.status
            FROM booking b
            WHERE b.signup_id = ? AND b.status = 0 -- Chỉ lấy các booking chưa thanh toán
        `;
        const [bookings] = await connection.execute(query, [userId]);

        res.json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.put("/bookings/:bookingId/approve", async (req, res) => {
    let connection;
    try {
        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [userId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const updateQuery = `
            UPDATE booking
            SET status = 1 -- Đánh dấu đã thanh toán
            WHERE booking_id = ? AND status = 0
        `;
        const [result] = await connection.execute(updateQuery, [req.params.bookingId]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Booking không tồn tại hoặc đã được xử lý" });
        }

        // Đồng bộ với invoices (giả định invoice liên kết với booking qua booking_id)
        await connection.execute(
            `UPDATE invoices SET status = 'completed' WHERE booking_id = ? AND status = 'pending'`,
            [req.params.bookingId]
        );

        const [updatedBooking] = await connection.execute(
            `SELECT booking_id, status FROM booking WHERE booking_id = ?`,
            [req.params.bookingId]
        );

        res.json(updatedBooking[0]);
    } catch (error) {
        console.error("Error approving booking:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.get("/check/:bookingId", async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.headers.authorization?.split(" ")[1];
    const connection = await getConnection();
    try {
        const query = `
            SELECT status FROM booking
            WHERE booking_id = ? AND signup_id = ?
        `;
        const [result] = await connection.execute(query, [bookingId, userId]);
        if (result.length === 0) {
            return res.status(404).json({ error: "Booking không tồn tại" });
        }
        res.json({ status: result[0].status });
    } catch (error) {
        console.error("Error checking booking:", error);
        res.status(500).json({ error: "Lỗi server" });
    } finally {
        connection.release();
    }
});

module.exports = router;
