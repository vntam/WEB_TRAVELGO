import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './TransactionHistory.css';

const TransactionHistory = () => {
    const { userId } = useParams();
    const [transactions, setTransactions] = useState([]);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTransactionHistory = async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/bookings/transaction-history/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userId')}`
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    setTransactions(data.transactions || []);
                    setCurrentBalance(data.currentBalance || 0);
                } else {
                    setError(data.error || 'Lỗi khi lấy lịch sử giao dịch');
                }
            } catch (err) {
                setError('Lỗi kết nối server');
            }
        };

        fetchTransactionHistory();
    }, [userId]);

    return (
        <div className="transaction-history-container">
            <h2>Lịch Sử Giao Dịch</h2>
            {error && <p className="error">{error}</p>}
            <div className="balance-info">
                Số dư hiện tại: <span>{currentBalance.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
            </div>
            <table className="transaction-table">
                <thead>
                    <tr>
                        <th>Ngày Giờ</th>
                        <th>Loại Giao Dịch</th>
                        <th>Số Tiền</th>
                        <th>Mô Tả</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.length > 0 ? (
                        transactions.map((transaction, index) => (
                            <tr key={index}>
                                <td>{new Date(transaction.transaction_date).toLocaleString('vi-VN')}</td>
                                <td className={transaction.transaction_type === 'deposit' ? '' : 'minus'}>
                                    {transaction.transaction_type === 'deposit' ? 'Cộng' : 'Trừ'}
                                </td>
                                <td>{transaction.amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                                <td>{transaction.description}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="no-transactions">Không có giao dịch nào.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionHistory;