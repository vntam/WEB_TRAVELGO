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
import Deposit from './components/Deposit';
import ManageDeposits from './components/ManageDeposits';
import TransactionHistory from './components/TransactionHistory';
import AdminTransactionHistory from './components/AdminTransactionHistory';
import ProfileEdit from './components/ProfileEdit.js';

function App() {
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
            setUserId(storedUserId);
        }
    }, []);

    const handleLoginSuccess = (id) => {
        console.log('Login success with userId:', id); // Thêm log để debug
        setUserId(id);
        localStorage.setItem('userId', id);
    };

    const handleLogout = () => {
        console.log('Logging out'); // Thêm log để debug
        setUserId(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
    };

    const handlePaymentSuccess = (bookingId) => {
        console.log('Payment success for bookingId:', bookingId); // Thêm log để debug
    };

    return (
        <Router>
            <Header userId={userId || localStorage.getItem('userId')} onLogout={handleLogout} onPaymentSuccess={handlePaymentSuccess} />
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
                <Route path="/deposit" element={<Deposit userId={userId} />} />
                <Route path="/manage-deposits" element={<ManageDeposits userId={userId} />} />
                <Route path="/transaction-history/:userId" element={<TransactionHistory />} />
                <Route path="/admin-transaction-history" element={<AdminTransactionHistory />} />
                <Route path="/profile-edit/:userId" element={<ProfileEdit />} />
            </Routes>
        </Router>
    );
}

export default App;