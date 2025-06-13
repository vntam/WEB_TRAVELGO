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

    // Hàm để xử lý đăng xuất
    const handleLogout = () => {
        setUserId(null);
        localStorage.removeItem('userId');
        localStorage.removeItem('user'); 
    };

    return (
        <Router>
            <Header userId={userId} onLogout={handleLogout} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/hotels" element={<HotelList />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/promotions" element={<KhuyenMai />} />
                <Route path="/support" element={<Hotro />} />
                <Route path="/reviews" element={<Review />} />
                <Route path="/login" element={<DangNhap onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/signup" element={<DangKi />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/manage-users" element={<ManageUsers />} />
                <Route path="/manage-invoices" element={<ManageInvoices />} />
                <Route path="/manage-reviews" element={<ManageReviews />} />
                <Route path="/manage-roombooked" element={<ManagerRoomBooked />} />
            </Routes>
        </Router>
    );
}

export default App;