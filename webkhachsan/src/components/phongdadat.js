import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './PhongDaDat.css';
import room_1 from '../images/room/room_1.jpg';
import room_2 from '../images/room/room_2.jpg';
import room_3 from '../images/room/room_3.jpg';
import room_4 from '../images/room/room_4.jpg';
import room_5 from '../images/room/room_5.jpg';
import room_6 from '../images/room/room_6.jpg';
import room_7 from '../images/room/room_7.jpg';
import room_8 from '../images/room/room_8.jpg';
import room_9 from '../images/room/room_9.jpg';

const room_img = {
    1: room_1, 2: room_2, 3: room_3, 4: room_4, 5: room_5,
    6: room_6, 7: room_7, 8: room_8, 9: room_9
};

function PhongDaDat() {
    const [bookedRooms, setBookedRooms] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingRoom, setEditingRoom] = useState(null);
    const [detailsRoom, setDetailsRoom] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            setError("Vui lòng đăng nhập để xem phòng đã đặt.");
            navigate("/login");
            return;
        }

        const fetchBookings = async () => {
            try {
                const response = await fetch("http://localhost:3000/api/bookings", {
                    method: "GET",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.id}` },
                });
                if (!response.ok) throw new Error(await response.text());
                const data = await response.json();
                setBookedRooms(data);
            } catch (err) {
                console.error("Lỗi khi tải danh sách phòng đã đặt:", err);
                setError("Lỗi tải danh sách phòng đã đặt");
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [navigate]);

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const formatPrice = (price) => Math.floor(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const handleCancelBooking = async (bookingId) => {
        if (window.confirm("Bạn có chắc chắn muốn hủy đặt phòng này không?")) {
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.id}` },
                });
                if (!response.ok) throw new Error(await response.text());
                setBookedRooms(bookedRooms.filter(room => room.booking_id !== bookingId));
                alert("Hủy phòng thành công!");
            } catch (err) {
                console.error("Lỗi khi hủy đặt phòng:", err);
                setError("Lỗi khi hủy đặt phòng");
            }
        }
    };

    const handleEditBooking = (room) => setEditingRoom({ ...room, check_in: room.check_in.split('T')[0], check_out: room.check_out.split('T')[0] });
    const handleSaveEdit = async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            const response = await fetch(`http://localhost:3000/api/bookings/${editingRoom.booking_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.id}` },
                body: JSON.stringify({ check_in: editingRoom.check_in, check_out: editingRoom.check_out }),
            });
            if (!response.ok) throw new Error(await response.text());
            setBookedRooms(bookedRooms.map(room => room.booking_id === editingRoom.booking_id ? { ...room, check_in: editingRoom.check_in, check_out: editingRoom.check_out } : room));
            setEditingRoom(null);
            alert("Cập nhật phòng thành công!");
        } catch (err) {
            console.error("Lỗi khi cập nhật đặt phòng:", err);
            setError("Lỗi khi cập nhật đặt phòng");
        }
    };

    const handleViewDetails = (room) => setDetailsRoom(detailsRoom?.booking_id === room.booking_id ? null : room);

    const pendingRooms = bookedRooms.filter(room => room.status === 0);
    const rejectedRooms = bookedRooms.filter(room => room.status === -1);
    const approvedRooms = bookedRooms.filter(room => room.status === 2);

    if (loading) return <div>Đang tải...</div>;

    return (
        <div className="booked-rooms">
            <h2>Danh Sách Phòng Đã Đặt</h2>
            {error && <div className="error-message">{error}</div>}
            
            {pendingRooms.length > 0 && (
                <div className="booked-rooms-container">
                    {pendingRooms.map((room) => (
                        <div key={room.booking_id} className="booked-room-card">
                            <h3>{room.hotel_name}</h3>
                            <img src={room_img[room.room_id]} alt={room.room_number} className="room-image" />
                            <p>Phòng: {room.room_number} - Loại: {room.room_type}</p>
                            <p className="price-highlight">Giá: <strong>{formatPrice(room.price)} VNĐ</strong></p>
                            <p>Ngày nhận: {formatDate(room.check_in)}</p>
                            <p>Ngày trả: {formatDate(room.check_out)}</p>
                            <p className="status-pending">Trạng thái: Chờ xác nhận</p>
                            <div className="button-group">
                                <button onClick={() => handleViewDetails(room)} className="details-button">
                                    {detailsRoom?.booking_id === room.booking_id ? "Ẩn Chi Tiết" : "Xem Chi Tiết"}
                                </button>
                                <button onClick={() => handleEditBooking(room)} className="edit-button">Chỉnh Sửa</button>
                                <button onClick={() => handleCancelBooking(room.booking_id)} className="cancel-button">Hủy</button>
                            </div>
                            {detailsRoom?.booking_id === room.booking_id && (
                                <div className="room-details">
                                    <h4>Thông Tin Chi Tiết</h4>
                                    <p>Địa chỉ khách sạn: {room.hotel_name}, TP. Hồ Chí Minh</p>
                                    <p>Tiện nghi: Wi-Fi miễn phí, Điều hòa, TV</p>
                                    <p>Chính sách hủy: Miễn phí nếu hủy trước 24 giờ</p>
                                </div>
                            )}
                            {editingRoom?.booking_id === room.booking_id && (
                                <div className="edit-form">
                                    <h4>Chỉnh Sửa Đặt Phòng</h4>
                                    <label>Ngày nhận: <input type="date" value={editingRoom.check_in} onChange={(e) => setEditingRoom({ ...editingRoom, check_in: e.target.value })} /></label>
                                    <label>Ngày trả: <input type="date" value={editingRoom.check_out} onChange={(e) => setEditingRoom({ ...editingRoom, check_out: e.target.value })} /></label>
                                    <div className="edit-form-buttons">
                                        <button onClick={handleSaveEdit} className="save-button">Lưu</button>
                                        <button onClick={() => setEditingRoom(null)} className="cancel-edit-button">Hủy</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button className="history-button" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Ẩn Lịch sử' : 'Xem Lịch sử'}
            </button>

            {showHistory && (
                <div className="history-container">
                    {(rejectedRooms.length > 0 || approvedRooms.length > 0) ? (
                        <>
                            {rejectedRooms.map((room) => (
                                <div key={room.booking_id} className="history-room-card">
                                    <h3>{room.hotel_name}</h3>
                                    <img src={room_img[room.room_id]} alt={room.room_number} className="room-image" />
                                    <p>Phòng: {room.room_number} - Loại: {room.room_type}</p>
                                    <p className="price-highlight">Giá: <strong>{formatPrice(room.price)} VNĐ</strong></p>
                                    <p>Ngày nhận: {formatDate(room.check_in)}</p>
                                    <p>Ngày trả: {formatDate(room.check_out)}</p>
                                    <p className="status-rejected">Trạng thái: Không xác nhận</p>
                                </div>
                            ))}
                            {approvedRooms.map((room) => (
                                <div key={room.booking_id} className="history-room-card">
                                    <h3>{room.hotel_name}</h3>
                                    <img src={room_img[room.room_id]} alt={room.room_number} className="room-image" />
                                    <p>Phòng: {room.room_number} - Loại: {room.room_type}</p>
                                    <p className="price-highlight">Giá: <strong>{formatPrice(room.price)} VNĐ</strong></p>
                                    <p>Ngày nhận: {formatDate(room.check_in)}</p>
                                    <p>Ngày trả: {formatDate(room.check_out)}</p>
                                    <p className="status-paid">Trạng thái: Đã thanh toán</p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>Không có lịch sử đặt phòng.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PhongDaDat;