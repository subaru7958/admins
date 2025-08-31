import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv'; // ✅ Import dotenv
import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import playerAuthRoutes from './routes/playerAuthRoutes.js';
import coachAuthRoutes from './routes/coachAuthRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import trainingSessionRoutes from './routes/trainingSessionRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import subgroupRoutes from './routes/subgroupRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
// ✅ Only load dotenv locally (not in production on Render)
if (process.env.NODE_ENV !== 'production') {
  const backendEnvPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
  const rootEnvPath = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), '.env');

  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  } else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  } else {
    dotenv.config();
  }
}


// ✅ Connect to MongoDB after environment variables are ready
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/player-auth', playerAuthRoutes);
app.use('/api/coach-auth', coachAuthRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/training-sessions', trainingSessionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/subgroups', subgroupRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});