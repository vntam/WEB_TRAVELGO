import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home.js';
import HotelList from './components/HotelList.js';
import KhuyenMai from './components/khuyenmai.js';
import Hotro from './components/hotro.js';
import Review from './components/review.js';
import DangNhap from './components/dangnhap.js';
import DangKi from './components/dangki.js'
import Bookings from './components/phongdadat.js'
import PaymentPage from './components/PaymentPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/hotels" element={<HotelList />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/promotions" element={<KhuyenMai />} />
                <Route path="/support" element={<Hotro />} />
                <Route path="/reviews" element={<Review />} />
                <Route path="/login" element={<DangNhap />} />
                <Route path="/signup" element={<DangKi />} />
                <Route path="/payment" element={<PaymentPage />} />
            </Routes>
        </Router>
    );
}

export default App;