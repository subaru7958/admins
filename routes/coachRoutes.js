import express from 'express';
import {
  getCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  deleteCoach
} from '../Controller/coachController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/coaches - Get all coaches for the team
router.get('/', getCoaches);

// GET /api/coaches/:id - Get a specific coach
router.get('/:id', getCoachById);

// POST /api/coaches - Create a new coach
router.post('/', createCoach);

// PUT /api/coaches/:id - Update a coach
router.put('/:id', updateCoach);

// DELETE /api/coaches/:id - Delete a coach
router.delete('/:id', deleteCoach);

export default router;