import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css'; 

const Header = () => {
    const [user, setUser] = useState(null);
    const location = useLocation(); 

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

    const isActive = (path) => location.pathname === path;

    return (
        <nav>
            <div className="logo">
                <Link to="/" className={isActive('/') }>TRAVELGO</Link>
            </div>
            <div className="nav-links">
                <Link to="/hotels" className={isActive('/hotels') ? 'active' : ''}>Khách sạn</Link>
                <Link to="/bookings" className={isActive('/bookings') ? 'active' : ''}>Phòng Đã Đặt</Link>
                <Link to="/promotions" className={isActive('/promotions') ? 'active' : ''}>Khuyến mãi</Link>
                <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''}>Review</Link>
                <Link to="/support" className={isActive('/support') ? 'active' : ''}>Hỗ trợ</Link>
            </div>
            <div className="user-section">
                {user ? (
                    <button onClick={handleLogout}>Đăng xuất</button>
                ) : (
                    <>
                        <Link to="/login" className={isActive('/login') ? 'active' : ''}>Đăng nhập</Link>
                        <Link to="/signup" className={isActive('/signup') ? 'active' : ''}>Đăng Kí</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Header;