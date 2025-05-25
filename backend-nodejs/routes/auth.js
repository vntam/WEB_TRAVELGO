const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');


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
      'SELECT signup_id, email, password FROM signup WHERE email = ? AND password = ?',
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
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server', details: error.message });
  } finally {
    if (connection) await connection.release(); 
  }
});

router.post('/signup', async (req, res) => {
  let connection;
  try {
    const { name, password, email, phone } = req.body;

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

    // Không mã hóa mật khẩu, lưu trực tiếp
    const [result] = await connection.execute(
      'INSERT INTO signup (name, password, email, phone) VALUES (?, ?, ?, ?)',
      [name, password, email, phone]
    );

    if (result.affectedRows === 1) {
      res.status(201).json({ message: 'Đăng ký thành công!' });
    } else {
      throw new Error('Không thể tạo tài khoản');
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: error.message || 'Lỗi server' });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;