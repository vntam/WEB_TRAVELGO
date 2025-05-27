const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());


const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/images/room/';
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); 
  }
});
const upload = multer({ storage: storage });


app.use(express.static('public'));

try {
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/hotels', require('./routes/hotels'));
    app.use('/api/rooms', require('./routes/rooms'));
    app.use('/api/promotions', require('./routes/promotions'));
    app.use('/api/reviews', require('./routes/router')); // Sử dụng router.js
    app.use('/api/bookings', require('./routes/bookings'));
} catch (error) {
    console.error('Error loading routes:', error);
    process.exit(1);
}


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


module.exports.upload = upload;