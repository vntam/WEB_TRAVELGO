const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

// Đăng nhập
router.post('/login', async (req, res) => {
    let connection;
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username, password });

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng cung cấp email và mật khẩu' });
        }

        connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT s.signup_id, s.name, s.email, s.password, s.balance, r.role_name ' +
            'FROM signup s LEFT JOIN Role r ON s.signup_id = r.signup_id ' +
            'WHERE s.email = ? AND s.password = ?',
            [username, password]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const user = users[0];
        res.json({
            message: 'Đăng nhập thành công',
            user: {
                id: user.signup_id,
                name: user.name,
                email: user.email,
                balance: user.balance,
                role: user.role_name || 'customer' // Mặc định là customer nếu không có role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Đăng ký
router.post('/signup', async (req, res) => {
    let connection;
    try {
        const { name, password, email, phone, balance = 0 } = req.body;

        if (!name || !password || !email || !phone) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Email không hợp lệ' });
        }

        if (!/^[0-9]{10,11}$/.test(phone)) {
            return res.status(400).json({ message: 'Số điện thoại phải có 10-11 chữ số' });
        }

        connection = await getConnection();
        const [existingUsers] = await connection.execute(
            'SELECT email FROM signup WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        const [signupResult] = await connection.execute(
            'INSERT INTO signup (name, password, email, phone, balance) VALUES (?, ?, ?, ?, ?)',
            [name, password, email, phone, balance]
        );

        const signup_id = signupResult.insertId;

        // Thêm vai trò mặc định là customer vào bảng Role
        await connection.execute(
            'INSERT INTO Role (signup_id, role_name) VALUES (?, ?)',
            [signup_id, 'customer']
        );

        res.status(201).json({ message: 'Đăng ký thành công!', userId: signup_id });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: error.message || 'Lỗi server' });
    } finally {
        if (connection) await connection.release();
    }
});

// Lấy thông tin người dùng
router.get('/user', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'Vui lòng cung cấp userId' });
        }

        connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT s.signup_id, s.name, s.balance, r.role_name ' +
            'FROM signup s LEFT JOIN Role r ON s.signup_id = r.signup_id ' +
            'WHERE s.signup_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        const user = users[0];
        res.json({
            user: {
                id: user.signup_id,
                name: user.name,
                balance: user.balance,
                role: user.role_name || 'customer'
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Gán vai trò
router.post('/assign-role', async (req, res) => {
    let connection;
    try {
        const { userId, targetUserId, role_name } = req.body;
        if (!userId || !targetUserId || !role_name) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        connection = await getConnection();

        const [adminUsers] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền gán vai trò' });
        }

        const [targetRole] = await connection.execute(
            'SELECT signup_id FROM Role WHERE signup_id = ?',
            [targetUserId]
        );

        if (targetRole.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        await connection.execute(
            'UPDATE Role SET role_name = ? WHERE signup_id = ?',
            [role_name, targetUserId]
        );

        res.json({ message: 'Gán vai trò thành công!' });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Quản lý người dùng
router.get('/users', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        console.log('Fetching users for userId:', userId);
        connection = await getConnection();

        // Kiểm tra quyền admin
        const [adminUsers] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (!adminUsers || adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
        }

        const [users] = await connection.execute(
            'SELECT s.signup_id, s.name, s.password, s.email, s.phone, s.balance, r.role_name ' +
            'FROM signup s LEFT JOIN Role r ON s.signup_id = r.signup_id'
        );

        console.log('Users fetched:', users);
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.post('/users', async (req, res) => {
    let connection;
    try {
        const { userId, name, password, email, phone, balance = 0 } = req.body;
        if (!userId || !name || !password || !email || !phone) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        connection = await getConnection();

        // Kiểm tra quyền admin
        const [adminUsers] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền tạo người dùng' });
        }

        const [existingUsers] = await connection.execute(
            'SELECT email FROM signup WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email đã được sử dụng' });
        }

        const [signupResult] = await connection.execute(
            'INSERT INTO signup (name, password, email, phone, balance) VALUES (?, ?, ?, ?, ?)',
            [name, password, email, phone, balance]
        );

        const signup_id = signupResult.insertId;

        // Thêm vai trò mặc định là customer vào bảng Role
        await connection.execute(
            'INSERT INTO Role (signup_id, role_name) VALUES (?, ?)',
            [signup_id, 'customer']
        );

        res.status(201).json({ message: 'Tạo người dùng thành công!', userId: signup_id });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.put('/users/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { userId, name, password, email, phone, balance } = req.body;
        if (!userId || !id || !name || !password || !email || !phone || balance === undefined) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        connection = await getConnection();

        // Kiểm tra quyền admin
        const [adminUsers] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền sửa người dùng' });
        }

        await connection.execute(
            'UPDATE signup SET name = ?, password = ?, email = ?, phone = ?, balance = ? WHERE signup_id = ?',
            [name, password, email, phone, balance, id]
        );

        res.json({ message: 'Cập nhật người dùng thành công!' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.delete('/users/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { userId } = req.query;
        if (!userId || !id) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin' });
        }

        connection = await getConnection();

        // Kiểm tra quyền admin
        const [adminUsers] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền xóa người dùng' });
        }

        // Xóa các bản ghi liên quan trong bảng review
        await connection.execute(
            'DELETE FROM review WHERE signup_id = ?',
            [id]
        );

        // Xóa các bản ghi liên quan trong bảng bookings
        await connection.execute(
            'DELETE FROM booking WHERE signup_id = ?',
            [id]
        );

        // Xóa bản ghi trong bảng Role trước
        await connection.execute(
            'DELETE FROM Role WHERE signup_id = ?',
            [id]
        );

        // Sau đó xóa bản ghi trong bảng signup
        await connection.execute(
            'DELETE FROM signup WHERE signup_id = ?',
            [id]
        );

        res.json({ message: 'Xóa người dùng thành công!' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Kiểm tra quyền admin
router.get('/admin-only', async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(401).json({ error: 'Yêu cầu xác thực' });
        }

        connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT role_name FROM Role WHERE signup_id = ?',
            [userId]
        );

        if (users.length === 0 || users[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập' });
        }

        res.json({ message: 'Chào mừng admin!' });
    } catch (error) {
        console.error('Admin-only error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

module.exports = router;