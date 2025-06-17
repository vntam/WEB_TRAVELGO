import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProfileEdit.css';

const ProfileEdit = () => {
    const { userId: paramUserId } = useParams(); // Lấy userId từ URL
    const navigate = useNavigate();
    const [user, setUser] = useState({ name: '', email: '', phone: '' });
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState({ 'change-password': false, 'forgot-password': false });

    // Sử dụng userId từ localStorage nếu paramUserId không có
    const effectiveUserId = paramUserId || localStorage.getItem('userId');

    useEffect(() => {
        if (!effectiveUserId) {
            setError('Không tìm thấy userId');
            return;
        }
        console.log('Fetching user data for userId:', effectiveUserId);
        fetch(`http://localhost:3000/api/auth/user?userId=${effectiveUserId}`, {
            headers: {
                'Authorization': `Bearer ${effectiveUserId}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.user) {
                setUser({ name: data.user.name, email: data.user.email, phone: data.user.phone });
                console.log('User data set:', data.user);
            } else {
                setError('Không tìm thấy thông tin người dùng');
            }
        })
        .catch(err => {
            console.error('Error fetching user:', err.message);
            setError('Lỗi tải thông tin: ' + err.message);
        });
    }, [effectiveUserId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        if (name === 'currentPassword') setCurrentPassword(value);
        if (name === 'newPassword') setNewPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user.name || !user.email || !user.phone) {
            setError('Vui lòng điền đầy đủ thông tin.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            setError('Email không hợp lệ.');
            return;
        }
        if (!/^[0-9]{10,11}$/.test(user.phone)) {
            setError('Số điện thoại phải có 10-11 chữ số.');
            return;
        }
        if (!effectiveUserId) {
            setError('Không tìm thấy userId để cập nhật.');
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/api/auth/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveUserId}`
                },
                body: JSON.stringify({ name: user.name, email: user.email, phone: user.phone })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Cập nhật thông tin thất bại');
            }
            const data = await response.json();
            setSuccess(data.message || 'Cập nhật thông tin thành công!');
            setTimeout(() => navigate('/bookings'), 2000);
        } catch (err) {
            console.error('Error updating profile:', err.message);
            setError(err.message || 'Lỗi khi cập nhật thông tin');
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Vui lòng điền đầy đủ thông tin mật khẩu.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/api/auth/update-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveUserId}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Cập nhật mật khẩu thất bại');
            }
            const data = await response.json();
            setSuccess('Cập nhật mật khẩu thành công!');
            setTimeout(() => navigate('/bookings'), 2000);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsFormVisible(prev => ({ ...prev, 'change-password': false }));
        } catch (err) {
            console.error('Error updating password:', err);
            setError(err.message || 'Mật khẩu cũ không đúng hoặc lỗi server');
        }
    };

    const handleForgotPassword = () => {
        // Điều hướng tới trang hỗ trợ (hotro.js)
        navigate('/support');
    };

    const toggleForm = (tab) => {
        setActiveTab(activeTab === tab ? null : tab);
        setIsFormVisible(prev => ({ ...prev, [tab]: !prev[tab] }));
    };

    return (
        <div className="profile-edit-container">
            <div className="profile-edit-card">
                <h2>Chỉnh sửa hồ sơ</h2>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group">
                        <label>Tên:</label>
                        <input type="text" name="name" value={user.name} onChange={handleChange} placeholder="Nhập tên của bạn" required />
                    </div>
                    <div className="form-group">
                        <label>Email:</label>
                        <input type="email" name="email" value={user.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Số điện thoại:</label>
                        <input type="tel" name="phone" value={user.phone} onChange={handleChange} required />
                    </div>
                    <button type="submit" className="save-btn">Lưu thay đổi</button>
                </form>
                <div className="tabs">
                    <button
                        className={activeTab === 'change-password' ? 'tab-active' : 'tab'}
                        onClick={() => toggleForm('change-password')}
                    >
                        Đổi mật khẩu
                    </button>
                    <button
                        className={activeTab === 'forgot-password' ? 'tab-active' : 'tab'}
                        onClick={() => toggleForm('forgot-password')}
                    >
                        Quên mật khẩu
                    </button>
                </div>
                {isFormVisible['change-password'] && (
                    <form onSubmit={handlePasswordUpdate} className="password-form">
                        <h3>Thay đổi mật khẩu</h3>
                        <div className="form-group">
                            <label>Mật khẩu cũ:</label>
                            <input type="password" name="currentPassword" value={currentPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group">
                            <label>Mật khẩu mới:</label>
                            <input type="password" name="newPassword" value={newPassword} onChange={handlePasswordChange} required />
                        </div>
                        <div className="form-group">
                            <label>Xác nhận mật khẩu mới:</label>
                            <input type="password" name="confirmPassword" value={confirmPassword} onChange={handlePasswordChange} required />
                        </div>
                        <button type="submit" className="save-btn">Cập nhật mật khẩu</button>
                    </form>
                )}
                {isFormVisible['forgot-password'] && (
                    <div className="forgot-password-form">
                        <h3>Quên mật khẩu</h3>
                        <p>Vui lòng liên hệ hỗ trợ để khôi phục mật khẩu.</p>
                        <button onClick={handleForgotPassword} className="support-btn">Liên hệ hỗ trợ</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileEdit;