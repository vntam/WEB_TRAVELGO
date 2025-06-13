import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Deposit.css';

const Deposit = ({ userId }) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleAmountSelect = (value) => {
        setAmount(value);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) {
            setError('Vui lòng đăng nhập để nạp tiền.');
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
                body: JSON.stringify({ amount: parseFloat(amount), userId }),
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess('Yêu cầu nạp tiền đã được gửi. Vui lòng chờ admin duyệt.');
                setAmount('');
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
            <div className="deposit-options">
                <button onClick={() => handleAmountSelect(100000)}>100.000 VNĐ</button>
                <button onClick={() => handleAmountSelect(200000)}>200.000 VNĐ</button>
                <button onClick={() => handleAmountSelect(500000)}>500.000 VNĐ</button>
                <button onClick={() => handleAmountSelect(1000000)}>1.000.000 VNĐ</button>
            </div>
            <form onSubmit={handleSubmit} className="deposit-form">
                <label>Nhập số tiền (VNĐ):</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Nhập số tiền (VD: 500000)"
                    min="10000"
                    step="1000"
                />
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Gửi Yêu Cầu</button>
            </form>
        </div>
    );
};

export default Deposit;