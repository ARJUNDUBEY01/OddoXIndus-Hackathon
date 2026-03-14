require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const otpRoutes = require('./auth/otpRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', otpRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Inventra OTP Server is running', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 OTP Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
