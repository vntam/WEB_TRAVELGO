import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './dangki.css';

function DangKy() {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    email: '',
    phone: '',
    role_name: 'customer' 
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));                                              
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); 
    setMessage('');

    if (!formData.name || !formData.password || !formData.email || !formData.phone) {
      setMessage('Vui lòng điền đầy đủ thông tin');
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage('Email không hợp lệ');
      setIsLoading(false);
      return;
    }

    if (!/^[0-9]{10,11}$/.test(formData.phone)) {
      setMessage('Số điện thoại phải có 10-11 chữ số');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự');
      setIsLoading(false);
      return;
    }

    try {  
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json(); 
      if (!response.ok) {
        throw new Error(data.message || `Lỗi server (${response.status})`);
      }

      setMessage('Đăng ký thành công!');
      setFormData({ name: '', password: '', email: '', phone: '', role_name: 'customer' });

      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'Lỗi kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dangky-container">
      <h2>Đăng Ký Tài Khoản</h2>

      {message && (
        <div className={`message ${message.includes('thành công') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tên:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Số điện thoại:</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            pattern="[0-9]{10,11}"
            title="Số điện thoại phải có 10-11 chữ số"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>
    </div>
  );
}

export default DangKy;