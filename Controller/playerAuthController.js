import Player from '../Models/Player.js';
import { generateToken } from '../utils/authUtils.js';

// Helper function for consistent API responses
const apiResponse = (res, statusCode, success, message, data = null, errors = null) => {
  const response = { success, message };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Player login
export const loginPlayer = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email?.trim() || !password?.trim()) {
      return apiResponse(res, 400, false, 'Email and password are required');
    }

    // Find player by email
    const player = await Player.findOne({ email: email.toLowerCase().trim() })
      .populate('team', 'teamName logo discipline')
      .populate('session', 'name startDate endDate')
      .populate('subgroup', 'name');

    if (!player) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Check if password (name) matches
    if (player.fullName.toLowerCase() !== password.toLowerCase()) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Generate JWT token
    const userPayload = {
      id: player._id,
      email: player.email,
      fullName: player.fullName,
      role: 'player',
      teamId: player.team._id,
      sessionId: player.session?._id
    };
    
    const token = generateToken(userPayload);

    return apiResponse(res, 200, true, 'Login successful!', {
      token,
      user: {
        _id: player._id,
        fullName: player.fullName,
        email: player.email,
        group: player.group,
        team: player.team,
        session: player.session,
        subgroup: player.subgroup,
        role: 'player'
      }
    });

  } catch (error) {
    console.error('Player login error:', error.message);
    return apiResponse(res, 500, false, 'Internal server error. Please try again later.');
  }
};

// Get player profile
export const getPlayerProfile = async (req, res) => {
  try {
    const playerId = req.user?._id;
    if (!playerId) {
      return apiResponse(res, 401, false, 'Authentication required');
    }

    const player = await Player.findById(playerId)
      .populate('team', 'teamName logo discipline')
      .populate('session', 'name startDate endDate')
      .populate('subgroup', 'name');

    if (!player) {
      return apiResponse(res, 404, false, 'Player not found');
    }

    return apiResponse(res, 200, true, 'Profile retrieved successfully', {
      player: {
        _id: player._id,
        fullName: player.fullName,
        email: player.email,
        group: player.group,
        team: player.team,
        session: player.session,
        subgroup: player.subgroup,
        role: 'player'
      }
    });
  } catch (error) {
    console.error('Get player profile error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching profile');
  }
};
