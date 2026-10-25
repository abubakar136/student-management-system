import studentRoutes from "./routes/studentRoutes.js";
import dotenv from "dotenv";
import connectDB from "./db.js";
import express from 'express'
dotenv.config();

import cors from 'cors'


dotenv.config()
import authRoutes from "./routes/authRoutes.js";
const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Student Management System API is running!'
  })
})

// Health-check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is working correctly'
  })
})

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});