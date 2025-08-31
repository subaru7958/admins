import Coach from '../Models/Coach.js';
import { generateToken } from '../utils/authUtils.js';

// Helper function for consistent API responses
const apiResponse = (res, statusCode, success, message, data = null, errors = null) => {
  const response = { success, message };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Coach login
export const loginCoach = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email?.trim() || !password?.trim()) {
      return apiResponse(res, 400, false, 'Email and password are required');
    }

    // Find coach by email
    const coach = await Coach.findOne({ email: email.toLowerCase().trim() })
      .populate('team', 'teamName logo discipline')
      .populate('session', 'name');

    if (!coach) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Check if password (name) matches
    if (coach.fullName.toLowerCase() !== password.toLowerCase()) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Generate JWT token
    const userPayload = {
      id: coach._id,
      email: coach.email,
      fullName: coach.fullName,
      role: 'coach',
      teamId: coach.team._id,
      sessionId: coach.session?._id
    };
    
    const token = generateToken(userPayload);

    return apiResponse(res, 200, true, 'Login successful!', {
      token,
      user: {
        _id: coach._id,
        fullName: coach.fullName,
        email: coach.email,
        specialization: coach.specialization,
        team: coach.team,
        session: coach.session,
        role: 'coach'
      }
    });

  } catch (error) {
    console.error('Coach login error:', error.message);
    return apiResponse(res, 500, false, 'Internal server error. Please try again later.');
  }
};

// Get coach profile
export const getCoachProfile = async (req, res) => {
  try {
    const coachId = req.user?._id;
    if (!coachId) {
      return apiResponse(res, 401, false, 'Authentication required');
    }

    const coach = await Coach.findById(coachId)
      .populate('team', 'teamName logo discipline')
      .populate('session', 'name');

    if (!coach) {
      return apiResponse(res, 404, false, 'Coach not found');
    }

    return apiResponse(res, 200, true, 'Profile retrieved successfully', {
      coach: {
        _id: coach._id,
        fullName: coach.fullName,
        email: coach.email,
        specialization: coach.specialization,
        team: coach.team,
        session: coach.session,
        role: 'coach'
      }
    });
  } catch (error) {
    console.error('Get coach profile error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching profile');
  }
};
