import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ userId, onLogout, onPaymentSuccess }) => {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const userMenuRef = useRef(null);

    const effectiveUserId = userId || localStorage.getItem('userId');

    useEffect(() => {
        if (!effectiveUserId) {
            console.log('No userId provided');
            setUser(null);
            return;
        }
        fetchUserData();
    }, [effectiveUserId]);

    const fetchUserData = async () => {
        console.log('Fetching user data with userId:', effectiveUserId);
        try {
            const response = await fetch(`http://localhost:3000/api/auth/user?userId=${effectiveUserId}`, {
                headers: {
                    'Authorization': `Bearer ${effectiveUserId}`
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('API response:', data);
            if (data.user) {
                setUser(data.user);
                console.log('User data set:', data.user);
            } else {
                console.error('No user data returned from API:', data);
                setUser(null);
            }
        } catch (err) {
            console.error('Error fetching user:', err.message);
            setUser(null);
        }
    };

    const fetchNotifications = async () => {
        if (!effectiveUserId || !user) {
            console.log('Skipping notifications fetch, userId:', effectiveUserId, 'user:', user);
            setNotifications([]);
            return;
        }
        console.log('Fetching notifications for userId:', effectiveUserId);
        try {
            const response = await fetch(`http://localhost:3000/api/notifications`, {
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${effectiveUserId}`
                },
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("Notifications API response:", data);
            if (Array.isArray(data)) {
                // Lọc các booking với status = 1 (chưa thanh toán)
                const relevantBookings = data.filter(booking => booking.status === 1);
                setNotifications(relevantBookings);
            } else {
                console.error('API response is not an array:', data);
                setNotifications([]);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err.message);
            setNotifications([]);
        }
    };

    useEffect(() => {
        if (onPaymentSuccess && user) {
            const handlePaymentSuccess = (bookingId) => {
                console.log('Payment success for bookingId:', bookingId);
                fetchNotifications(); // Làm mới danh sách thông báo sau khi thanh toán
            };
            onPaymentSuccess(handlePaymentSuccess);
        }
    }, [onPaymentSuccess, user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        const handleInvoiceApproved = () => {
            console.log('Invoice approved event received, refreshing notifications');
            fetchNotifications();
        };
        window.addEventListener('invoiceApproved', handleInvoiceApproved);
        return () => window.removeEventListener('invoiceApproved', handleInvoiceApproved);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setUser(null);
        setNotifications([]);
        if (onLogout) onLogout();
        window.location.href = '/';
    };

    const isActive = (path) => location.pathname === path;

    const formatPrice = (price) => {
        return Math.floor(price || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const toggleNotifications = () => setShowNotifications(!showNotifications);
    const handleNotificationClick = (bookingId) => {
        const notification = notifications.find(n => n.booking_id === bookingId);
        if (notification) {
            setNotifications(notifications.filter(n => n.booking_id !== bookingId));
            setShowNotifications(false);
            navigate(`/payment?bookingId=${bookingId}`);
        }
    };

    const handleBulkPayment = () => {
        if (notifications.length > 0) {
            navigate(`/payment?bulk=true&bookingIds=${notifications.map(n => n.booking_id).join(',')}`);
        }
    };

    const toggleUserMenu = () => {
        console.log('Toggling user menu, user:', user);
        setShowUserMenu(!showUserMenu);
    };

    return (
        <nav className="header-nav">
            <div className="logo">
                <Link to="/" className={isActive('/') ? 'active' : ''}>TRAVELGO</Link>
            </div>
            <div className="nav-links">
                {user?.role === 'customer' && (
                    <>
                        <Link to="/hotels" className={isActive('/hotels') ? 'active' : ''}>Khách sạn</Link>
                        <Link to="/reviews" className={isActive('/reviews') ? 'active' : ''}>Các Bài đánh giá</Link>
                    </>
                )}
            </div>
            <div className="user-section">
                {user ? (
                    <div className="user-controls">
                        {user.role === 'customer' && (
                            <div className="notification-bell" ref={dropdownRef}>
                                <button onClick={toggleNotifications} className="bell-button">
                                    🔔 {notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}
                                </button>
                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        {notifications.length > 0 ? (
                                            <>
                                                {notifications.map(notification => (
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
                                                                Giá: {formatPrice(notification.total_price)} VNĐ
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                                <button
                                                    onClick={handleBulkPayment}
                                                    className="bulk-payment-button"
                                                    disabled={notifications.length === 0}
                                                >
                                                    Thanh toán tất cả ({notifications.length} phòng)
                                                </button>
                                            </>
                                        ) : (
                                            <p className="no-notifications">Không có thông báo thanh toán</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="user-menu" ref={userMenuRef}>
                            <button onClick={toggleUserMenu} className="user-button">
                                <span className="greeting">Xin chào, {user.name || 'Khách'}</span>
                                <span className="balance">Số dư: {formatPrice(user.balance)} VNĐ</span>
                            </button>
                            {showUserMenu && (
                                <div className="user-dropdown">
                                    {user.role === 'customer' && (
                                        <>
                                            <Link to={`/profile-edit/${effectiveUserId}`} className={isActive(`/profile-edit/${effectiveUserId}`) ? 'active' : ''}>Chỉnh sửa hồ sơ</Link>
                                            <Link to="/bookings" className={isActive('/bookings') ? 'active' : ''}>Phòng đã đặt</Link>
                                            <Link to="/deposit" className={isActive('/deposit') ? 'active' : ''}>Nạp tiền</Link>
                                            <Link to={`/transaction-history/${effectiveUserId}`} className={isActive(`/transaction-history/${effectiveUserId}`) ? 'active' : ''}>Lịch sử giao dịch</Link>
                                            <Link to="/support" className={isActive('/support') ? 'active' : ''}>Hỗ trợ</Link>
                                        </>
                                    )}
                                    {user.role === 'admin' && (
                                        <>
                                            <Link to="/manage-users" className={isActive('/manage-users') ? 'active' : ''}>Quản lý Tài khoản</Link>
                                            <Link to="/manage-roombooked" className={isActive('/manage-roombooked') ? 'active' : ''}>Quản lý Phòng</Link>
                                            <Link to="/manage-invoices" className={isActive('/manage-invoices') ? 'active' : ''}>Quản lý Hóa đơn</Link>
                                            <Link to="/manage-reviews" className={isActive('/manage-reviews') ? 'active' : ''}>Quản lý Đánh giá</Link>
                                            <Link to="/manage-deposits" className={isActive('/manage-deposits') ? 'active' : ''}>Quản lý Tiền nạp</Link>
                                            <Link to="/admin-transaction-history" className={isActive('/admin-transaction-history') ? 'active' : ''}>Lịch sử Admin</Link>
                                        </>
                                    )}
                                    <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
                                </div>
                            )}
                        </div>
                    </div>
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