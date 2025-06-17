const express = require('express');
const cors = require('cors');
const app = express();

// Cấu hình CORS để cho phép cả localhost:3000 và localhost:3001
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Cấu hình multer để upload file
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

// Phục vụ file tĩnh từ thư mục public
app.use(express.static('public'));

// Đảm bảo thư mục public/images/room tồn tại
const fs = require('fs');
const dir = './public/images/room';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Import các route
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/hotels', require('./routes/hotels'));
  app.use('/api/rooms', require('./routes/rooms'));
  app.use('/api/promotions', require('./routes/promotions'));
  app.use('/api/reviews', require('./routes/reviews')); // Sửa tên file thành reviews.js
  app.use('/api/bookings', require('./routes/bookings'));
  app.use('/api/invoices', require('./routes/invoices')); // Thêm route cho invoices
  app.use('/api/deposits', require('./routes/depositRoutes'));
  app.use('/api/notifications', require('./routes/notifications'));
} catch (error) {
  console.error('Error loading routes:', error);
  process.exit(1);
}

// Route kiểm tra server
app.get('/', (req, res) => {
  res.send('Server is running!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports.upload = upload;