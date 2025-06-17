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

// Trong bookings.js
router.get("/admin", async (req, res) => {
    let connection;
    try {
        const adminId = req.headers.authorization?.split(" ")[1];
        if (!adminId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);
        if (admin.length === 0) {
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        const query = `
            SELECT b.*, s.name AS user_name, r.room_number, r.room_type, h.name AS hotel_name
            FROM booking b
            JOIN signup s ON b.signup_id = s.signup_id
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            WHERE b.status = 0
            ORDER BY b.check_in DESC
        `;
        console.log("[BOOKINGS] Fetching all pending bookings for admin:", adminId);
        const [rows] = await connection.execute(query);
        console.log("[BOOKINGS] Fetched", rows.length, "pending bookings");

        res.json(rows);
    } catch (error) {
        console.error("[BOOKINGS] Error fetching bookings for admin:", {
            message: error.message,
            stack: error.stack,
            userId: req.headers.authorization?.split(" ")[1],
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("[BOOKINGS] Database connection released for GET /admin");
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

// Lấy danh sách đặt phòng cho admin
router.get("/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const userId = req.headers.authorization?.split(" ")[1];
        console.log("[BOOKINGS] Attempting to fetch booking with bookingId:", bookingId, "for userId:", userId);

        if (!userId) {
            console.log("[BOOKINGS] No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();

        // Đơn giản hóa query, chỉ lấy dữ liệu cơ bản từ booking
        const query = `
            SELECT b.*, s.balance AS user_balance
            FROM booking b
            LEFT JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.booking_id = ? AND b.signup_id = ?
        `;
        console.log("[BOOKINGS] Executing query:", query, "with params:", [bookingId, userId]);
        const [rows] = await connection.execute(query, [bookingId, userId]);
        console.log("[BOOKINGS] Query executed, rows fetched:", rows.length, "records:", rows);

        if (rows.length === 0) {
            console.log("[BOOKINGS] No booking found for bookingId", bookingId, "and userId", userId);
            return res.status(404).json({ error: "Booking không tồn tại" });
        }

        // Nếu cần thêm room và hotel, kiểm tra CSDL trước
        res.json(rows[0]);
    } catch (error) {
        console.error("[BOOKINGS] Error fetching booking:", {
            message: error.message,
            stack: error.stack,
            bookingId: req.params.bookingId,
            userId: req.headers.authorization?.split(" ")[1],
            query: query
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("[BOOKINGS] Database connection released for GET /:bookingId endpoint");
        }
    }
});
// Lấy chi tiết đặt phòng theo bookingId
router.get("/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const userId = req.headers.authorization?.split(" ")[1];

        if (!userId) {
            console.log("No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();
        console.log(`Attempting to fetch booking with bookingId: ${bookingId} for userId: ${userId}`);

        const query = `
            SELECT b.*, r.room_number, r.room_type, r.price, r.room_id, h.name AS hotel_name, s.balance AS user_balance
            FROM booking b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.booking_id = ? AND b.signup_id = ?
        `;
        const [rows] = await connection.execute(query, [bookingId, userId]);
        console.log("Query executed, rows fetched:", rows.length, "records", rows);

        if (rows.length === 0) {
            console.log(`No booking found for bookingId: ${bookingId} and userId: ${userId}`);
            return res.status(404).json({ error: "Không tìm thấy booking hoặc bạn không có quyền truy cập" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching booking:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
            bookingId: req.params.bookingId,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for GET /:bookingId endpoint");
        }
    }
});

// Trong routes/bookings.js
router.post("/pay/:bookingId", async (req, res) => {
    let connection;
    try {
        const { bookingId } = req.params;
        const { price: amount } = req.body;
        const userId = req.headers.authorization?.split(" ")[1];

        console.log(`[PAYMENT] Processing payment for bookingId: ${bookingId}, userId: ${userId}, amount: ${amount}`);

        if (!userId) {
            console.log("[PAYMENT] No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        if (!amount || amount <= 0) {
            console.log("[PAYMENT] Invalid amount provided:", amount);
            return res.status(400).json({ error: "Vui lòng cung cấp số tiền hợp lệ" });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        // Kiểm tra booking
        const bookingQuery = `
            SELECT b.*, s.balance AS user_balance
            FROM booking b
            JOIN signup s ON b.signup_id = s.signup_id
            WHERE b.booking_id = ? AND b.signup_id = ? AND b.status = 1
        `;
        console.log("[PAYMENT] Checking booking: bookingId=", bookingId, "userId=", userId);
        const [booking] = await connection.execute(bookingQuery, [bookingId, userId]);

        if (booking.length === 0) {
            console.log("[PAYMENT] Booking not found or not in pending status: bookingId=", bookingId, "userId=", userId);
            return res.status(400).json({ 
                error: "Booking không tồn tại, đã được thanh toán, hoặc đã hủy" 
            });
        }

        const userBalance = parseFloat(booking[0].user_balance);
        const bookingPrice = parseFloat(booking[0].total_price);
        if (userBalance < amount || Math.abs(amount - bookingPrice) > 0.01) { // Cho phép sai số nhỏ
            console.log("[PAYMENT] Invalid payment: userBalance=", userBalance, "amount=", amount, "bookingPrice=", bookingPrice);
            return res.status(400).json({ 
                error: "Số dư không đủ hoặc số tiền thanh toán không khớp",
                details: { userBalance, amount, bookingPrice }
            });
        }

        // Trừ tiền người dùng
        const updateUserBalanceQuery = `
            UPDATE signup
            SET balance = balance - ?
            WHERE signup_id = ? AND balance >= ?
        `;
        console.log("[PAYMENT] Updating user balance: userId=", userId, "amount=", amount);
        const [balanceUpdate] = await connection.execute(updateUserBalanceQuery, [amount, userId, amount]);
        if (balanceUpdate.affectedRows === 0) {
            throw new Error("Số dư không đủ để thực hiện giao dịch");
        }

        // Cộng tiền cho admin
        const findAdminQuery = `
            SELECT signup_id FROM role
            WHERE role_name = 'admin' LIMIT 1
        `;
        console.log("[PAYMENT] Finding admin account");
        const [admin] = await connection.execute(findAdminQuery);
        if (!admin[0]) {
            console.log("[PAYMENT] No admin found");
            throw new Error("Không tìm thấy tài khoản admin");
        }
        const adminId = admin[0].signup_id;

        const updateAdminBalanceQuery = `
            UPDATE signup
            SET balance = balance + ?
            WHERE signup_id = ?
        `;
        console.log("[PAYMENT] Updating admin balance: adminId=", adminId, "amount=", amount);
        await connection.execute(updateAdminBalanceQuery, [amount, adminId]);

        // Tạo hóa đơn
        const insertInvoiceQuery = `
            INSERT INTO invoices (booking_id, user_id, amount, payment_date, status)
            VALUES (?, ?, ?, NOW(), 'completed')
        `;
        console.log("[PAYMENT] Creating invoice: bookingId=", bookingId, "userId=", userId);
        const [invoiceResult] = await connection.execute(insertInvoiceQuery, [bookingId, userId, amount]);

        // Cập nhật trạng thái booking thành 2 (đã thanh toán)
        const updateBookingStatusQuery = `
            UPDATE booking
            SET status = 2
            WHERE booking_id = ?
        `;
        console.log("[PAYMENT] Updating booking status to 2: bookingId=", bookingId);
        await connection.execute(updateBookingStatusQuery, [bookingId]);

        await connection.commit();
        console.log("[PAYMENT] Payment processed successfully: bookingId=", bookingId, "invoiceId=", invoiceResult.insertId);
        res.json({ 
            message: "Thanh toán thành công",
            bookingId,
            invoiceId: invoiceResult.insertId
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("[PAYMENT] Error processing payment:", {
            message: error.message,
            stack: error.stack,
            bookingId: req.params.bookingId,
            userId: req.headers.authorization?.split(" ")[1],
            body: req.body
        });
        res.status(500).json({ error: "Lỗi server nội bộ", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("[PAYMENT] Database connection released for POST /pay/:bookingId");
        }
    }
});
// Xác nhận hóa đơn
router.put("/invoices/:invoiceId/approve", async (req, res) => {
    let connection;
    try {
        const { invoiceId } = req.params;
        const adminId = req.headers.authorization?.split(" ")[1];

        if (!adminId) {
            console.log("No adminId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);

        if (admin.length === 0) {
            console.log(`User ${adminId} does not have admin role`);
            return res.status(403).json({ error: "Bạn không có quyền admin" });
        }

        // Kiểm tra hóa đơn có tồn tại và ở trạng thái pending
        const checkInvoiceQuery = `
            SELECT booking_id
            FROM invoices
            WHERE invoice_id = ? AND status = 'pending'
        `;
        const [invoice] = await connection.execute(checkInvoiceQuery, [invoiceId]);

        if (invoice.length === 0) {
            console.log(`Invoice ${invoiceId} not found or not in pending state`);
            return res.status(404).json({ error: "Không tìm thấy hóa đơn hoặc hóa đơn không ở trạng thái chờ duyệt" });
        }

        // Cập nhật trạng thái hóa đơn thành completed
        const updateInvoiceQuery = `
            UPDATE invoices
            SET status = 'completed'
            WHERE invoice_id = ?
        `;
        await connection.execute(updateInvoiceQuery, [invoiceId]);

        // Cập nhật trạng thái booking thành 2 (đã duyệt phòng)
        const updateBookingQuery = `
            UPDATE booking
            SET status = 2
            WHERE booking_id = ?
        `;
        await connection.execute(updateBookingQuery, [invoice[0].booking_id]);

        await connection.commit();

        console.log(`Invoice ${invoiceId} approved successfully`);
        res.json({ message: "Xác nhận hóa đơn thành công" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error approving invoice:", {
            message: error.message,
            stack: error.stack,
            invoiceId: req.params.invoiceId
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
        console.log("Database connection released for PUT /invoices/:invoiceId/approve endpoint");
    }
});

// Từ chối hóa đơn
router.put("/invoices/:invoiceId/reject", async (req, res) => {
    let connection;
    try {
        const { invoiceId } = req.params;
        const adminId = req.headers.authorization?.split(" ")[1];

        if (!adminId) {
            console.log("No adminId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập với vai trò admin" });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        // Kiểm tra vai trò admin
        const checkAdminQuery = `
            SELECT signup_id
            FROM role
            WHERE signup_id = ? AND role_name = 'admin'
        `;
        const [admin] = await connection.execute(checkAdminQuery, [adminId]);

        if (admin.length === 0) {
            console.log(`User ${adminId} does not have admin role`);
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
            console.log(`Invoice ${invoiceId} not found or not in pending state`);
            return res.status(404).json({ error: "Không tìm thấy hóa đơn hoặc hóa đơn không ở trạng thái chờ duyệt" });
        }

        const { booking_id, user_id, amount } = invoice[0];

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
        if (!adminData[0]) {
            console.log("No admin found");
            return res.status(500).json({ error: "Không tìm thấy admin" });
        }
        const adminIdToUpdate = adminData[0].signup_id;

        const refundAdminQuery = `
            UPDATE signup
            SET balance = balance - ?
            WHERE signup_id = ?
        `;
        await connection.execute(refundAdminQuery, [amount, adminIdToUpdate]);

        // Cập nhật trạng thái hóa đơn thành rejected
        const updateInvoiceQuery = `
            UPDATE invoices
            SET status = 'rejected'
            WHERE invoice_id = ?
        `;
        await connection.execute(updateInvoiceQuery, [invoiceId]);

        // Cập nhật trạng thái booking thành -1 (không được xác nhận)
        const updateBookingQuery = `
            UPDATE booking
            SET status = -1
            WHERE booking_id = ?
        `;
        await connection.execute(updateBookingQuery, [booking_id]);

        await connection.commit();

        console.log(`Invoice ${invoiceId} rejected successfully`);
        res.json({ message: "Từ chối hóa đơn thành công" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error rejecting invoice:", {
            message: error.message,
            stack: error.stack,
            invoiceId: req.params.invoiceId
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
        console.log("Database connection released for PUT /invoices/:invoiceId/reject endpoint");
    }
});

// Lấy số dư của người dùng
router.get("/:userId/balance", async (req, res) => {
    let connection;
    try {
        const { userId } = req.params;
        const authUserId = req.headers.authorization?.split(" ")[1];

        if (!authUserId) {
            console.log("No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        // Kiểm tra xem userId trong params có khớp với userId trong token không
        if (authUserId !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền truy cập số dư của người dùng khác" });
        }

        connection = await getConnection();
        console.log(`Attempting to fetch balance for userId: ${userId}`);

        const query = `
            SELECT balance
            FROM signup
            WHERE signup_id = ?
        `;
        const [rows] = await connection.execute(query, [userId]);
        console.log("Query executed, rows fetched:", rows.length, "records", rows);

        if (rows.length === 0) {
            console.log(`No user found for userId: ${userId}`);
            return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }

        res.json({ user_balance: rows[0].balance });
    } catch (error) {
        console.error("Error fetching balance:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
            userId: req.params.userId,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for GET /:userId/balance endpoint");
        }
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

// Lấy lịch sử giao dịch của người dùng
router.get("/transaction-history/:userId", async (req, res) => {
    let connection;
    try {
        const { userId } = req.params;
        const authUserId = req.headers.authorization?.split(" ")[1];

        if (!authUserId) {
            console.log("No userId provided in Authorization header");
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        // Kiểm tra quyền truy cập (chỉ cho phép xem lịch sử của chính mình)
        if (authUserId !== userId) {
            return res.status(403).json({ error: "Bạn không có quyền truy cập lịch sử của người dùng khác" });
        }

        connection = await getConnection();
        console.log(`Attempting to fetch transaction history for userId: ${userId}`);

        // Truy vấn kết hợp deposits (tiền cộng) và invoices (tiền trừ)
        const query = `
            SELECT 
                'deposit' AS transaction_type,
                d.created_at AS transaction_date,
                d.amount AS amount,
                'Nạp tiền thành công' AS description
            FROM deposits d
            WHERE d.user_id = ? AND d.status = 'approved'
            UNION
            SELECT 
                'payment' AS transaction_type,
                i.payment_date AS transaction_date,
                i.amount AS amount,
                CONCAT('Thanh toán phòng tại ', h.name, ' - ', r.room_number) AS description
            FROM invoices i
            JOIN booking b ON i.booking_id = b.booking_id
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            WHERE i.user_id = ? AND i.status = 'completed'
            ORDER BY transaction_date DESC
        `;
        const [rows] = await connection.execute(query, [userId, userId]);
        console.log("Transaction history fetched:", rows.length, "records", rows);

        // Tính tổng số dư hiện tại (không bắt buộc, chỉ để tham khảo)
        const [balanceRow] = await connection.execute(
            `SELECT balance FROM signup WHERE signup_id = ?`,
            [userId]
        );
        const currentBalance = balanceRow.length > 0 ? balanceRow[0].balance : 0;

        res.json({
            transactions: rows,
            currentBalance: currentBalance,
            message: "Lịch sử giao dịch đã được lấy thành công"
        });
    } catch (error) {
        console.error("Error fetching transaction history:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
            userId: req.params.userId,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for GET /transaction-history/:userId endpoint");
        }
    }
});

// Lấy lịch sử giao dịch cho admin
router.get("/admin/transaction-history", async (req, res) => {
    let connection;
    try {
        const authUserId = req.headers.authorization?.split(" ")[1];
        if (!authUserId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        connection = await getConnection();
        console.log(`Fetching admin transaction history for userId: ${authUserId}`);

        // Truy vấn kết hợp các hoạt động từ các bảng hiện có
        const query = `
            SELECT 
                'booking_payment' AS transaction_type,
                b.booking_date AS transaction_date,
                b.total_price AS amount,
                CONCAT('Đặt phòng bởi ', u.name, ' tại phòng ', r.room_number, ' - ', h.name) AS description
            FROM booking b
            JOIN signup u ON b.signup_id = u.signup_id
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            WHERE b.status IN (0, 1, 2)
            UNION
            SELECT 
                'invoice_management' AS transaction_type,
                i.payment_date AS transaction_date,
                i.amount AS amount,
                CONCAT('Hóa đơn ', i.invoice_id, ' của ', u.name, ' - Trạng thái: ', i.status) AS description
            FROM invoices i
            JOIN signup u ON i.user_id = u.signup_id
            UNION
            SELECT 
                'review_management' AS transaction_type,
                r.review_date AS transaction_date,
                0 AS amount,
                CONCAT('Đánh giá ', r.review_id, ' bởi ', u.name, ' - Trạng thái: ', 
                    CASE WHEN r.status = 0 THEN 'Chưa duyệt' ELSE 'Đã duyệt' END) AS description
            FROM review r
            JOIN signup u ON r.signup_id = u.signup_id
            UNION
            SELECT 
                'deposit_management' AS transaction_type,
                d.created_at AS transaction_date,
                d.amount AS amount,
                CONCAT('Nạp tiền ', d.id, ' bởi ', u.name, ' - Trạng thái: ', d.status) AS description
            FROM deposits d
            JOIN signup u ON d.user_id = u.signup_id
            WHERE d.status IN ('approved', 'rejected')
            ORDER BY transaction_date DESC
        `;
        const [rows] = await connection.execute(query, []);

        res.json({
            transactions: rows,
            message: "Lịch sử giao dịch của admin đã được lấy thành công"
        });
    } catch (error) {
        console.error("Error fetching admin transaction history:", {
            message: error.message,
            stack: error.stack,
            requestHeaders: req.headers,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) {
            await connection.release();
            console.log("Database connection released for GET /admin/transaction-history endpoint");
        }
    }
});

module.exports = router;