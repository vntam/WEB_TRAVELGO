import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css'; // Import CSS

const Header = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/';
    };

    return (
        <nav>
            <div className="logo">
                <Link to="/">TRAVELGO</Link>
            </div>
            <div className="nav-links">
                <Link to="/hotels">Khách sạn</Link>
                <Link to="/bookings">Phòng Đã Đặt</Link>
                <Link to="/promotions">Khuyến mãi</Link>
                <Link to="/reviews">Review</Link>
                <Link to="/support">Hỗ trợ</Link>
            </div>
            <div className="user-section">
                {user ? (
                    <button onClick={handleLogout}>Đăng xuất</button>
                ) : (
                    <>
                        <Link to="/login">Đăng nhập</Link>
                        <Link to="/signup">Đăng Kí</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Header;