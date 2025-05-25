const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute(
      `
        SELECT r.review_id, r.content, r.rating, r.review_date, r.image_url,
               h.name AS hotel_name, u.name AS user_name
        FROM review r
        LEFT JOIN hotels h ON r.hotel_id = h.hotel_id
        LEFT JOIN signup u ON r.signup_id = u.signup_id
      `
    );
    console.log("Fetched reviews:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

router.post("/", async (req, res) => {
  let connection;
  try {
    const { hotel_id, signup_id, content, rating, review_date, image_url, room_id } = req.body;

    if (!hotel_id || !signup_id || !content || !rating || !review_date || !image_url) {
      return res.status(400).json({ error: "Missing required fields", received: req.body });
    }

    console.log("Received image URL:", image_url);

    connection = await getConnection();
    const [result] = await connection.execute(
      `
        INSERT INTO review (hotel_id, signup_id, content, rating, review_date, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [hotel_id, signup_id, content, rating, review_date, image_url]
    );

    res.status(201).json({ review_id: result.insertId, message: "Review created successfully", image_url: image_url });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;