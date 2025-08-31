import express from 'express';
import { 
  getEvents, 
  getEventById, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} from '../Controller/eventController.js';

const router = express.Router();

// GET /api/events - Get all events for the team
router.get('/', getEvents);

// GET /api/events/:id - Get a specific event
router.get('/:id', getEventById);

// POST /api/events - Create a new event
router.post('/', createEvent);

// PUT /api/events/:id - Update an event
router.put('/:id', updateEvent);

// DELETE /api/events/:id - Delete an event
router.delete('/:id', deleteEvent);

export default router;