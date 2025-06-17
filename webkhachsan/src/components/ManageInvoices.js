import React, { useState, useEffect } from 'react';
import './ManageInvoices.css';

const ManageInvoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState({ daily: 0, monthly: 0, yearly: 0 });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user || user.role !== 'admin') {
                    setError('Chỉ admin mới có quyền truy cập trang này');
                    setLoading(false);
                    return;
                }

                const response = await fetch('http://localhost:3000/api/invoices', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Lỗi khi lấy danh sách hóa đơn');
                }

                const data = await response.json();
                setInvoices(data);

                const now = new Date();
                let dailyTotal = 0;
                let monthlyTotal = 0;
                let yearlyTotal = 0;

                data.forEach(invoice => {
                    const paymentDate = new Date(invoice.payment_date);
                    const amount = parseFloat(invoice.amount);

                    if (paymentDate.getFullYear() === now.getFullYear()) {
                        yearlyTotal += amount;
                    }
                    if (
                        paymentDate.getFullYear() === now.getFullYear() &&
                        paymentDate.getMonth() === now.getMonth()
                    ) {
                        monthlyTotal += amount;
                    }
                    if (
                        paymentDate.getFullYear() === now.getFullYear() &&
                        paymentDate.getMonth() === now.getMonth() &&
                        paymentDate.getDate() === now.getDate()
                    ) {
                        dailyTotal += amount;
                    }
                });

                setStats({
                    daily: dailyTotal,
                    monthly: monthlyTotal,
                    yearly: yearlyTotal,
                });

                setLoading(false);
            } catch (err) {
                console.error('Error fetching invoices:', err);
                setError('Lỗi khi tải danh sách hóa đơn: ' + err.message);
                setLoading(false);
            }
        };

        fetchInvoices();
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

    const handleApproveInvoice = async (invoiceId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.id}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Lỗi khi xác nhận hóa đơn');
            }

            const data = await response.json();
            setInvoices(invoices.map(invoice =>
                invoice.invoice_id === invoiceId ? { ...invoice, status: 'completed' } : invoice
            ));
            setSuccessMessage(data.message);
            // Gửi sự kiện đến Header để làm mới thông báo (nếu cần)
            const event = new Event('invoiceApproved');
            window.dispatchEvent(event);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Error approving invoice:', err);
            setError('Lỗi khi xác nhận hóa đơn: ' + err.message);
        }
    };

    const handleRejectInvoice = async (invoiceId) => {
        if (window.confirm('Bạn có chắc chắn muốn từ chối hóa đơn này?')) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}/reject`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.id}`,
                    },
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Lỗi khi từ chối hóa đơn');
                }

                const data = await response.json();
                setInvoices(invoices.map(invoice =>
                    invoice.invoice_id === invoiceId ? { ...invoice, status: 'rejected' } : invoice
                ));
                setSuccessMessage(data.message);
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err) {
                console.error('Error rejecting invoice:', err);
                setError('Lỗi khi từ chối hóa đơn: ' + err.message);
            }
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'completed':
                return 'status-completed';
            case 'pending':
                return 'status-pending';
            case 'rejected':
                return 'status-rejected';
            default:
                return '';
        }
    };

    if (loading) {
        return <div className="loading">Đang tải...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="manage-invoices">
            <h2>Quản lý Hóa đơn</h2>

            {successMessage && <div className="success-message">{successMessage}</div>}

            <div className="stats-container">
                <div className="stat-card">
                    <h3>Doanh thu hôm nay</h3>
                    <p>{formatPrice(stats.daily)} VNĐ</p>
                </div>
                <div className="stat-card">
                    <h3>Doanh thu tháng này</h3>
                    <p>{formatPrice(stats.monthly)} VNĐ</p>
                </div>
                <div className="stat-card">
                    <h3>Doanh thu năm nay</h3>
                    <p>{formatPrice(stats.yearly)} VNĐ</p>
                </div>
            </div>

            <h3>Lịch sử Thanh toán</h3>
            {invoices.length > 0 ? (
                <table className="invoices-table">
                    <thead>
                        <tr>
                            <th>Mã Hóa đơn</th>
                            <th>Mã Đặt phòng</th>
                            <th>Khách hàng</th>
                            <th>Số tiền</th>
                            <th>Ngày Thanh toán</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => (
                            <tr key={invoice.invoice_id}>
                                <td>{invoice.invoice_id}</td>
                                <td>{invoice.booking_id}</td>
                                <td>{invoice.user_name}</td>
                                <td>{formatPrice(invoice.amount)} VNĐ</td>
                                <td>{formatDate(invoice.payment_date)}</td>
                                <td>
                                    <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                                        {invoice.status === 'completed' ? 'Hoàn tất' : 
                                         invoice.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                                    </span>
                                </td>
                                <td>
                                    {invoice.status === 'pending' && (
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => handleApproveInvoice(invoice.invoice_id)}
                                                className="approve-button"
                                            >
                                                Xác nhận
                                            </button>
                                            <button
                                                onClick={() => handleRejectInvoice(invoice.invoice_id)}
                                                className="reject-button"
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="no-invoices">Chưa có hóa đơn nào.</p>
            )}
        </div>
    );
};

export default ManageInvoices;