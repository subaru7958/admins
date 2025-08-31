import Team from '../Models/Team.js';
import { generateToken, createUserPayload } from '../utils/authUtils.js';

// Helper function for consistent API responses
const apiResponse = (res, statusCode, success, message, data = null, errors = null) => {
  const response = { success, message };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

// Input validation helper
const validateRegistrationInput = (data) => {
  const errors = [];
  
  if (!data.teamName?.trim()) errors.push('Team name is required');
  if (!data.discipline?.trim()) errors.push('Discipline is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.password?.trim()) errors.push('Password is required');
  if (!data.phone?.trim()) errors.push('Phone number is required');
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Password length validation
  if (data.password && data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  return errors;
};

// Register a new team
export const registerTeam = async (req, res) => {
  try {
    const { teamName, discipline, email, password, phone } = req.body;
    
    // Validate input
    const validationErrors = validateRegistrationInput(req.body);
    if (validationErrors.length > 0) {
      return apiResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }
    
    // Check if team logo was uploaded
    const logo = req.file ? `/uploads/${req.file.filename}` : null;

    // Check if email already exists
    const existingTeam = await Team.findOne({ email: email.toLowerCase() });
    if (existingTeam) {
      return apiResponse(res, 400, false, 'Email already registered. Please use a different email or try logging in.');
    }

    // Create new team
    const newTeam = new Team({
      teamName: teamName.trim(),
      discipline: discipline.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      logo
    });

    // Save team to database
    const savedTeam = await newTeam.save();

    // Generate JWT token for the new user
    const userPayload = createUserPayload(savedTeam);
    const token = generateToken(userPayload);

    // Return success response
    return apiResponse(res, 201, true, 'Team registered successfully!', {
      ...savedTeam.toPublicJSON(),
      token
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return apiResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }

    // Handle duplicate key error (email)
    if (error.code === 11000) {
      return apiResponse(res, 400, false, 'Email already registered. Please use a different email.');
    }

    return apiResponse(res, 500, false, 'Internal server error. Please try again later.');
  }
};

// Login team
export const loginTeam = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email?.trim() || !password?.trim()) {
      return apiResponse(res, 400, false, 'Email and password are required');
    }

    // Check if team exists
    const team = await Team.findOne({ email: email.toLowerCase().trim() });
    if (!team) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Check if password matches
    const isPasswordValid = await team.comparePassword(password);
    if (!isPasswordValid) {
      return apiResponse(res, 401, false, 'Invalid email or password');
    }

    // Generate JWT token
    const userPayload = createUserPayload(team);
    const token = generateToken(userPayload);

    return apiResponse(res, 200, true, 'Login successful!', {
      ...team.toPublicJSON(),
      token
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return apiResponse(res, 500, false, 'Internal server error. Please try again later.');
  }
};

// Get all teams (for admin purposes)
export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({}).select('-password').sort({ createdAt: -1 });
    
    return apiResponse(res, 200, true, 'Teams retrieved successfully', {
      count: teams.length,
      teams
    });
  } catch (error) {
    console.error('Get teams error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching teams');
  }
};

// Get team by ID
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return apiResponse(res, 400, false, 'Team ID is required');
    }

    const team = await Team.findById(id).select('-password');
    
    if (!team) {
      return apiResponse(res, 404, false, 'Team not found');
    }

    return apiResponse(res, 200, true, 'Team retrieved successfully', { team });
  } catch (error) {
    console.error('Get team error:', error.message);
    
    if (error.name === 'CastError') {
      return apiResponse(res, 400, false, 'Invalid team ID format');
    }
    
    return apiResponse(res, 500, false, 'Error fetching team');
  }
}; 

// Get current authenticated team (profile)
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.teamId;
    if (!userId) {
      return apiResponse(res, 401, false, 'Authentication required');
    }

    const team = await Team.findById(userId).select('-password');
    if (!team) {
      return apiResponse(res, 404, false, 'User not found');
    }

    return apiResponse(res, 200, true, 'Profile retrieved successfully', {
      teamName: team.teamName,
      email: team.email,
      team
    });
  } catch (error) {
    console.error('Get me error:', error.message);
    return apiResponse(res, 500, false, 'Error fetching profile');
  }
};

// Update current authenticated team (name/logo)
export const updateMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.teamId;
    if (!userId) {
      return apiResponse(res, 401, false, 'Authentication required');
    }

    const updates = {};
    const { teamName } = req.body;
    if (teamName && String(teamName).trim()) updates.teamName = String(teamName).trim();
    if (req.file) {
      updates.logo = `/uploads/${req.file.filename}`;
    }

    if (Object.keys(updates).length === 0) {
      return apiResponse(res, 400, false, 'No updates provided');
    }

    const team = await Team.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    if (!team) {
      return apiResponse(res, 404, false, 'User not found');
    }

    return apiResponse(res, 200, true, 'Profile updated successfully', {
      teamName: team.teamName,
      logo: team.logo,
      team
    });
  } catch (error) {
    console.error('Update me error:', error.message);
    return apiResponse(res, 500, false, 'Error updating profile');
  }
};