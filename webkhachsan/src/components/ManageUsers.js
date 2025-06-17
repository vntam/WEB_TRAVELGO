import React, { useState, useEffect } from 'react';
import './ManageUsers.css';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ name: '', password: 'Default123!', email: '', phone: '', balance: 0 });
    const [editId, setEditId] = useState(null);
    const [error, setError] = useState(null);

    const userId = localStorage.getItem('userId') || null;

    useEffect(() => {
        if (!userId) {
            console.error('No userId found in localStorage');
            setError('Không tìm thấy userId, vui lòng đăng nhập lại');
            return;
        }
        fetchUsers();
    }, [userId]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/auth/users?userId=${userId}`, {
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            console.log('Fetch users response:', data);
            if (response.ok) {
                setUsers(data.users || []);
                setError(null);
            } else {
                setError(data.error || 'Lỗi khi tải dữ liệu');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('Không thể kết nối đến server');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) {
            setError('Không tìm thấy userId, vui lòng đăng nhập lại');
            return;
        }
        if (!formData.name || !formData.email || !formData.phone) {
            setError('Vui lòng cung cấp đầy đủ thông tin (name, email, phone)');
            return;
        }
        try {
            const url = editId ? `http://localhost:3000/api/auth/users/${editId}` : 'http://localhost:3000/api/auth/users';
            const method = editId ? 'PUT' : 'POST';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...formData, balance: formData.balance || 0 }),
            });
            const data = await response.json();
            console.log('Submit response:', data);
            if (response.ok) {
                alert(data.message);
                setFormData({ name: '', password: 'Default123!', email: '', phone: '', balance: 0 });
                setEditId(null);
                fetchUsers();
            } else {
                setError(data.error || 'Lỗi khi xử lý');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setError('Không thể kết nối đến server');
        }
    };

    const handleDelete = async (id) => {
        if (!userId) {
            setError('Không tìm thấy userId, vui lòng đăng nhập lại');
            return;
        }
        if (window.confirm('Bạn có chắc muốn xóa người dùng này?')) {
            try {
                const response = await fetch(`http://localhost:3000/api/auth/users/${id}?userId=${userId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await response.json();
                console.log('Delete response:', data);
                if (response.ok) {
                    alert(data.message);
                    fetchUsers();
                } else {
                    setError(data.error || 'Lỗi khi xóa');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                setError('Không thể kết nối đến server');
            }
        }
    };

    const handleEdit = (user) => {
        setFormData({ 
            name: user.name, 
            password: user.password || 'Default123!', // Lấy password từ CSDL, nếu không có thì dùng mặc định
            email: user.email, 
            phone: user.phone, 
            balance: user.balance || 0 
        });
        setEditId(user.signup_id);
    };

    return (
        <div className="manage-users-container">
            <h2>Quản lý Tài khoản</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit} className="user-form">
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tên"
                    required
                />
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mật khẩu (Default123!)"
                    required
                />
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                />
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Số điện thoại"
                    required
                />
                <input
                    type="number"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    placeholder="Số dư (tùy chọn)"
                />
                <button type="submit">{editId ? 'Cập nhật' : 'Thêm'}</button>
            </form>
            <table className="users-table">
                <thead>
                    <tr><th>ID</th><th>Tên</th><th>Mật Khẩu</th><th>Email</th><th>Số điện thoại</th><th>Số dư</th><th>Vai trò</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.signup_id}><td>{user.signup_id}</td><td>{user.name}</td><td>{user.password}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.balance || 0}</td><td>{user.role_name || 'customer'}</td><td><button onClick={() => handleEdit(user)} className="edit-btn">Sửa</button><button onClick={() => handleDelete(user.signup_id)} className="delete-btn">Xóa</button></td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ManageUsers;