import express from 'express';
import {
  getSubgroupsBySession,
  createSubgroup,
  updateSubgroup,
  deleteSubgroup,
  assignPlayerToSubgroup,
  removePlayerFromSubgroup,
  assignCoachToSubgroup,
  removeCoachFromSubgroup,
  getAvailablePlayersForSubgroup,
  getAvailableCoachesForSubgroup
} from '../Controller/subgroupController.js';

const router = express.Router();

// Get all subgroups for a session
router.get('/session/:sessionId', getSubgroupsBySession);

// Create a new subgroup for a session
router.post('/session/:sessionId', createSubgroup);

// Update a subgroup
router.put('/:subgroupId', updateSubgroup);

// Delete a subgroup
router.delete('/:subgroupId', deleteSubgroup);

// Assign player to subgroup
router.post('/:subgroupId/players/:playerId', assignPlayerToSubgroup);

// Remove player from subgroup
router.delete('/:subgroupId/players/:playerId', removePlayerFromSubgroup);

// Assign coach to subgroup
router.post('/:subgroupId/coaches/:coachId', assignCoachToSubgroup);

// Remove coach from subgroup
router.delete('/:subgroupId/coaches/:coachId', removeCoachFromSubgroup);

// Get available players for a subgroup (not assigned to any subgroup in the session)
router.get('/session/:sessionId/category/:category/available-players', getAvailablePlayersForSubgroup);

// Get available coaches for a subgroup
router.get('/:subgroupId/available-coaches', getAvailableCoachesForSubgroup);

export default router;
