import React from "react";
import "./Support.css";

function Hotro() {
  return (
    <div className="support-container">
      <h1 className="support-title">Trang Hỗ Trợ</h1>
      <div className="support-content">
        <section className="faq-section">
          <h2>Câu hỏi thường gặp (FAQ)</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>
                <strong>Làm thế nào để đặt phòng?</strong>
              </summary>
              <p>
                Bạn chỉ cần vào trang Đặt phòng, chọn ngày và phòng phù hợp, rồi làm theo hướng dẫn.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                <strong>Tôi có thể thanh toán bằng cách nào?</strong>
              </summary>
              <p>
                Bạn có thể thanh toán qua các phương thức như Momo, VNPAY, hoặc thẻ tín dụng.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                <strong>Tôi có thể thay đổi thông tin ngày đặt phòng không?</strong>
              </summary>
              <p>
                Có, bạn có thể thay đổi thông tin qua phần Phòng Đã Đặt trong tài khoản của mình.
              </p>
            </details>
          </div>
        </section>
        <section className="contact-section">
          <h2>Liên hệ với chúng tôi</h2>
          <p>Để được hỗ trợ nhanh chóng, vui lòng liên hệ qua các kênh dưới đây:</p>
          <ul className="contact-list">
            <li>
              <span className="contact-icon">📧</span>
              <strong>Email:</strong> <a href="mailto:travelgo@gmail.com">travelgo@gmail.com</a>
            </li>
            <li>
              <span className="contact-icon">📞</span>
              <strong>SĐT:</strong> <a href="tel:+84123456789">+84 954 432 579</a>
            </li>
          </ul>
   
        </section>
      </div>
    </div>
  );
}

export default Hotro;