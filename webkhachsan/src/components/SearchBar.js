import React, { useState } from "react";
import "./SearchBar.css";
import { useNavigate } from "react-router-dom";

function SearchBar({ onSearch }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      setError("Vui lòng nhập ngày check-in và check-out.");
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate) || isNaN(checkOutDate)) {
      setError("Định dạng ngày không hợp lệ.");
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError("Ngày check-out phải sau ngày check-in.");
      return;
    }

    setError("");
    navigate("/hotels", { state: { checkIn, checkOut } });
  };

  return (
    <div className="search-bar">
      <input
        type="date"
        value={checkIn}
        onChange={(e) => setCheckIn(e.target.value)}
        placeholder="Check-in"
      />
      <input
        type="date"
        value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)}
        placeholder="Check-out"
      />
      {error && <div className="error">{error}</div>}
      <button className="search-btn" onClick={handleSearch}>
        <img
          src="https://cdn-icons-png.flaticon.com/512/482/482631.png"
          alt="Search Icon"
          className="search-icon"
        />
        Tìm
      </button>
    </div>
  );
}

export default SearchBar;