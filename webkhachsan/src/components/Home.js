import React, { useState, useEffect } from 'react';
import Header from './Header.js';
import SearchBar from './SearchBar.js';
import { useNavigate } from 'react-router-dom';
import './Home.css';

import nghi_duong from "../images/nghi_duong.jpg";

import ailLogo from "../images/partners/ail-logo.png";
import annualReportLogo from "../images/partners/annual-report-logo.png";
import ehgLogo from "../images/partners/ehg-logo.png";
import ehg from "../images/partners/fusion-logo.png";
import odysseaLogo from "../images/partners/odyssea-logo.png";
import noxiLogo from "../images/partners/noxi-logo.png";
import visaLogo from "../images/partners/visa-logo.png";
import vibLogo from "../images/partners/vib-logo.png";
import vietcombankLogo from "../images/partners/vietcombank-logo.png";
import mbLogo from "../images/partners/mb-logo.png";
import momo from "../images/partners/momo.png";
import acb from "../images/partners/acb.png";
import fusionLogo from "../images/partners/fusion.png";
import marirot from "../images/partners/marirot.png";
import tpbank from "../images/partners/tpbank.png";

import khuyenmai_1 from '../images/promotion/khuyenmai_1.jpg';
import khuyenmai_2 from '../images/promotion/khuyenmai_2.jpg';
import khuyenmai_3 from '../images/promotion/khuyenmai_3.jpg';

const hotelPartners = [
    { name: "AIL", description: "ACCOP LIVE LIMITLESS", logo: ailLogo },
    { name: "ASIAN RUBBY", description: "CHOICE", logo: annualReportLogo },
    { name: "EHG", description: "DISCOUNTY SERVICE", logo: ehgLogo },
    { name: "Fusion", logo: fusionLogo },
    { name: "ODYSSEA", description: "Industry", logo: odysseaLogo },
    { name: "FLC", logo: noxiLogo },
    { name: "EHG", logo: ehg },
    { name: "MARRIROT", logo: marirot }
];

const paymentPartners = [
    { name: "VISA", logo: visaLogo },
    { name: "VIB", logo: vibLogo },
    { name: "Vietcombank", logo: vietcombankLogo },
    { name: "MB", logo: mbLogo },
    { name: "MOMO", logo: momo },
    { name: "ACB", logo: acb },
    { name: "TP Bank", logo: tpbank }
];

const khuyenmai_img = {
    1: khuyenmai_1,
    2: khuyenmai_2,
    3: khuyenmai_3
};

