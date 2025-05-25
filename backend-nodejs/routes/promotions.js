const express = require("express");
const router = express.Router();
const { getConnection } = require("../config/db");

router.post("/", async (req, res) => {
    const { room_id, start_date, end_date, status, promotion_name, description, discount_value } = req.body;
    let connection;
    try {
        connection = await getConnection();
        const [result] = await connection.execute(
            "INSERT INTO promotion (room_id, start_date, end_date, status, promotion_name, description, discount_value) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [room_id, start_date, end_date, status || 0, promotion_name, description, discount_value]
        );
        console.log("Promotion added:", result.insertId);
        res.json({ message: "Promotion added", promotion_id: result.insertId });
    } catch (error) {
        console.error("Error adding promotion:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

router.get("/", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            "SELECT promotion_id, room_id, start_date, end_date, status, promotion_name, description, discount_value FROM promotion"
        );
        console.log("Fetched promotions:", rows);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching promotions:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

module.exports = router;