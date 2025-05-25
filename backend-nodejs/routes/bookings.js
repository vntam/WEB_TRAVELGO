const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

process.env.TZ = 'Asia/Ho_Chi_Minh';

// Lấy danh sách booking của user
router.get("/", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const userId = req.headers.authorization?.split(" ")[1];
        if (!userId) {
            return res.status(401).json({ error: "Vui lòng đăng nhập" });
        }

        const query = `
            SELECT b.*, r.room_number, r.room_type, r.price, h.name AS hotel_name
            FROM booking b
            JOIN rooms r ON b.room_id = r.room_id
            JOIN hotels h ON r.hotel_id = h.hotel_id
            WHERE b.signup_id = ?
            ORDER BY b.check_in DESC
        `;
        const [rows] = await connection.execute(query, [userId]);

        res.json(rows);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Tạo booking mới
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

        // Kiểm tra tính khả dụng, không so sánh với booking_id vì đây là booking mới
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

        // Trả về thông tin booking vừa tạo để frontend đồng bộ
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

// Xóa booking
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

// Cập nhật booking
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

        // Trả về thông tin booking đã cập nhật
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

module.exports = router;