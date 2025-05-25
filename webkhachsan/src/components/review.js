import React, { useEffect, useState } from "react";
import Header from "./Header.js";
import "./review.css";

function Review() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");
  const [expandedReview, setExpandedReview] = useState(null);
  const [likes, setLikes] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/api/reviews")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReviews(data);
          const initialLikes = data.reduce((acc, review) => ({ ...acc, [review.review_id]: 0 }), {});
          setLikes(initialLikes);
        } else {
          setMessage(data.error || "Lỗi tải danh sách đánh giá");
        }
      })
      .catch((error) => {
        console.error("Error fetching reviews:", error);
        setMessage("Lỗi tải danh sách đánh giá");
      });
  }, []);

  const handleViewDetails = (reviewId) => {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  };

  const handleLike = (reviewId) => {
    setLikes((prev) => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }));
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? "#ffd700" : "#ccc" }}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div>
      <Header />
      <h2>Các Bài Đánh Giá Khách Sạn</h2>

      {message && <div className="message">{message}</div>}

      <div className="review-list">
        {reviews.length === 0 ? (
          <p>Không có đánh giá nào.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.review_id} className="review-item">
              <h3>Khách sạn: {review.hotel_name}</h3>
              {review.image_url ? (
                <div className="image-container">
                  <img
                    src={review.image_url || "http://localhost:3000/images/room/default-image.jpg"}
                    alt={`Ảnh phòng tại ${review.hotel_name}`}
                    className="review-image"
                    onError={(e) => {
                      e.target.src = "/logo192.png";
                      console.log("Error loading image for review:", review.review_id, "URL:", review.image_url);
                    }}
                  />
                  {expandedReview === review.review_id && (
                    <div className="details-overlay">
                      <h4>Chi Tiết Đánh Giá</h4>
                      <p><strong>Tiện nghi:</strong> Wi-Fi, Điều hòa, Hồ bơi</p>
                      <p><strong>Đánh giá chi tiết:</strong> {review.content || "Phòng sạch sẽ, view đẹp!"}</p>
                      <p><strong>Lượt thích:</strong> {likes[review.review_id] || 0}</p>
                      <button className="like-button" onClick={() => handleLike(review.review_id)}>
                        Thích
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p>Không có ảnh</p>
              )}
              <p>Người đánh giá: {review.user_name || "Ẩn danh"}</p>
              <p>Đánh giá: {renderStars(review.rating || 0)} ({review.rating || 0}/5)</p>
              <p>Nội dung: {review.content || "Không có nội dung"}</p>
              <p>Ngày đánh giá: {new Date(review.review_date).toLocaleDateString("vi-VN")}</p>
              <button
                className="detail-button"
                onClick={() => handleViewDetails(review.review_id)}
              >
                {expandedReview === review.review_id ? "Ẩn Chi Tiết" : "Xem Chi Tiết"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Review;