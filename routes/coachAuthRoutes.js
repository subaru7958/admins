import express from 'express';
import { loginCoach, getCoachProfile } from '../Controller/coachAuthController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Coach login
router.post('/login', loginCoach);

// Get coach profile (protected route)
router.get('/profile', authenticateToken, getCoachProfile);

export default router;
