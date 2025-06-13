const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

process.env.TZ = 'Asia/Ho_Chi_Minh';

// Lấy danh sách đặt phòng
router.get("/", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        console.log("Attempting to fetch bookings from database");

        const userId = req.headers.authorization?.split(" ")[1];
        console.log("User ID from Authorization header:", userId);

        if (!userId) {
            console.log("No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        const query = `
            SELECT b.*, r.room_number, r.room_type, r.price, r.room_id, h.name AS hotel_name, s.balance AS user_balance
            FROM booking b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.signup_id = ?
            ORDER BY b.check_in DESC
        `;
        console.log("Executing query to fetch bookings for user:", userId);
        const [rows] = await connection.execute(query, [userId]);
        console.log("Query executed, rows fetched:", rows.length, "records", rows);

        if (rows.length === 0) {
            console.log(`No bookings found for userId: ${userId}`);
            return res.status(200).json([]); // Trả về mảng rỗng nếu không có dữ liệu
        }

        res.json(rows);
    } catch (error) {
        console.error("Error fetching bookings:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for GET / endpoint");
        }
    }
});
// Tạo đặt phòng mới
router.post("/", async (req, res) => {
    let connection;
    try {
        const { room_id, check_in, check_out, total_price } = req.body;
        const userId = req.headers.authorization?.split(" ")[1];

        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        if (!room_id || !check_in || !check_out || total_price === undefined) {
            return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin: room_id, check_in, check_out, total_price" });
        }

        connection = await getConnection();

        const checkAvailabilityQuery = `
            SELECT NOT EXISTS (
                SELECT 1 FROM booking 
                WHERE room_id = ? 
                AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?))
            ) AS is_available
        `;
        const [availability] = await connection.execute(checkAvailabilityQuery, [room_id, check_out, check_in, check_in, check_out]);

        if (!availability[0].is_available) {
            return res.status(400).json({ error: "Phòng đã được đặt trong khoảng thời gian này" });
        }

        const query = `
            INSERT INTO booking (room_id, signup_id, check_in, check_out, status, total_price, booking_date)
            VALUES (?, ?, ?, ?, 0, ?, NOW())
        `;
        const [result] = await connection.execute(query, [room_id, userId, check_in, check_out, total_price]);

        const [newBooking] = await connection.execute(
            `SELECT b.*, r.room_number, r.room_type, h.name AS hotel_name 
             FROM booking b 
             JOIN rooms r ON b.room_id = r.room_id 
             JOIN hotels h ON r.hotel_id = h.hotel_id 
             WHERE b.booking_id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: "Đặt phòng thành công",
            booking: newBooking[0]
        });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Xóa đặt phòng
