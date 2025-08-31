import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerTeam, loginTeam, getAllTeams, getTeamById, getMe, updateMe } from '../Controller/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
import fs from 'fs';
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and random suffix
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `teamLogo-${uniqueSuffix}${extension}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file
  },
  fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.'
        });
    }
  }
  
  if (error.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: 'Only image files (JPG, PNG, GIF, WebP) are allowed.'
    });
  }
  
  next(error);
};

// Input validation middleware
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email?.trim() || !password?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  next();
};

// Routes
router.post('/register', upload.single('teamLogo'), handleMulterError, registerTeam);
// Team login
router.post('/login', validateLoginInput, loginTeam);

// Current authenticated team profile
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('teamLogo'), handleMulterError, updateMe);
router.get('/teams', getAllTeams);
router.get('/teams/:id', getTeamById);

export default router; 