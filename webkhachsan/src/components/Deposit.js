import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Deposit.css';

const Deposit = ({ userId }) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleAmountSelect = (value) => {
        if (!paymentMethod) {
            setError('Vui lòng chọn phương thức nạp tiền trước.');
            return;
        }
        setAmount(value);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // Đảm bảo form không tự động submit
        if (!userId) {
            setError('Vui lòng đăng nhập để nạp tiền.');
            return;
        }
        if (!paymentMethod) {
            setError('Vui lòng chọn phương thức nạp tiền.');
            return;
        }
        if (!amount || isNaN(amount) || amount <= 0) {
            setError('Vui lòng nhập số tiền hợp lệ (lớn hơn 0).');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/deposits/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: parseFloat(amount), userId, paymentMethod }),
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess(`Yêu cầu nạp tiền bằng ${paymentMethod} đã được gửi. Vui lòng chờ admin duyệt hoặc thực hiện giao dịch theo hướng dẫn.`);
                setAmount('');
                setPaymentMethod('');
                setTimeout(() => navigate('/'), 3000);
            } else {
                setError(data.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
            }
        } catch (err) {
            setError('Lỗi kết nối server. Vui lòng thử lại.');
        }
    };

    return (
        <div className="deposit-container">
            <h2>Nạp Tiền Vào Tài Khoản</h2>
            <form onSubmit={handleSubmit} className="deposit-form">
                <label>Chọn phương thức nạp:</label>
                <select
                    value={paymentMethod}
                    onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setAmount(''); // Reset số tiền khi đổi phương thức
                        setError('');
                        setSuccess('');
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
                    <>
                        <label>Nhập số tiền (VNĐ):</label>
                        <div className="deposit-options">
                            <button type="button" onClick={() => handleAmountSelect(100000)}>100.000 VNĐ</button>
                            <button type="button" onClick={() => handleAmountSelect(200000)}>200.000 VNĐ</button>
                            <button type="button" onClick={() => handleAmountSelect(500000)}>500.000 VNĐ</button>
                            <button type="button" onClick={() => handleAmountSelect(1000000)}>1.000.000 VNĐ</button>
                        </div>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Nhập số tiền (VD: 500000)"
                            min="10000"
                            step="1000"
                        />
                    </>
                )}
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit" disabled={!paymentMethod || !amount}>Gửi Yêu Cầu</button>
            </form>
        </div>
    );
};

export default Deposit;