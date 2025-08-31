import express from 'express';
import { createSession, getSessions, getSessionById, updateSession, deleteSession, addPlayerToSession, removePlayerFromSession, addCoachToSession, removeCoachFromSession } from '../Controller/sessionController.js';

const router = express.Router();

// Create a new session
router.post('/', createSession);

// Get all sessions for a team
router.get('/', getSessions);

// Get a specific session
router.get('/:id', getSessionById);

// Update a session
router.put('/:id', updateSession);

// Delete a session
router.delete('/:id', deleteSession);

// Add a player to a session
router.post('/:sessionId/players/:playerId', addPlayerToSession);

// Remove a player from a session
router.delete('/:sessionId/players/:playerId', removePlayerFromSession);

// Add a coach to a session
router.post('/:sessionId/coaches/:coachId', addCoachToSession);

// Remove a coach from a session
router.delete('/:sessionId/coaches/:coachId', removeCoachFromSession);

export default router;