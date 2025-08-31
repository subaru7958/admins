import express from 'express';
import { loginPlayer, getPlayerProfile } from '../Controller/playerAuthController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Player login
router.post('/login', loginPlayer);

// Get player profile (protected route)
router.get('/profile', authenticateToken, getPlayerProfile);

export default router;
