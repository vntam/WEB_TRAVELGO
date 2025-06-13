import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dangnhap.css';

const DangNhap = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      localStorage.setItem('user', JSON.stringify(data.user)); // Lưu thông tin người dùng
      if (onLoginSuccess) {
        onLoginSuccess(data.user.id); // Truyền userId lên App.js
      }
      setMessage('Đăng nhập thành công!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Đăng Nhập</h2>
      {message && (
        <div className={`message ${message.includes('thành công') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      <form className="login-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Nhập email của bạn"
          />
        </div>
        <div className="form-group">
          <label>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Nhập mật khẩu"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : 'Đăng Nhập'}
        </button>
      </form>
    </div>
  );
};

export default DangNhap;