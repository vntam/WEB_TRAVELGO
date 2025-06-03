import React, { useEffect, useState } from "react";
import Header from "./Header.js";
import "./KhuyenMai.css"; 

import khuyenmai_1 from '../images/promotion/khuyenmai_1.jpg';
import khuyenmai_2 from '../images/promotion/khuyenmai_2.jpg';
import khuyenmai_3 from '../images/promotion/khuyenmai_3.jpg';

const khuyenmai_img = {
  1: khuyenmai_1,
  2: khuyenmai_2,
  3: khuyenmai_3
}


function KhuyenMai() {
  const [promotions, setPromotions] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/promotions")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPromotions(data);
        } else {
          setMessage(data.error || "Lỗi tải thông báo khuyến mãi");
        }
      })
      .catch((error) => {
        console.error("Error fetching promotions:", error);
        setMessage("Lỗi tải thông báo khuyến mãi");
      });
  }, []);

  return (
    <div>
      <Header />
      <h2>Thông Báo Khuyến Mãi</h2>

      {message && <div className="message">{message}</div>}

      <div className="promotion-list">
        {promotions.length === 0 ? (
          <p>Không có thông báo khuyến mãi nào.</p>
        ) : (
          promotions.map((promo) => (
            <div key={promo.promotion_id} className="promotion-item">
              <h3>{promo.promotion_name}</h3>
              <img
                src={khuyenmai_img[promo.promotion_id]}
                alt={promo.promotion_name}
                className="khuyenmai-img"
              />
              <p>Mô tả: {promo.description || "Không có mô tả"}</p>
              <p>Phòng áp dụng: {promo.room_id}</p>
              <p>Giảm giá: {promo.discount_value}%</p>
              <p>Thời gian: {promo.start_date} - {promo.end_date}</p>
              <p>Trạng thái: {promo.status ? "Đang hoạt động" : "Kết thúc"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default KhuyenMai;