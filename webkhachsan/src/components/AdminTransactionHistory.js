import React, { useState, useEffect } from 'react';
import './AdminTransactionHistory.css';

const AdminTransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminTransactionHistory = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || user.role !== 'admin') {
                    setError('Chỉ admin mới có quyền truy cập trang này');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:3000/api/bookings/admin/transaction-history', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Lỗi khi lấy lịch sử giao dịch');
                }

                const data = await response.json();
                setTransactions(data.transactions || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching admin transaction history:', err);
                setError('Lỗi khi tải lịch sử giao dịch: ' + err.message);
                setLoading(false);
            }
        };

        fetchAdminTransactionHistory();
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

    if (loading) {
        return <div className="loading">Đang tải...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="admin-transaction-container">
            <h2>Lịch Sử Giao Dịch Admin</h2>
            {transactions.length > 0 ? (
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
                        {transactions.map((transaction, index) => (
                            <tr key={index}>
                                <td>{formatDate(transaction.transaction_date)}</td>
                                <td>{transaction.transaction_type.replace('_', ' ').toUpperCase()}</td>
                                <td>
                                    {transaction.amount > 0 ? formatPrice(transaction.amount) + ' VNĐ' : 'N/A'}
                                </td>
                                <td>{transaction.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="no-transactions">Không có giao dịch nào.</p>
            )}
        </div>
    );
};

export default AdminTransactionHistory;