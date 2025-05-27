const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

router.get('/', async (req, res) => {
    let connection;
    try {
        const { hotel_name, check_in, check_out } = req.query;

        if (!hotel_name) {
            return res.status(400).json({ error: 'Vui lòng cung cấp hotel_name' });
        }

        if (!check_in || !check_out) {
            return res.status(400).json({ error: 'Vui lòng cung cấp ngày check-in và check-out' });
        }

        connection = await getConnection();

    
        const roomQuery = `
            SELECT r.room_id, r.room_number, r.room_type, r.price, h.name AS hotel_name
            FROM rooms r 
            JOIN hotels h ON r.hotel_id = h.hotel_id
            WHERE h.name = ?
        `;
        const [rooms] = await connection.execute(roomQuery, [hotel_name]);


        const startDate = new Date(check_in);
        const endDate = new Date(check_out);
        const days = [];
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d).toISOString().split('T')[0]);
        }


        const roomsWithAvailability = await Promise.all(
            rooms.map(async (room) => {
                const availability = await Promise.all(
                    days.map(async (day) => {
                        const nextDay = new Date(day);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const query = `
                            SELECT EXISTS (
                                SELECT 1 
                                FROM booking 
                                WHERE room_id = ? 
                                AND check_in <= ? AND check_out > ?
                            ) AS is_booked
                        `;
                        const [result] = await connection.execute(query, [
                            room.room_id,
                            nextDay.toISOString().split('T')[0],
                            day,
                        ]);
                        return { date: day, is_booked: !!result[0].is_booked };
                    })
                );
                return { ...room, availability };
            })
        );

        res.json(roomsWithAvailability);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        if (connection) await connection.release();
    }
});

module.exports = router;