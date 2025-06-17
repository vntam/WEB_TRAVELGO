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
            'FROM signup s LEFT JOIN role r ON s.signup_id = r.signup_id ' +
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
            'INSERT INTO role (signup_id, role_name) VALUES (?, ?)',
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
            'SELECT role_name FROM role WHERE signup_id = ?',
            [userId]
        );

        if (adminUsers.length === 0 || adminUsers[0].role_name !== 'admin') {
            return res.status(403).json({ error: 'Chỉ admin mới có quyền gán vai trò' });
        }

        const [targetRole] = await connection.execute(
            'SELECT signup_id FROM role WHERE signup_id = ?',
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
            'SELECT s.signup_id, s.name, s.email, s.phone, s.balance, r.role_name ' +
            'FROM signup s LEFT JOIN role r ON s.signup_id = r.signup_id ' +
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
                email: user.email,
                phone: user.phone,
                balance: user.balance || 0, // Fallback nếu balance thiếu
                role: user.role_name || 'customer' // Fallback nếu role_name thiếu
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

// Middleware kiểm tra vai trò admin (giả định)
const isAdmin = (req, res, next) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ error: 'Yêu cầu userId' });
    // Kiểm tra role từ database (giả định bảng Role)
    const checkRole = async () => {
        const connection = await getConnection();
        const [roles] = await connection.execute(
            'SELECT role_name FROM role WHERE signup_id = ?',
            [userId]
        );
        await connection.release();
        return roles.length > 0 && roles[0].role_name === 'admin';
    };
    checkRole().then((isAdmin) => {
        if (!isAdmin) return res.status(403).json({ error: 'Quyền bị từ chối' });
        next();
    }).catch(err => res.status(500).json({ error: err.message }));
};

// Lấy danh sách người dùng
router.get('/users', isAdmin, async (req, res) => {
    let connection;
    try {
        const { userId } = req.query;
        connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT s.signup_id, s.name, s.email, s.password ,s.phone, s.balance, r.role_name ' +
            'FROM signup s LEFT JOIN role r ON s.signup_id = r.signup_id'
        );
        console.log('Fetched users:', users); // Log để debug
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Lỗi server' });
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
            'SELECT role_name FROM role WHERE signup_id = ?',
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
            'INSERT INTO role (signup_id, role_name) VALUES (?, ?)',
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
            'SELECT role_name FROM role WHERE signup_id = ?',
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
            'SELECT role_name FROM role WHERE signup_id = ?',
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
            'DELETE FROM role WHERE signup_id = ?',
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
            'SELECT role_name FROM role WHERE signup_id = ?',
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

router.put('/update-password', async (req, res) => {
    let connection;
    try {
        // Extract userId from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Yêu cầu xác thực không hợp lệ' });
        }
        const userId = authHeader.split(' ')[1];

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu cũ và mật khẩu mới' });
        }

        connection = await getConnection();
        const [users] = await connection.execute(
            'SELECT password FROM signup WHERE signup_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        const storedPassword = users[0].password;
        // Note: In production, passwords should be hashed (e.g., using bcrypt). Compare hashed passwords here.
        if (storedPassword !== currentPassword) { // Temporary plain text comparison
            return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }

        await connection.execute(
            'UPDATE signup SET password = ? WHERE signup_id = ?',
            [newPassword, userId]
        );

        await connection.release();
        res.json({ message: 'Cập nhật mật khẩu thành công' });
    } catch (error) {
        console.error('Update password error:', error);
        if (connection) await connection.release(); // Ensure connection is released on error
        res.status(500).json({ error: 'Lỗi cập nhật mật khẩu', details: error.message });
    }
});

router.put('/update', async (req, res) => {
    const authHeader = req.headers.authorization;
    const userId = authHeader ? authHeader.split(" ")[1] : null;
    const { name, email, phone } = req.body;

    console.log('Received update request - Raw Authorization:', authHeader);
    console.log('Received update request - Parsed userId:', userId);
    console.log('Received update request - Body:', { name, email, phone });

    // Validation
    if (!userId || !name || !email || !phone) {
        return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin (name, email, phone)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email không hợp lệ' });
    }
    if (!/^[0-9]{10,11}$/.test(phone)) {
        return res.status(400).json({ error: 'Số điện thoại phải có 10-11 chữ số' });
    }

    let connection;
    try {
        connection = await getConnection();
        const [result] = await connection.execute(
            'UPDATE signup SET name = ?, email = ?, phone = ? WHERE signup_id = ?',
            [name, email, phone, userId]
        );
        await connection.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại hoặc không có thay đổi' });
        }

        res.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('Update error:', error);
        await connection.release();
        res.status(500).json({ error: 'Lỗi cập nhật', details: error.message });
    }
});
module.exports = router;