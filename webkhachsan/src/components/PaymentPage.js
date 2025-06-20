import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import './PaymentPage.css';

const Timer = ({ isPaymentDone, onCancel }) => {
    const paymentDeadline = useMemo(() => new Date(Date.now() + 25 * 60 * 1000), []);
    const [timeLeft, setTimeLeft] = useState(() => {
        const difference = Math.max(0, Math.floor((paymentDeadline - Date.now()) / 1000));
        return difference;
    });

    useEffect(() => {
        let timer = null;
        if (!isPaymentDone) {
            timer = setInterval(() => {
                const difference = Math.max(0, Math.floor((paymentDeadline - Date.now()) / 1000));
                setTimeLeft(difference);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [paymentDeadline, isPaymentDone]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const formattedDeadline = paymentDeadline.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");

    return (
        <div className="timer" onClick={onCancel}>
            <span>Thời gian thanh toán</span>
            <span className="time-left">{formatTime(timeLeft)}</span>
            <button className="cancel-button" onClick={onCancel}>Hủy</button>
            <p>Thanh toán trước: {formattedDeadline}</p>
        </div>
    );
};

const PaymentPage = ({ onPaymentSuccess }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialBookingId = queryParams.get('bookingId'); // Lấy bookingId từ query params

    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [userBalance, setUserBalance] = useState(null);
    const [isPaymentPending, setIsPaymentPending] = useState(false);
    const [isPaymentDone, setIsPaymentDone] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId || null);

    const fetchBookingDetails = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.id) {
                throw new Error("Vui lòng đăng nhập để xem thông tin thanh toán.");
            }

            console.log("[PAYMENT] Fetching user balance for userId:", user.id);
            setUserBalance(parseFloat(user.balance) || 0);
            setNotifications([]);

            const response = await fetch(`http://localhost:3000/api/notifications`, {
                headers: { "Authorization": `Bearer ${user.id}` },
            });
            if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
            const data = await response.json();

            // Lấy cả các trạng thái để hiển thị lịch sử
            const allBookings = data.map(item => ({
                room: item.hotel_name && item.room_number ? `${item.hotel_name} - Phòng ${item.room_number}` : `Phòng ${item.room_number || 'Không xác định'}`,
                price: parseFloat(item.total_price) || 0,
                bookingId: item.booking_id,
                status: item.status || 0
            })).filter(item => item.price > 0);

            setNotifications(allBookings);
            // Nếu có bookingId từ query params, tự động chọn
            if (initialBookingId && !selectedBookingId) {
                setSelectedBookingId(initialBookingId);
            }
        } catch (err) {
            console.error("[PAYMENT] Error fetching booking details:", err);
            setErrorMessage(err.message);
        }
    }, [initialBookingId, selectedBookingId]);

    useEffect(() => {
        fetchBookingDetails();
    }, [fetchBookingDetails, initialBookingId]);

    const selectedNotification = useMemo(() => 
        notifications.find(n => n.bookingId.toString() === selectedBookingId),
        [notifications, selectedBookingId]
    );

    const handleSelectBooking = (bookingId) => {
        setSelectedBookingId(bookingId);
        setIsPaymentDone(false); // Reset trạng thái khi chọn phòng mới
        setErrorMessage(null);
        setSuccessMessage(null);
    };

    const handlePayment = useCallback(async () => {
        try {
            if (!selectedNotification) {
                setErrorMessage("Vui lòng chọn một booking để thanh toán.");
                return;
            }

            if (isPaymentDone) {
                setErrorMessage("Phòng này đã được thanh toán.");
                return;
            }

            if (userBalance < selectedNotification.price) {
                setErrorMessage("Số dư không đủ để thực hiện thanh toán.");
                return;
            }

            setIsPaymentPending(true);
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.id) {
                throw new Error("Vui lòng đăng nhập để thực hiện thanh toán.");
            }

            console.log("[PAYMENT] Sending payment request: bookingId=", selectedNotification.bookingId, "price=", selectedNotification.price);
            const response = await fetch(`http://localhost:3000/api/bookings/pay/${selectedNotification.bookingId}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${user.id}`, "Content-Type": "application/json" },
                body: JSON.stringify({ price: selectedNotification.price })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[PAYMENT] Payment error for bookingId", selectedNotification.bookingId, ":", errorText);
                throw new Error(`Lỗi thanh toán: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            if (result.message === "Thanh toán thành công" || result.message.includes("đã được gửi")) {
                setSuccessMessage("Đang chờ duyệt để thanh toán ");
                setIsPaymentDone(true);
                setNotifications(notifications.map(n => 
                    n.bookingId === selectedNotification.bookingId ? { ...n, status: 2 } : n
                )); // Cập nhật status thành 2
                onPaymentSuccess?.([selectedNotification.bookingId]);
                setTimeout(() => navigate("/bookings"), 3000);
            }
        } catch (err) {
            console.error("[PAYMENT] Error processing payment:", err);
            setErrorMessage("Lỗi khi thanh toán: " + err.message);
        } finally {
            setIsPaymentPending(false);
            setTimeout(() => setErrorMessage(null), 3000);
        }
    }, [selectedNotification, isPaymentDone, userBalance, notifications, navigate, onPaymentSuccess]);

    // Định nghĩa handleCancel
    const handleCancel = useCallback(() => {
        navigate(-1); // Quay lại trang trước
    }, [navigate]);

    return (
        <div className="payment-container">
            {/* Dropdown thông báo */}
            <div className="notification-dropdown">
                {notifications.map((item) => (
                    <div 
                        key={item.bookingId} 
                        className={`notification-item ${selectedBookingId === item.bookingId.toString() ? 'selected' : ''}`}
                        onClick={() => handleSelectBooking(item.bookingId.toString())}
                    >
                        <p>Phòng: {item.room}</p>
                        <p>Giá: {item.price.toLocaleString()} VNĐ</p>
                        <p>Trạng thái: {item.status === 0 ? "Chờ thanh toán" : item.status === 1 ? "Chờ thanh toán" : "Đã thanh toán"}</p>
                    </div>
                ))}
            </div>

            {/* Thông tin thanh toán */}
            {selectedNotification && (
                <div className="payment-details">
                    <div className="payment-header">
                        <Timer isPaymentDone={isPaymentDone} onCancel={handleCancel} />
                        <div className="payment-info">
                            <span className="payment-info-title">Chi tiết</span>
                            <p>Mã đặt chỗ: {selectedNotification.bookingId}</p>
                            <div className="price-section">
                                <span className="price-label">Số tiền cần thanh toán</span>
                                <p className="price-highlight">{selectedNotification.price.toLocaleString()} VNĐ</p>
                            </div>
                            <p>Số dư hiện tại: {userBalance.toLocaleString()} VNĐ</p>
                        </div>
                    </div>
                    <h2>Quét mã QR để thanh toán</h2>
                    <div className="payment-note">
                        <p>Vui lòng hoàn tất thanh toán trước thời gian quy định. Nếu không, giao dịch sẽ tự động hủy trong vòng 10 ngày làm việc.</p>
                    </div>
                    <div className="payment-content">
                        <div className="qr-code-section">
                            <div className="qr-header">
                                <span className="qr-logo">MBBANK</span>
                                <a href="http://localhost:3000/images/QRCODE/QR.jpg" download className="qr-download">Tải về mã QR</a>
                            </div>
                            <div className="qr-content">
                                <p>TRAVELGO</p>
                                <img src="http://localhost:3000/images/QRCODE/QR.jpg" alt="Mã QR thanh toán" className="qr-image" />
                            </div>
                        </div>
                    </div>
                    <button 
                        className="confirm-payment-button" 
                        onClick={handlePayment} 
                        disabled={isPaymentPending || isPaymentDone || !selectedNotification}
                    >
                        {isPaymentPending ? "Đang xử lý thanh toán" : "Thanh toán"}
                    </button>
                </div>
            )}
            {errorMessage && <div className="notification error">{errorMessage}</div>}
            {successMessage && <div className="notification success">{successMessage}</div>}
            <div className="payment-instructions">
                <h3>Hướng dẫn thanh toán QR</h3>
                <ol>
                    <li>Mở Ví điện tử hoặc Ứng dụng ngân hàng hỗ trợ thanh toán QR bằng VietQR, sau đó quét mã QR bên trên.</li>
                    <li>Vui lòng kiểm tra và đảm bảo số tiền và thông tin thanh toán khớp với thông tin đơn hàng, sau đó hoàn tất giao dịch trên ứng dụng thanh toán.</li>
                    <li>Thông tin đặt chỗ sẽ được tự động xác nhận khi thanh toán thành công. Vui lòng kiểm tra trạng thái đặt chỗ trên trang Đặt chỗ.</li>
                </ol>
            </div>
        </div>
    );
};

export default React.memo(PaymentPage);