import React, { useState, useEffect } from 'react';
import './ManageDeposits.css';

const ManageDeposits = ({ userId }) => {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3000/api/deposits/pending', {
            headers: {
                'Authorization': `Bearer ${userId}`,
            },
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setDeposits(data.deposits);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching deposits:', err);
                setLoading(false);
            });
    }, [userId]);

    const handleApprove = async (depositId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/deposits/approve/${depositId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userId}`,
                },
            });
            if (response.ok) {
                setDeposits(deposits.filter(d => d.id !== depositId));
            }
        } catch (err) {
            console.error('Error approving deposit:', err);
        }
    };

    const handleReject = async (depositId) => {
        try {
            const response = await fetch(`http://localhost:3000/api/deposits/reject/${depositId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userId}`,
                },
            });
            if (response.ok) {
                setDeposits(deposits.filter(d => d.id !== depositId));
            }
        } catch (err) {
            console.error('Error rejecting deposit:', err);
        }
    };

    if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

    return (
        <div className="manage-deposits-container">
            <h2>Quản Lý Yêu Cầu Nạp Tiền</h2>
            {deposits.length === 0 ? (
                <p>Không có yêu cầu nạp tiền nào đang chờ xử lý.</p>
            ) : (
                <table className="deposits-table">
                    <thead>
                        <tr>
                            <th>ID Yêu Cầu</th>
                            <th>Tên Người Dùng</th>
                            <th>Email</th>
                            <th>Số Tiền</th>
                            <th>Phương thức</th>
                            <th>Thời Gian</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deposits.map(deposit => (
                            <tr key={deposit.id}>
                                <td>{deposit.id}</td>
                                <td>{deposit.name}</td>
                                <td>{deposit.email}</td>
                                <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(deposit.amount)}</td>
                                <td>{deposit.payment_method || 'Chưa xác định'}</td> {/* Sử dụng payment_method từ API */}
                                <td>{new Date(deposit.created_at).toLocaleString('vi-VN')}</td>
                                <td>
                                    <button onClick={() => handleApprove(deposit.id)} className="approve-btn">Duyệt</button>
                                    <button onClick={() => handleReject(deposit.id)} className="reject-btn">Từ Chối</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ManageDeposits;