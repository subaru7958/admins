import express from 'express';
import { 
  getAttendanceForSession, 
  markAttendance, 
  markBulkAttendance, 
  getAttendanceStats 
} from '../Controller/attendanceController.js';

const router = express.Router();

// Get attendance for a training session
router.get('/session/:trainingSessionId', getAttendanceForSession);

// Mark attendance for a single player
router.post('/session/:trainingSessionId/player/:playerId', markAttendance);

// Mark attendance for multiple players
router.post('/session/:trainingSessionId/bulk', markBulkAttendance);

// Get attendance statistics for a training session
router.get('/session/:trainingSessionId/stats', getAttendanceStats);

export default router;
