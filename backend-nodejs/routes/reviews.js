const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute(
      `
        SELECT r.review_id, r.content, r.rating, r.review_date, r.image_url, r.status,
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
    const { hotel_id, signup_id, content, rating, review_date, image_url } = req.body;

    if (!hotel_id || !signup_id || !content || !rating || !review_date) {
      return res.status(400).json({ error: "Missing required fields", received: req.body });
    }

    let processedImageUrl = image_url || "/default-image.jpg";
    if (image_url && image_url.startsWith("/")) {
      processedImageUrl = `http://localhost:3000${image_url}`;
    }

    console.log("Processed image_url:", processedImageUrl);

    connection = await getConnection();
    const [result] = await connection.execute(
      `
        INSERT INTO review (hotel_id, signup_id, content, rating, review_date, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [hotel_id, signup_id, content, rating, review_date, processedImageUrl]
    );

    res.status(201).json({ review_id: result.insertId, message: "Review created successfully, pending approval" });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

router.put("/approve/:review_id", async (req, res) => {
  let connection;
  try {
    console.log("Received PUT request for review_id:", req.params.review_id);
    const { review_id } = req.params;
    connection = await getConnection();
    const [result] = await connection.execute(
      `
        UPDATE review
        SET status = 1
        WHERE review_id = ?
      `,
      [review_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json({ message: "Review approved successfully" });
  } catch (error) {
    console.error("Error approving review:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

router.delete("/delete/:review_id", async (req, res) => {
  let connection;
  try {
    console.log("Received DELETE request for review_id:", req.params.review_id);
    const { review_id } = req.params;
    connection = await getConnection();
    const [result] = await connection.execute(
      `
        DELETE FROM review
        WHERE review_id = ?
      `,
      [review_id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) await connection.release();
  }
});

module.exports = router;