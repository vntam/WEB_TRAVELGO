import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ userId, onLogout }) => {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const location = useLocation();
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (userId) {
            console.log('Fetching user data with userId:', userId);
            fetch(`http://localhost:3000/api/auth/user?userId=${userId}`)
                .then(res => res.json())
                .then(data => {
                    console.log('API response:', data);
                    if (data.user) {
                        setUser(data.user);
                    } else {
                        console.error('No user data returned from API:', data);
                        setUser(null);
                    }
                })
                .catch(err => {
                    console.error('Error fetching user:', err);
                    setUser(null);
                });
        } else {
            setUser(null);
            console.log('No userId provided');
        }

        if (userId && user?.role === 'customer') {
            fetch("http://localhost:3000/api/bookings", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${userId}`,
                },
            })
                .then(res => res.json())
                .then(data => {
                    console.log("Notifications API response:", data);
                    const confirmedBookings = data.filter(booking => booking.status === 1);
                    setNotifications(confirmedBookings);
                })
                .catch(err => {
                    console.error("Error fetching notifications:", err);
                    setNotifications([]);
                });
        }
    }, [userId, user?.role]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        setUser(null);
        setNotifications([]);
        if (onLogout) onLogout();
        window.location.href = '/';
    };

    const isActive = (path) => location.pathname === path;

    const formatPrice = (price) => {
        return Math.floor(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const handleNotificationClick = (bookingId) => {
        setNotifications(notifications.filter(n => n.booking_id !== bookingId));
        setShowNotifications(false);
    };

    return (
        <nav>
            <div className="logo">
                <Link to="/" className={isActive('/') ? 'active' : ''}>TRAVELGO</Link>
            </div>
            <div className="nav-links">
                {user && user.role === 'admin' ? (
                    <>
                        <Link to="/manage-users" className={isActive('/manage-users') ? 'active' : ''}>Quản lý Tài khoản</Link>
                        <Link to="/manage-roombooked" className={isActive('/manage-roombooked') ? 'active' : ''}>Quản lí các Phòng</Link>
                        <Link to="/manage-invoices" className={isActive('/manage-invoices') ? 'active' : ''}>Quản lý Hóa đơn</Link>
                        <Link to="/manage-reviews" className={isActive('/manage-reviews') ? 'active' : ''}>Quản lý Bài đánh giá</Link>
                    </>
                ) : (
                    <>
                        <Link to="/hotels" className={isActive('/hotels') ? 'active' : ''}>Khách sạn</Link>
                        <Link to="/bookings" className={isActive('/bookings') ? 'active' : ''}>Phòng Đã Đặt</Link>
                        <Link to="/promotions" className={isActive('/promotions') ? 'active' : ''}>Khuyến mãi</Link>
                        <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''}>Review</Link>
                        <Link to="/support" className={isActive('/support') ? 'active' : ''}>Hỗ trợ</Link>
                    </>
                )}
            </div>
            <div className="user-section">
                {user ? (
                    <>
                        <span className="greeting">Xin chào</span>
                        <span className="user-info">
                            {user.name} ({user.role}) | Số dư: {formatPrice(user.balance)} VNĐ
                        </span>
                        {user.role === 'customer' && (
                            <div className="notification-bell" ref={dropdownRef}>
                                <button onClick={toggleNotifications} className="bell-button">
                                    🔔
                                    {notifications.length > 0 && (
                                        <span className="notification-count">{notifications.length}</span>
                                    )}
                                </button>
                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        {notifications.length > 0 ? (
                                            notifications.map(notification => (
                                                <Link
                                                    key={notification.booking_id}
                                                    to={`/payment?bookingId=${notification.booking_id}`}
                                                    className="notification-item"
                                                    onClick={() => handleNotificationClick(notification.booking_id)}
                                                >
                                                    <div className="notification-content">
                                                        <p className="notification-title">
                                                            Thanh toán cho {notification.hotel_name} - Phòng {notification.room_number}
                                                        </p>
                                                        <p className="notification-price">
                                                            Giá: {formatPrice(notification.price)} VNĐ
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="no-notifications">Không có thông báo thanh toán</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={handleLogout}>Đăng xuất</button>
                    </>
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