const Home = () => {
    const [promotions, setPromotions] = useState([]);
    const [reviews, setReviews] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:3000/api/promotions')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setPromotions(data);
                } else {
                    setPromotions([]);
                }
            })
            .catch(err => console.error('Error fetching promotions:', err));
    }, []);

    useEffect(() => {
        fetch('http://localhost:3000/api/reviews')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setReviews(data);
                } else {
                    setReviews([]);
                }
            })
            .catch(err => console.error('Error fetching reviews:', err));
    }, []);

    const handleSearch = ({ checkIn, checkOut }) => {
        navigate('/khachsan', { state: { checkIn, checkOut } });
    };

    const weekendDealBanner = {
        promotion_id: 'banner-1',
        promotion_name: 'Deal tiết kiệm đi chơi cuối tuần',
        description: 'Nhiều lựa chọn khách sạn với ưu đãi lên đến 500k',
        discount_value: 500000,
        start_date: '2025-05-14',
        end_date: '2025-05-20',
        status: true,
        image: 'https://ik.imagekit.io/tvlk/image/imageResource/2025/05/05/1746418051057-ae132287ead46ee6ad441756ad1f2c11.jpeg?tr=q-75',
    };

    return (
        <div className="home-container">
            <Header />
            <h1>Chào mừng đến với hệ thống khách sạn</h1>
            <div className="search-banner">
                <SearchBar onSearch={handleSearch} />
            </div>
            <h2>Hoạt động của khách sạn</h2>
            <div className="promotion-container">
                <div key={weekendDealBanner.promotion_id} className="promotion-item banner">
                    <img
                        src={weekendDealBanner.image}
                        alt={weekendDealBanner.promotion_name}
                        className="promotion-banner"
                    />
                    <p>Mô tả: {weekendDealBanner.description}</p>
                    <p>Giảm giá: {weekendDealBanner.discount_value.toLocaleString()} VNĐ</p>
                    <p>Thời gian: {weekendDealBanner.start_date} - {weekendDealBanner.end_date}</p>
                    <p>Trạng thái: {weekendDealBanner.status ? "Đang hoạt động" : "Kết thúc"}</p>
                </div>    
            </div>

            <h2>Các Bài Review</h2>
            <div className="hotel-list"> 
                {reviews.length > 0 ? (
                    reviews.map((r) => (
                        <div key={r.review_id} className="promotion-item"> 
                            {r.image_url ? (
                                <img
                                    src={r.image_url}
                                    alt={`Review ${r.review_id}`}
                                    className="review-image"
                                    onError={(e) => {
                                        e.target.src = "/logo192.png";
                                        console.log("Error loading image for review:", r.review_id, "URL:", r.image_url);
                                    }}
                                />
                            ) : (
                                <p>Không có ảnh</p>
                            )}
                            <h3>Khách sạn: {r.hotel_name || "Không xác định"}</h3>
                            <p>Người dùng: {r.user_name || "Ẩn danh"}</p>
                            <p>Mô tả: {r.content || "Không có đánh giá nào"}</p>
                            <p>Đánh giá: {r.rating} sao</p>
                            <p>Ngày đánh giá: {r.review_date}</p>
                        </div>
                    ))
                ) : (
                    <p>Không tìm thấy đánh giá nào cả!</p>
                )}
            </div>


            <div className="partners-section">
                <h2>Đối tác khách sạn</h2>
                <p className="partners-description">Đối tác khách sạn trong nước và quốc tế</p>
                <p>Chúng tôi hợp tác với các chuỗi khách sạn trên toàn thế giới để bảo đảm mang lại kỳ nghỉ tuyệt vời nhất tại mọi điểm đến trong mơ của bạn!</p>
                
                <div className="partners-grid">
                    {hotelPartners.map((partner, index) => (
                        <div key={index} className="partner-card">
                            <img src={partner.logo} alt={partner.name} className="partner-logo" />
                            <div className="partner-info">
                                <h3>{partner.name}</h3>
                                {partner.description && <p>{partner.description}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            <div className="partners-section">
                <h2>Đối tác thanh toán</h2>
                <p>Những đối tác thanh toán đáng tin cậy của chúng tôi sẽ giúp cho bạn luôn an tâm thực hiện mọi giao dịch một cách thuận lợi nhất!</p>
                
                <div className="payment-partners-grid">
                    {paymentPartners.map((partner, index) => (
                        <div key={index} className="payment-partner-card">
                            <img src={partner.logo} alt={partner.name} className="payment-logo" />
                        </div>
                    ))}
                </div>
            </div>

            <div className='register-accommodation'>
                <h2>Đăng kí nơi nghỉ của bạn</h2>
                <img src={nghi_duong} alt="Mô tả hình ảnh" />
                <p>Tiếp cận hàng triệu khách hàng tiềm năng và nâng tầm doanh nghiệp của bạn với chúng tôi.</p>
            </div>

            <h2>Khuyến mãi của chúng tôi</h2>
            <div className="hotel-list"> 
                {promotions.length > 0 ? (
                    promotions.map((promo) => (
                        <div key={promo.promotion_id} className="promotion-item">
                            <h3>{promo.promotion_name}</h3>
                            <img
                                src={khuyenmai_img[promo.promotion_id]}
                                alt={promo.promotion_name}
                                className="khuyenmai-img"
                            />
                            <p>Phòng áp dụng: {promo.room_id}</p>
                            <p>Mô tả: {promo.description || "Không có mô tả"}</p>
                            <p>Giảm giá: {promo.discount_value}%</p>
                            <p>Thời gian: {promo.start_date} - {promo.end_date}</p>
                            <p>Trạng thái: {promo.status ? "Đang hoạt động" : "Kết thúc"}</p>
                        </div>
                    ))
                ) : (
                    <p>Không tìm thấy khuyến mãi</p>
                )}
            </div>

            <div className="home-footer">
                <div className="footer-content">
                    <div className="footer-column">
                        <h3>Về chúng tôi</h3>
                        <p>Tuyển dụng</p>
                        <p>Tuyền cộng tác viên</p>
                        <p>Chính sách</p>
                    </div>
                    <div className="footer-column">
                        <h3>Liên hệ với chúng tôi</h3>
                        <p>Facebook</p>
                        <p>Instagram</p>
                        <p>Email</p>
                    </div>


                    <div className="footer-column">
                        <h3>Đối tác thanh toán</h3>
                        <div className="payment-partners-grid">
                            {paymentPartners.map((partner, index) => (
                                <div key={index} className="payment-partner-card">
                                    <img src={partner.logo} alt={partner.name} className="payment-logo" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="footer-bottom">
                    <p>© 2025 Hệ thống khách sạn. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default Home;