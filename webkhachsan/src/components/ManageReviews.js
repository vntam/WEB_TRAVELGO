import React, { useEffect, useState } from "react";
import "./manageReviews.css";
import Header from "./Header";

function ManageReviews() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/reviews")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setReviews(data);
          console.log("Fetched reviews:", data);
        } else {
          setMessage(data.error || "Lỗi tải danh sách đánh giá");
        }
      })
      .catch((error) => {
        console.error("Error fetching reviews:", error);
        setMessage("Lỗi tải danh sách đánh giá: " + error.message);
      });
  }, []);

  const handleApprove = (reviewId) => {
    fetch(`http://localhost:3000/api/reviews/approve/${reviewId}`, { method: "PUT" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setReviews(reviews.map(review => review.review_id === reviewId ? { ...review, status: 1 } : review));
        setMessage(data.message || "Đã duyệt đánh giá!");
      })
      .catch((error) => {
        console.error("Error approving review:", error);
        setMessage("Lỗi khi duyệt đánh giá: " + error.message);
      });
  };

  const handleDelete = (reviewId) => {
    if (window.confirm("Bạn có chắc muốn xóa đánh giá này?")) {
      fetch(`http://localhost:3000/api/reviews/delete/${reviewId}`, { method: "DELETE" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setReviews(reviews.filter(review => review.review_id !== reviewId));
          setMessage(data.message || "Đã xóa đánh giá!");
        })
        .catch((error) => {
          console.error("Error deleting review:", error);
          setMessage("Lỗi khi xóa đánh giá: " + error.message);
        });
    }
  };

  return (
    <div className="manage-reviews">
      <div className="content-wrapper">
        <h2>Quản lý Bài Đánh Giá</h2>
        {message && <div className="message">{message}</div>}
        <div className="review-list">
          {reviews.length === 0 ? (
            <p>Không có đánh giá nào để quản lý.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.review_id} className="review-item">
                <div className="review-content">
                  <h3>Khách sạn: {review.hotel_name}</h3>
                  {review.image_url && (
                    <img
                      src={review.image_url || "http://localhost:3000/images/room/default-image.jpg"}
                      alt={`Ảnh phòng tại ${review.hotel_name}`}
                      className="review-image"
                      onError={(e) => {
                        e.target.src = "/logo192.png";
                        console.log("Error loading image for review:", review.review_id, "URL:", review.image_url);
                      }}
                    />
                  )}
                  <div className="review-details">
                    <p><strong>Người đánh giá:</strong> {review.user_name || "Ẩn danh"}</p>
                    <p><strong>Nội dung:</strong> {review.content || "Không có nội dung"}</p>
                    <p><strong>Trạng thái:</strong> 
                      {review.status === 0 ? <span className="status-pending">Chưa duyệt</span> : "Đã duyệt"}
                    </p>
                    <p>Ngày đánh giá: {new Date(review.review_date).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <div className="review-actions">
                    <button
                      className="approve-button"
                      onClick={() => handleApprove(review.review_id)}
                      disabled={review.status === 1}
                    >
                      Duyệt
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(review.review_id)}
                      disabled={review.status === 1}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageReviews;