import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dangnhap.css';

const DangNhap = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: email,
          password 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      alert(data.message);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Đăng Nhập</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="login-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Đăng Nhập</button>
      </form>
    </div>
  );
};

export default DangNhap;