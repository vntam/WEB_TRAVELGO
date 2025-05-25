const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT hotel_id AS id, name, address, description, phone, email, rating, image FROM hotels'
        );
        console.log('Fetched hotels:', rows);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

module.exports = router;