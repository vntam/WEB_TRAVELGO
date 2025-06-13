import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header'; 
import Home from './components/Home.js';
import HotelList from './components/HotelList.js';
import KhuyenMai from './components/khuyenmai.js';
import Hotro from './components/hotro.js';
import Review from './components/review.js';
import DangNhap from './components/dangnhap.js';
import DangKi from './components/dangki.js';
import Bookings from './components/phongdadat.js';
import PaymentPage from './components/PaymentPage';
import ManageUsers from './components/ManageUsers.js';
import ManageInvoices from './components/ManageInvoices.js';
import ManageReviews from './components/ManageReviews.js';
import ManagerRoomBooked from './components/ManagerRoomBooked.js';
import Deposit from './components/Deposit'; // Thêm component Deposit
import ManageDeposits from './components/ManageDeposits'; // Thêm component ManageDeposits
import TransactionHistory from './components/TransactionHistory'; // Thêm import này

function App() {
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    const handleLoginSuccess = (id) => {
        setUserId(id);
        localStorage.setItem('userId', id); 
    };

    const handleLogout = () => {
        setUserId(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('user'); 
    };

    const handlePaymentSuccess = (bookingId) => {
        // Logic để cập nhật thông báo trong Header (truyền qua props)
        // Không cần xử lý trực tiếp ở đây, chỉ truyền xuống Header
    };

    return (
        <Router>
            <Header userId={userId} onLogout={handleLogout} onPaymentSuccess={handlePaymentSuccess} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/hotels" element={<HotelList />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/promotions" element={<KhuyenMai />} />
                <Route path="/support" element={<Hotro />} />
                <Route path="/reviews" element={<Review />} />
                <Route path="/login" element={<DangNhap onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<DangKi />} />
                <Route path="/payment" element={<PaymentPage onPaymentSuccess={handlePaymentSuccess} />} />
                <Route path="/manage-users" element={<ManageUsers />} />
                <Route path="/manage-invoices" element={<ManageInvoices />} />
                <Route path="/manage-reviews" element={<ManageReviews />} />
                <Route path="/manage-roombooked" element={<ManagerRoomBooked />} />
                <Route path="/deposit" element={<Deposit userId={userId} />} /> {/* Thêm route cho nạp tiền */}
                <Route path="/manage-deposits" element={<ManageDeposits userId={userId} />} /> {/* Thêm route cho quản lý nạp tiền */}
                <Route path="/transaction-history/:userId" element={<TransactionHistory />} />
            </Routes>
        </Router>
    );
}

export default App;