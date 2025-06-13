import React, { useState, useEffect } from 'react';
import './ManagerRoomBooked.css';

const ManagerRoomBooked = () => {
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || user.role !== 'admin') {
                    setError('Chỉ admin mới có quyền truy cập trang này');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:3000/api/bookings/admin', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Lỗi khi lấy danh sách đặt phòng');
                }

                const data = await response.json();
                setBookings(data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                setError('Lỗi khi tải danh sách đặt phòng');
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const formatPrice = (price) => {
        return Math.floor(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleApproveBooking = async (bookingId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.id}`,
                },
            });

            if (!response.ok) {
                throw new Error('Lỗi khi xác nhận đặt phòng');
            }

            setBookings(bookings.map(booking =>
                booking.booking_id === bookingId ? { ...booking, status: 1 } : booking
            ));
            alert('Xác nhận đặt phòng thành công!');
        } catch (err) {
            console.error('Error approving booking:', err);
            setError('Lỗi khi xác nhận đặt phòng');
        }
    };

    const handleRejectBooking = async (bookingId) => {
        if (window.confirm('Bạn có chắc chắn muốn từ chối đặt phòng này?')) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Lỗi khi từ chối đặt phòng');
                }

                setBookings(bookings.filter(booking => booking.booking_id !== bookingId));
                alert('Từ chối đặt phòng thành công!');
            } catch (err) {
                console.error('Error rejecting booking:', err);
                setError('Lỗi khi từ chối đặt phòng');
            }
        }
    };

    if (loading) {
        return <div className="loading">Đang tải...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    const pendingBookings = bookings.filter(booking => booking.status === 0);

    return (
        <div className="manager-room-booked">
            <h2>Quản lý Phòng đã đặt</h2>

            <h3>Danh sách Đặt phòng Chờ xác nhận</h3>
            {pendingBookings.length > 0 ? (
                <table className="bookings-table">
                    <thead>
                        <tr>
                            <th>Mã Đặt phòng</th>
                            <th>Khách hàng</th>
                            <th>Khách sạn</th>
                            <th>Phòng</th>
                            <th>Số tiền</th>
                            <th>Ngày Nhận</th>
                            <th>Ngày Trả</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingBookings.map(booking => (
                            <tr key={booking.booking_id}>
                                <td>{booking.booking_id}</td>
                                <td>{booking.user_name}</td>
                                <td>{booking.hotel_name}</td>
                                <td>{booking.room_number} ({booking.room_type})</td>
                                <td>{formatPrice(booking.total_price)} VNĐ</td>
                                <td>{formatDate(booking.check_in)}</td>
                                <td>{formatDate(booking.check_out)}</td>
                                <td>
                                    <span className="status-badge status-pending">Chờ xác nhận</span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => handleApproveBooking(booking.booking_id)}
                                            className="approve-button"
                                        >
                                            Xác nhận
                                        </button>
                                        <button
                                            onClick={() => handleRejectBooking(booking.booking_id)}
                                            className="reject-button"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="no-bookings">Không có đặt phòng nào đang chờ xác nhận.</p>
            )}
        </div>
    );
};

export default ManagerRoomBooked;