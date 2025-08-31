import express from 'express';
import {
  createTrainingSession,
  getTrainingSessions,
  getTrainingSessionById,
  updateTrainingSession,
  deleteTrainingSession,
  addPlayerToTrainingSession,
  removePlayerFromTrainingSession,
  updateAttendance,
  getAttendance
} from '../Controller/trainingSessionController.js';

const router = express.Router();

// Create a new training session
router.post('/', createTrainingSession);

// Get all training sessions for a session
router.get('/session/:sessionId', getTrainingSessions);

// Get a specific training session
router.get('/:id', getTrainingSessionById);

// Update a training session
router.put('/:id', updateTrainingSession);

// Delete a training session
router.delete('/:id', deleteTrainingSession);

// Add a player to a training session
router.post('/:sessionId/players/:playerId', addPlayerToTrainingSession);

// Remove a player from a training session
router.delete('/:sessionId/players/:playerId', removePlayerFromTrainingSession);

// Update attendance for a training session
router.put('/:sessionId/attendance', updateAttendance);

// Get attendance for a training session
router.get('/:sessionId/attendance', getAttendance);

export default router;