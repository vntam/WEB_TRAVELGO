import React, { useEffect, useState } from "react";
import "./styles.css";
import Header from "./Header.js";
import { useLocation, useNavigate } from "react-router-dom";

function HotelList() {
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHotelName, setSelectedHotelName] = useState(null);
  const [error, setError] = useState(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDateForm, setShowDateForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, content: "" });
  const location = useLocation();
  const navigate = useNavigate();
  const [isDateConfirmed, setIsDateConfirmed] = useState(false);
  const [reviewedRooms, setReviewedRooms] = useState(new Set());

  useEffect(() => {
    const { checkIn: searchCheckIn, checkOut: searchCheckOut } = location.state || {};

    if (searchCheckIn && searchCheckOut) {
      setCheckIn(searchCheckIn);
      setCheckOut(searchCheckOut);
      setIsDateConfirmed(true);
    } else {
      setShowDateForm(true);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/hotels");
        if (!response.ok) throw new Error("Failed to fetch hotels");
        const data = await response.json();
        setHotels(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching hotels:", err);
        setError("Không thể tải danh sách khách sạn");
      }
    };

    fetchHotels();
  }, []);

  const fetchRooms = async (hotelName) => {
    if (!checkIn || !checkOut) {
      setError("Vui lòng nhập ngày check-in và check-out để xem phòng.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const url = `http://localhost:3000/api/rooms?hotel_name=${encodeURIComponent(hotelName)}&check_in=${checkIn}&check_out=${checkOut}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Không thể tải danh sách phòng: " + err.message);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHotelClick = (hotelName) => {
    if (selectedHotelName === hotelName) {
      setSelectedHotelName(null);
      setRooms([]);
    } else {
      setSelectedHotelName(hotelName);
      fetchRooms(hotelName);
    }
  };

  const handleBookRoom = async (roomId, price) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      setError("Vui lòng đăng nhập để đặt phòng.");
      navigate("/login");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn hủy đặt phòng này không?")) {
      try {
        const response = await fetch("http://localhost:3000/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.id}`,
          },
          body: JSON.stringify({
            room_id: roomId,
            check_in: checkIn,
            check_out: checkOut,
            total_price: price,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        alert(`Đặt phòng thành công!`);
        fetchRooms(selectedHotelName);

      } catch (err) {
        console.error("Error booking room:", err);
        setError("Không thể đặt phòng: " + err.message);
      }
  }
  };

  const handleReviewSubmit = async (roomId, hotelId) => {
    console.log("Button clicked! Starting handleReviewSubmit...");
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("User data:", user);
    console.log("Hotel ID:", hotelId);
    console.log("Review data:", reviewData);

    if (!user || !user.id) {
      setError("Vui lòng đăng nhập để đánh giá");
      navigate("/login");
      return;
    }

    if (!reviewData.rating || !reviewData.content.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin đánh giá");
      return;
    }

    if (!hotelId) {
      setError("Không tìm thấy thông tin khách sạn");
      return;
    }

    const imageUrl = `http://localhost:3000/images/room/room_${roomId}.jpg`; 
    console.log("Image URL being sent:", imageUrl);

    try {
      const response = await fetch("http://localhost:3000/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          hotel_id: hotelId,
          signup_id: user.id,
          content: reviewData.content.trim(),
          rating: parseInt(reviewData.rating),
          review_date: new Date().toISOString().split("T")[0],
          image_url: imageUrl,
          room_id: roomId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Server error:", errorText);
        throw new Error(errorText || "Lỗi từ server");
      }

      const result = await response.json();
      alert(`Đánh giá thành công! Mã đánh giá: ${result.review_id}`);
      setShowReviewForm(null);
      setReviewData({ rating: 0, content: "" });
      setError(null);
      setReviewedRooms((prev) => new Set(prev).add(roomId));
    } catch (err) {
      console.error("Error submitting review:", err);
      setError(`Lỗi khi gửi đánh giá: ${err.message}`);
    }
  };

  const isRoomFullyBooked = (availability) => {
    return availability.every((day) => day.is_booked);
  };

  const handleDateSubmit = (e) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      setError("Vui lòng nhập đầy đủ ngày check-in và check-out");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setError("Ngày check-out phải sau ngày check-in");
      return;
    }
    setError(null);
    setShowDateForm(false);
    setIsDateConfirmed(true);
  };

  const renderReviewForm = (room, selectedHotel) => (
    <div className="review-form">
      <h4>Đánh giá phòng {room.room_number}</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleReviewSubmit(room.room_id, selectedHotel?.id);
        }}
      >
        <div className="form-group">
          <label>Đánh giá phòng trong thang điểm này! (1-5):</label>
          <input
            type="number"
            min="1"
            max="5"
            value={reviewData.rating}
            onChange={(e) => setReviewData({ ...reviewData, rating: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="form-group">
          <label>Nội dung đánh giá:</label>
          <textarea
            value={reviewData.content}
            onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
            placeholder="Nhập nội dung đánh giá..."
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="button-group">
          <button type="submit" className="submit-review-btn">
            Xác nhận
          </button>
          <button
            type="button"
            className="cancel-review-btn"
            onClick={() => {
              setShowReviewForm(null);
              setReviewData({ rating: 0, content: "" });
              setError(null);
            }}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div>
      <Header />
      <h2 className="hotel-title">Danh Sách Khách Sạn</h2>

      {showDateForm && (
        <div className="date-form-container">
          <h4>Vui lòng nhập ngày check-in và check-out</h4>
          <form onSubmit={handleDateSubmit} className="date-form">
            <div className="form-group">
              <label>Ngày check-in:</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="form-group">
              <label>Ngày check-out:</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="submit-date-btn">Xác nhận</button>
          </form>
        </div>
      )}

      {isDateConfirmed && (
        <div className="date-info">
          <p>Đang hiển thị phòng trống từ {checkIn} đến {checkOut}</p>
          <button
            onClick={() => {
              setShowDateForm(true);
              setIsDateConfirmed(false);
            }}
            className="change-date-btn"
          >
            Thay đổi ngày
          </button>
        </div>
      )}

      <div className="hotel-list">
        {hotels.map((hotel) => (
          <div
            key={hotel.id}
            className={`hotel-card ${selectedHotelName === hotel.name ? "selected" : ""}`}
            onClick={() => handleHotelClick(hotel.name)}
          >
            <img className="hotel-image" src={hotel.image} alt={hotel.name} />
            <h3>{hotel.name}</h3>
            <p>{hotel.address}</p>
            <p>Đánh giá: {hotel.rating} sao</p>
          </div>
        ))}
      </div>

      {loading && <div className="loading">Đang tải phòng...</div>}

      {selectedHotelName && (
        <div className="rooms-list">
          <h3>Phòng tại {selectedHotelName}</h3>
          {rooms.length > 0 ? (
            rooms.map((room) => {
              const fullyBooked = isRoomFullyBooked(room.availability);
              const selectedHotel = hotels.find((h) => h.name === selectedHotelName);
              const isReviewed = reviewedRooms.has(room.room_id);
              return (
                <div key={room.room_id} className={`room-card ${fullyBooked ? "booked" : ""}`}>
                  <img
                    src={`http://localhost:3000/images/room/room_${room.room_id}.jpg`}
                    alt={room.room_number}
                    className="room-image"
                    onError={(e) => {
                      e.target.src = "/logo192.png";
                      console.log("Error loading room image:", room.room_id);
                    }}
                  />
                  <div className="room-info">
                    <p className="room-number">Phòng số: {room.room_number}</p>
                    <p className="room-type">Loại phòng: {room.room_type}</p>
                    <p className="room-price">Giá: {room.price.toLocaleString()} VNĐ</p>

                    <div className="availability">
                      <h4>Trạng thái từng ngày:</h4>
                      {room.availability.map((day, index) => (
                        <p key={`${room.room_id}-${day.date}-${index}`}>
                          {day.date}: {day.is_booked ? "Đã đặt" : "Trống"}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="button-group">
                    
                    <button
                      className={`book-button ${fullyBooked ? "disabled" : ""}`}
                      onClick={() => handleBookRoom(room.room_id, room.price)}
                      disabled={fullyBooked || loading}
                    >
                      {fullyBooked ? "Đã đặt" : "Đặt phòng"}
                    </button>
                    {!isReviewed && (
                      <button
                        className="review-button"
                        onClick={() => setShowReviewForm(room.room_id)}
                      >
                        Đánh giá
                      </button>
                    )}
                  </div>

                  {showReviewForm === room.room_id && !isReviewed && renderReviewForm(room, selectedHotel)}
                </div>
              );
            })
          ) : (
            !loading && <p className="no-rooms">Không có phòng trống tại khách sạn này</p>
          )}
        </div>
      )}
    </div>
  );
}

export default HotelList;