router.delete("/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const userId = req.headers.authorization?.split(" ")[1];

        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        const query = `
            DELETE FROM booking
            WHERE booking_id = ? AND signup_id = ?
        `;
        const [result] = await connection.execute(query, [bookingId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy booking hoặc bạn không có quyền xóa" });
        }

        res.json({ message: "Hủy phòng thành công" });
    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Cập nhật đặt phòng
router.put("/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const { check_in, check_out } = req.body;
        const userId = req.headers.authorization?.split(" ")[1];

        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        if (!check_in || !check_out) {
            return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin: check_in, check_out" });
        }

        connection = await getConnection();

        const getRoomIdQuery = `SELECT room_id FROM booking WHERE booking_id = ? AND signup_id = ?`;
        const [booking] = await connection.execute(getRoomIdQuery, [bookingId, userId]);

        if (booking.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy booking hoặc bạn không có quyền chỉnh sửa" });
        }

        const roomId = booking[0].room_id;

        const checkAvailabilityQuery = `
            SELECT NOT EXISTS (
                SELECT 1 FROM booking 
                WHERE room_id = ? 
                AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?))
                AND booking_id != ?
            ) AS is_available
        `;
        const [availability] = await connection.execute(checkAvailabilityQuery, [roomId, check_out, check_in, check_in, check_out, bookingId]);

        if (!availability[0].is_available) {
            return res.status(400).json({ error: "Phòng đã được đặt trong khoảng thời gian này" });
        }

        const query = `
            UPDATE booking
            SET check_in = ?, check_out = ?
            WHERE booking_id = ? AND signup_id = ?
        `;
        const [result] = await connection.execute(query, [check_in, check_out, bookingId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy booking hoặc bạn không có quyền chỉnh sửa" });
        }

        const [updatedBooking] = await connection.execute(
            `SELECT b.*, r.room_number, r.room_type, h.name AS hotel_name 
             FROM booking b 
             JOIN rooms r ON b.room_id = r.room_id 
             JOIN hotels h ON r.hotel_id = h.hotel_id 
             WHERE b.booking_id = ?`,
            [bookingId]
        );

        res.json({ message: "Cập nhật phòng thành công", booking: updatedBooking[0] });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Thanh toán hóa đơn
router.post("/pay/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const { price } = req.body;
        const userId = req.headers.authorization?.split(" ")[1];

        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        if (!price) {
            return res.status(400).json({ error: "Vui lòng cung cấp giá tiền" });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        // Kiểm tra booking và thông tin người dùng
        const bookingQuery = `
            SELECT b.*, s.balance AS user_balance
            FROM booking b
            JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.booking_id = ? AND b.signup_id = ?
        `;
        const [booking] = await connection.execute(bookingQuery, [bookingId, userId]);

        if (booking.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy booking hoặc bạn không có quyền" });
        }

        const userBalance = parseFloat(booking[0].user_balance);
        if (userBalance < price) {
            return res.status(400).json({ error: "Số dư không đủ để thanh toán" });
        }

        // Trừ tiền người dùng
        const updateUserBalanceQuery = `
            UPDATE signup
            SET balance = balance - ?
            WHERE signup_id = ?
        `;
        await connection.execute(updateUserBalanceQuery, [price, userId]);

        // Cộng tiền cho admin
        const findAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE role_name = 'admin'
            LIMIT 1
        `;
        const [admin] = await connection.execute(findAdminQuery);

        if (admin.length === 0) {
            throw new Error("Không tìm thấy admin để cập nhật số dư");
        }

        const adminId = admin[0].signup_id;
        const updateAdminBalanceQuery = `
            UPDATE signup
            SET balance = balance + ?
            WHERE signup_id = ?
        `;
        const [adminResult] = await connection.execute(updateAdminBalanceQuery, [price, adminId]);

        if (adminResult.affectedRows === 0) {
            throw new Error("Không thể cập nhật số dư cho admin");
        }

        // Lưu hóa đơn vào bảng invoices
        const insertInvoiceQuery = `
            INSERT INTO invoices (booking_id, user_id, amount, payment_date, status)
            VALUES (?, ?, ?, NOW(), 'pending')
        `;
        await connection.execute(insertInvoiceQuery, [bookingId, userId, price]);

        // Cập nhật trạng thái booking
        const updateBookingStatusQuery = `
            UPDATE booking
            SET status = 1
            WHERE booking_id = ?
        `;
        await connection.execute(updateBookingStatusQuery, [bookingId]);

        await connection.commit();
        res.json({ message: "Thanh toán thành công, chờ admin xác nhận" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error processing payment:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Xác nhận hóa đơn
router.put("/invoices/:invoiceId/approve", async (req, res) => {
    let connection;
    try {
        const { invoiceId } = req.params;
        const adminId = req.headers.authorization?.split(" ")[1];

        if (!adminId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        // Cập nhật trạng thái hóa đơn
        const updateInvoiceQuery = `
            UPDATE invoices
            SET status = 'completed'
            WHERE invoice_id = ? AND status = 'pending'
        `;
        const [result] = await connection.execute(updateInvoiceQuery, [invoiceId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy hóa đơn hoặc hóa đơn không ở trạng thái chờ duyệt" });
        }

        // Cập nhật trạng thái booking
        const updateBookingQuery = `
            UPDATE booking
            SET status = 2
            WHERE booking_id = (SELECT booking_id FROM invoices WHERE invoice_id = ?)
        `;
        await connection.execute(updateBookingQuery, [invoiceId]);

        res.json({ message: "Xác nhận hóa đơn thành công" });
    } catch (error) {
        console.error("Error approving invoice:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Từ chối hóa đơn
router.put("/invoices/:invoiceId/reject", async (req, res) => {
    let connection;
    try {
        const { invoiceId } = req.params;
        const adminId = req.headers.authorization?.split(" ")[1];

        if (!adminId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        // Lấy thông tin hóa đơn để hoàn tiền
        const invoiceQuery = `
            SELECT booking_id, user_id, amount
            FROM invoices
            WHERE invoice_id = ? AND status = 'pending'
        `;
        const [invoice] = await connection.execute(invoiceQuery, [invoiceId]);

        if (invoice.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy hóa đơn hoặc hóa đơn không ở trạng thái chờ duyệt" });
        }

        const { booking_id, user_id, amount } = invoice[0];

        await connection.beginTransaction();

        // Hoàn tiền cho người dùng
        const refundUserQuery = `
            UPDATE signup
            SET balance = balance + ?
            WHERE signup_id = ?
        `;
        await connection.execute(refundUserQuery, [amount, user_id]);

        // Trừ tiền từ admin
        const findAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE role_name = 'admin'
            LIMIT 1
        `;
        const [adminData] = await connection.execute(findAdminQuery);
        const adminIdToUpdate = adminData[0].signup_id;

        const refundAdminQuery = `
            UPDATE signup
            SET balance = balance - ?
            WHERE signup_id = ?
        `;
        await connection.execute(refundAdminQuery, [amount, adminIdToUpdate]);

        // Cập nhật trạng thái hóa đơn
        const updateInvoiceQuery = `
            UPDATE invoices
            SET status = 'rejected'
            WHERE invoice_id = ?
        `;
        await connection.execute(updateInvoiceQuery, [invoiceId]);

        // Cập nhật trạng thái booking về chờ xác nhận
        const updateBookingQuery = `
            UPDATE booking
            SET status = 0
            WHERE booking_id = ?
        `;
        await connection.execute(updateBookingQuery, [booking_id]);

        await connection.commit();
        res.json({ message: "Từ chối hóa đơn thành công" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error rejecting invoice:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Endpoint để admin thêm tiền vào số dư khách hàng
router.post("/admin/add-balance", async (req, res) => {
    let connection;
    try {
        const { userId, amount } = req.body;
        const adminId = req.headers.authorization?.split(" ")[1];

        if (!adminId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);

        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ error: "Vui lòng cung cấp userId và số tiền hợp lệ" });
        }

        await connection.beginTransaction();

        const updateBalanceQuery = `
            UPDATE signup
            SET balance = balance + ?
            WHERE signup_id = ?
        `;
        const [result] = await connection.execute(updateBalanceQuery, [amount, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        // Lấy số dư mới
        const [newBalance] = await connection.execute(`SELECT balance FROM signup WHERE signup_id = ?`, [userId]);

        await connection.commit();
        res.json({ message: "Cập nhật số dư thành công", newBalance: newBalance[0].balance });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error adding balance:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Lấy danh sách đặt phòng cho admin
router.get("/admin", async (req, res) => {
    let connection;
    try {
        console.log("Received GET request for /api/bookings/admin");
        const adminId = req.headers.authorization?.split(" ")[1];
        console.log("Admin ID from Authorization header:", adminId);

        if (!adminId) {
            console.log("No adminId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        console.log("Database connection established for /admin endpoint");

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        console.log("Executing checkAdminQuery with signup_id:", adminId);
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);
        console.log("Admin role check result:", admin);

        if (admin.length === 0) {
            console.log(`User ${adminId} does not have admin role`);
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const query = `
            SELECT b.*, r.room_number, r.room_type, r.price, r.room_id, h.name AS hotel_name, s.name AS user_name
            FROM booking b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            JOIN signup s ON b.signup_id = s.signup_id
            ORDER BY b.check_in DESC
        `;
        console.log("Executing main query to fetch bookings for admin");
        const [rows] = await connection.execute(query);
        console.log("Bookings fetched for admin:", rows.length, "records", rows);

        res.json(rows);
    } catch (error) {
        console.error("Error in /admin endpoint:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
            adminId,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for /admin endpoint");
        }
    }
});

// Xác nhận đặt phòng
router.put("/:bookingId/approve", async (req, res) => {
    let connection;
    try {
        console.log(`Received PUT request for /api/bookings/${req.params.bookingId}/approve`);
        const adminId = req.headers.authorization?.split(" ")[1];
        console.log("Admin ID from Authorization header:", adminId);

        if (!adminId) {
            console.log("No adminId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        console.log("Database connection established for /:bookingId/approve endpoint");

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        console.log("Executing checkAdminQuery with signup_id:", adminId);
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);
        console.log("Admin role check result:", admin);

        if (admin.length === 0) {
            console.log(`User ${adminId} does not have admin role`);
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const { bookingId } = req.params;
        const updateBookingQuery = `
            UPDATE booking
            SET status = 1
            WHERE booking_id = ? AND status = 0
        `;
        console.log(`Executing updateBookingQuery for bookingId: ${bookingId}`);
        const [result] = await connection.execute(updateBookingQuery, [bookingId]);
        console.log("Update booking result:", result);

        if (result.affectedRows === 0) {
            console.log(`Booking ${bookingId} not found or not in pending state`);
            return res.status(404).json({ error: "Không tìm thấy booking hoặc booking không ở trạng thái chờ duyệt" });
        }

        res.json({ message: "Xác nhận đặt phòng thành công" });
    } catch (error) {
        console.error("Error in /:bookingId/approve endpoint:", {
            message: error.message,
            stack: error.stack,
            requestParams: req.params,
            requestHeaders: req.headers,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for /:bookingId/approve endpoint");
        }
    }
});

// Từ chối đặt phòng
router.put("/:bookingId/reject", async (req, res) => {
    let connection;
    try {
        console.log(`Received PUT request for /api/bookings/${req.params.bookingId}/reject`);
        const adminId = req.headers.authorization?.split(" ")[1];
        console.log("Admin ID from Authorization header:", adminId);

        if (!adminId) {
            console.log("No adminId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        console.log("Database connection established for /:bookingId/reject endpoint");

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        console.log("Executing checkAdminQuery with signup_id:", adminId);
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);
        console.log("Admin role check result:", admin);

        if (admin.length === 0) {
            console.log(`User ${adminId} does not have admin role`);
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const { bookingId } = req.params;
        const updateBookingQuery = `
            UPDATE booking
            SET status = -1
            WHERE booking_id = ? AND status = 0
        `;
        console.log(`Executing updateBookingQuery for bookingId: ${bookingId}`);
        const [result] = await connection.execute(updateBookingQuery, [bookingId]);
        console.log("Update booking result:", result);

        if (result.affectedRows === 0) {
            console.log(`Booking ${bookingId} not found or not in pending state`);
            return res.status(404).json({ error: "Không tìm thấy booking hoặc booking không ở trạng thái chờ duyệt" });
        }

        res.json({ message: "Từ chối đặt phòng thành công" });
    } catch (error) {
        console.error("Error in /:bookingId/reject endpoint:", {
            message: error.message,
            stack: error.stack,
            requestParams: req.params,
            requestHeaders: req.headers,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for /:bookingId/reject endpoint");
        }
    }
});

module.exports = router;