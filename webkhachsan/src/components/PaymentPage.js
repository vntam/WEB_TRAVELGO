import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import './PaymentPage.css';

const PaymentPage = ({ onPaymentSuccess }) => { // Thêm onPaymentSuccess vào props
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const bookingId = queryParams.get('bookingId') || "1257649426";
    const [price, setPrice] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [userBalance, setUserBalance] = useState(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isPaymentDone, setIsPaymentDone] = useState(false);

    // Thêm state cho danh sách thông báo
    const [notifications, setNotifications] = useState([
        { room: "HCM - Phòng 101", price: 400000 },
        { room: "HCM - Phòng 103", price: 800000 },
        { room: "HCM - Phòng 101", price: 400000 },
        { room: "HCM - Phòng 101", price: 400000 },
    ]);

    // Tính tổng tiền
    const totalAmount = notifications.reduce((sum, item) => sum + item.price, 0);

    const startTime = new Date();
    const paymentDeadline = new Date(startTime);
    paymentDeadline.setMinutes(paymentDeadline.getMinutes() + 25);

    const calculateTimeLeft = useCallback(() => {
        const now = new Date();
        const difference = Math.max(0, Math.floor((paymentDeadline - now) / 1000));
        return difference;
    }, [paymentDeadline]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    useEffect(() => {
        const fetchBookingDetails = async () => {
            try {
                const user = JSON.parse(localStorage.getItem("user"));
                if (!user || !user.id) {
                    setError("Vui lòng đăng nhập để xem thông tin thanh toán. Không tìm thấy userId.");
                    return;
                }

                // Lấy số dư từ localStorage thay vì gọi API
                const balance = parseFloat(user.balance) || 0;
                setUserBalance(balance);

                const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Lỗi khi lấy thông tin booking: ${response.status} - ${await response.text()}`);
                }

                const data = await response.json();
                if (data && data.price) {
                    setPrice(data.price);
                } else {
                    setError("Không tìm thấy thông tin đặt phòng cho booking ID: " + bookingId);
                }
            } catch (err) {
                console.error("Error fetching details:", err);
                setError("Lỗi tải thông tin: " + err.message);
            }
        };

        fetchBookingDetails();
    }, [bookingId]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const handleCancel = () => {
        window.history.back();
    };

    const handlePayment = async () => {
        try {
            if (isPaymentDone) {
                setError("Phòng này đã được thanh toán.");
                setTimeout(() => setError(null), 3000);
                return;
            }

            if (userBalance < totalAmount) {
                setError("Số dư không đủ để thực hiện thanh toán.");
                setTimeout(() => setError(null), 3000);
                return;
            }

            setIsPaymentProcessing(true);
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.id) {
                setError("Vui lòng đăng nhập để thực hiện thanh toán.");
                setIsPaymentProcessing(false);
                return;
            }

            const response = await fetch(`http://localhost:3000/api/bookings/pay/${bookingId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.id}`,
                },
                body: JSON.stringify({ price: totalAmount })
            });

            if (!response.ok) {
                const errorText = await response.text();
                const errorData = JSON.parse(errorText || '{}');
                setError(errorData.error || "Lỗi thanh toán");
                setIsPaymentProcessing(false);
                setTimeout(() => setError(null), 3000);
                return;
            }

            const data = await response.json();
            if (data.message === "Thanh toán thành công, chờ admin xác nhận") {
                setSuccessMessage("Thanh toán thành công, chờ admin xác nhận");
                setIsPaymentDone(true);
                if (onPaymentSuccess) onPaymentSuccess(bookingId); // Gọi hàm khi thanh toán thành công
                setTimeout(() => {
                    setSuccessMessage(null);
                    navigate("/bookings");
                }, 3000);
            }
        } catch (err) {
            console.error("Error processing payment:", err);
            setError("Lỗi khi thanh toán: " + err.message);
            setIsPaymentProcessing(false);
            setTimeout(() => setError(null), 3000);
        }
    };

    const formattedDeadline = paymentDeadline.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");

    if (price === null || userBalance === null) {
        return <div>Đang tải thông tin thanh toán...</div>;
    }

    return (
        <div className="payment-container">
            {!isPaymentDone && (
                <div className="notification">
                    {notifications.map((item, index) => (
                        <div key={index}>
                            <p>Thanh toán cho {item.room}</p>
                            <p>Giá: {item.price.toLocaleString()} VNĐ</p>
                        </div>
                    ))}
                    <p><strong>Tổng cộng: {totalAmount.toLocaleString()} VNĐ</strong></p>
                </div>
            )}

            <div className="payment-header">
                <div className="timer" onClick={handleCancel}>
                    <span>Thời gian thanh toán</span>
                    <span className="time-left">{formatTime(timeLeft)}</span>
                    <button className="cancel-button" onClick={handleCancel}>Hủy</button>
                </div>
                <div className="payment-info">
                    <span className="payment-info-title">Chi tiết</span>
                    <p>Mã đặt chỗ: {bookingId}</p>
                    <div className="price-section">
                        <span className="price-label">Số tiền cần thanh toán</span>
                        <p className="price-highlight">{totalAmount.toLocaleString()} VNĐ</p>
                    </div>
                    <p>Số dư hiện tại: {userBalance.toLocaleString()} VNĐ</p>
                </div>
            </div>
            <h2>Quét mã QR để thanh toán</h2>
            <div className="payment-note">
                <p>
                    Vui lòng hoàn tất thanh toán trước thời gian quy định. Nếu không, giao dịch sẽ tự động hủy trong vòng 10 ngày làm việc.
                </p>
            </div>
            <div className="payment-content">
                <div className="qr-code-section">
                    <div className="qr-header">
                        <span className="qr-logo">MBBANK</span>
                        <a href="http://localhost:3000/images/QRCODE/QR.jpg" download className="qr-download">Tải về mã QR</a>
                    </div>
                    <div className="qr-content">
                        <p>Traveloka Việt Nam</p>
                        <img src="http://localhost:3000/images/QRCODE/QR.jpg" alt="Mã QR thanh toán" className="qr-image" />
                        <p className="payment-deadline">
                            Thanh toán trước: {formattedDeadline}
                        </p>
                    </div>
                </div>
            </div>
            <button 
                className="confirm-payment-button" 
                onClick={handlePayment} 
                disabled={isPaymentProcessing || isPaymentDone}
            >
                {isPaymentProcessing ? "Đang chờ duyệt thanh toán" : "Thanh toán"}
            </button>
            {successMessage && <div className="notification success">{successMessage}</div>}
            {error && <div className="notification error">{error}</div>}
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

export default PaymentPage;