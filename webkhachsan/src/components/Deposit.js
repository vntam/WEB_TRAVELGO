import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Deposit.css';

const Deposit = ({ userId }) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Payment method:", paymentMethod, "Amount:", amount);
        if (paymentMethod && amount) {
            const user = JSON.parse(localStorage.getItem('user'));
            fetch(`http://localhost:3000/api/deposits/generate-qr?method=${paymentMethod}&amount=${amount}`, {
                headers: { 'Authorization': `Bearer ${user?.id || ''}` },
            })
                .then(response => {
                    if (!response.ok) throw new Error('Lỗi server khi tạo mã QR');
                    return response.json();
                })
                .then(data => {
                    if (data.url) setQrCodeUrl(data.url);
                    else setError('Không thể tạo mã QR.');
                })
                .catch(err => {
                    console.error("[DEPOSIT] Error fetching QR:", err);
                    setError('Lỗi khi tạo mã QR. Vui lòng thử lại.');
                });
        } else {
            setQrCodeUrl('');
        }
    }, [paymentMethod, amount]);

    const handleAmountSelect = (value) => {
        if (!paymentMethod) {
            setError('Vui lòng chọn phương thức nạp tiền trước.');
            return;
        }
        setAmount(value.toString());
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting:", { userId, paymentMethod, amount });
        if (!userId) {
            setError('Vui lòng đăng nhập để nạp tiền.');
            return;
        }
        if (!paymentMethod) {
            setError('Vui lòng chọn phương thức nạp tiền.');
            return;
        }
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setError('Vui lòng nhập số tiền hợp lệ (lớn hơn 0).');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/deposits/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userId}`,
                },
                body: JSON.stringify({ amount: parseFloat(amount), userId, paymentMethod }),
            });

            const data = await response.json();
            console.log("Response:", data);
            if (response.ok) {
                setSuccess(`Yêu cầu nạp tiền bằng ${paymentMethod} với số tiền ${parseFloat(amount).toLocaleString()} VNĐ đã được gửi. Vui lòng quét mã QR để hoàn tất.`);
                setTimeout(() => navigate('/'), 5000);
            } else {
                setError(data.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
            }
        } catch (err) {
            console.error("[DEPOSIT] Error submitting request:", err);
            setError('Lỗi kết nối server. Vui lòng thử lại.');
        }
    };

    const paymentLogos = {
        'viettel_money': '/images/viettel_logo.png',
        'mobifone_money': '/images/mobifone_logo.png',
        'momo': '/images/momo_logo.png',
        'zalopay': '/images/zalopay_logo.png',
    };

    return (
        <div className="deposit-container">
            <h2>Nạp Tiền Vào Tài Khoản</h2>
            <form onSubmit={handleSubmit} className="deposit-form">
                <div className="payment-method">
                    <label>Chọn phương thức nạp:</label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setAmount('');
                            setError('');
                            setSuccess('');
                            setQrCodeUrl('');
                        }}
                        required
                    >
                        <option value="">-- Chọn phương thức --</option>
                        <option value="viettel_money">Viettel Money</option>
                        <option value="mobifone_money">MobiFone Money</option>
                        <option value="momo">MoMo</option>
                        <option value="zalopay">ZaloPay</option>
                    </select>
                    {paymentMethod && (
                        <img src={paymentLogos[paymentMethod]} alt={`${paymentMethod} logo`} className="payment-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                </div>

                {paymentMethod && (
                    <div className="deposit-details">
                        <label>Số tiền (VNĐ):</label>
                        <div className="quick-amounts">
                            {[100000, 200000, 500000, 1000000].map((value) => (
                                <button
                                    type="button"
                                    key={value}
                                    onClick={() => handleAmountSelect(value)}
                                    className={amount === value.toString() ? 'selected' : ''}
                                >
                                    {value.toLocaleString()} VNĐ
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Nhập số tiền (VD: 500000)"
                            min="10000"
                            step="1000"
                        />
                    </div>
                )}

                {amount && (
                    <div className="qr-section">
                        <h3>Mã QR Thanh Toán</h3>
                        {qrCodeUrl ? (
                            <div className="qr-code">
                                <img src={qrCodeUrl} alt="Mã QR" />
                                <a href={qrCodeUrl} download={`QR_${paymentMethod}_${amount}.png`}>Tải về</a>
                            </div>
                        ) : (
                            <p>Đang tạo mã QR...</p>
                        )}
                        <p className="qr-note">Vui lòng quét mã QR bằng ứng dụng của {paymentMethod} để hoàn tất giao dịch với số tiền {amount.toLocaleString()} VNĐ.</p>
                    </div>
                )}

                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit" disabled={!paymentMethod || !amount}>Gửi Yêu Cầu</button>
            </form>
            <div className="instructions">
                <h3>Hướng Dẫn Thanh Toán</h3>
                <ol>
                    <li>Mở ứng dụng {paymentMethod || 'phương thức bạn chọn'} trên điện thoại.</li>
                    <li>Quét mã QR bên trên và nhập số tiền {amount.toLocaleString() || 'đã chọn'} VNĐ.</li>
                    <li>Xác nhận giao dịch và chờ admin duyệt (thường trong 5-10 phút).</li>
                </ol>
            </div>
        </div>
    );
};

export default Deposit;