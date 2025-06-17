import React, { useState, useEffect } from 'react';

const BookingsPage = () => {
    const [bookings, setBookings] = useState([]);

    const statusMap = {
        0: "Chờ thanh toán",
        1: "Đang chờ duyệt",
        2: "Đã thanh toán",
        "-1": "Đã hủy"
    };

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                if (!user || !user.id) {
                    throw new Error("Vui lòng đăng nhập để xem danh sách đặt phòng.");
                }

                const response = await fetch(`http://localhost:3000/api/bookings`, {
                    headers: { "Authorization": `Bearer ${user.id}` },
                });
                if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
                const data = await response.json();
                setBookings(data);
            } catch (err) {
                console.error("Error fetching bookings:", err);
            }
        };
        fetchBookings();
    }, []);

    return (
        <div>
            <h2>Danh sách đặt phòng</h2>
            {bookings.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Mã đặt phòng</th>
                            <th>Phòng</th>
                            <th>Giá</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(booking => (
                            <tr key={booking.booking_id}>
                                <td>{booking.booking_id}</td>
                                <td>{booking.hotel_name} - Phòng {booking.room_number}</td>
                                <td>{booking.total_price.toLocaleString()} VNĐ</td>
                                <td>{statusMap[booking.status] || "Không xác định"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Không có đặt phòng nào.</p>
            )}
        </div>
    );
};

export default BookingsPage;