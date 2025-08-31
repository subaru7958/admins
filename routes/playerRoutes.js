import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
  markPlayerMonthPaid
} from '../Controller/playerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure uploads directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `player-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Public registration endpoint (no auth)
router.post('/public-register', upload.single('photo'), createPlayer);

// Apply authentication for the rest
router.use(protect);

// GET /api/players - Get all players for the authenticated team
router.get('/', getPlayers);

// GET /api/players/:id - Get a specific player
router.get('/:id', getPlayerById);

// POST /api/players - Create a new player (authenticated)
router.post('/', upload.single('photo'), createPlayer);

// Mark current month as paid
router.put('/:id/mark-paid', markPlayerMonthPaid);

// PUT /api/players/:id - Update a player
router.put('/:id', upload.single('photo'), updatePlayer);

// DELETE /api/players/:id - Delete a player
router.delete('/:id', deletePlayer);

export default router;
