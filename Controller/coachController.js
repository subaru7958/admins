import Coach from '../Models/Coach.js';
import Team from '../Models/Team.js';
import mongoose from 'mongoose';

// Get all coaches for a team
export const getCoaches = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?._id || req.user?.id;
    
    // Convert to ObjectId if it's a string
    const objectIdTeamId = typeof teamId === 'string' ? new mongoose.Types.ObjectId(teamId) : teamId;
    
    console.log('Coach fetch - req.user:', req.user);
    console.log('Coach fetch - teamId:', teamId);
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const filter = { team: objectIdTeamId };
    
    console.log('Searching for coaches with filter:', filter);
    console.log('TeamId type:', typeof teamId);
    console.log('TeamId value:', teamId);
    console.log('ObjectId teamId:', objectIdTeamId);
    
    const coaches = await Coach.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 });

    console.log('Found coaches:', coaches.length);
    console.log('Raw coaches data:', coaches);
    
    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    console.error('Coach fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coaches',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get coach by ID
export const getCoachById = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const coach = await Coach.findOne({
      _id: req.params.id,
      team: teamId
    }).select('-__v');

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coach',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new coach
export const createCoach = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?._id || req.user?.id;
    
    console.log('Coach creation - req.user:', req.user);
    console.log('Coach creation - teamId:', teamId);
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { fullName, email, dateOfBirth, specialization, contactNumber, agreedSalary, yearsOfExperience } = req.body;
    
    console.log('Coach creation - req.body:', req.body);
    
    // Validate required fields
    if (!fullName || !email || !dateOfBirth || !specialization) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, email, dateOfBirth, specialization'
      });
    }
    
    // Validate dateOfBirth
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date of birth format'
      });
    }
    
    // Check if coach with this email already exists for this team
    const existingCoach = await Coach.findOne({ email, team: teamId });
    if (existingCoach) {
      return res.status(400).json({
        success: false,
        message: 'Coach with this email already exists'
      });
    }

    const coach = await Coach.create({
      fullName,
      email,
      dateOfBirth: birthDate,
      specialization,
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : 0,
      agreedSalary: agreedSalary ? Number(agreedSalary) : 0,
      contactNumber: contactNumber || '',
      team: teamId
    });

    res.status(201).json({
      success: true,
      message: 'Coach created successfully',
      data: coach
    });
  } catch (error) {
    console.error('Coach creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating coach',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update coach
export const updateCoach = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const { fullName, email, dateOfBirth, specialization, contactNumber, agreedSalary, yearsOfExperience } = req.body;
    
    // Check if another coach with this email already exists
    if (email) {
      const existingCoach = await Coach.findOne({
        email,
        team: teamId,
        _id: { $ne: req.params.id }
      });
      
      if (existingCoach) {
        return res.status(400).json({
          success: false,
          message: 'Another coach with this email already exists'
        });
      }
    }

    const coach = await Coach.findOneAndUpdate(
      { _id: req.params.id, team: teamId },
      {
        fullName,
        email,
        dateOfBirth,
        specialization,
        yearsOfExperience: yearsOfExperience !== undefined ? Number(yearsOfExperience) : undefined,
        agreedSalary: agreedSalary !== undefined ? Number(agreedSalary) : undefined,
        contactNumber: contactNumber || ''
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coach updated successfully',
      data: coach
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating coach',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete coach
export const deleteCoach = async (req, res) => {
  try {
    // Get team from authenticated user
    const teamId = req.user?.id || req.user?._id;
    
    if (!teamId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const coach = await Coach.findOneAndDelete({
      _id: req.params.id,
      team: teamId
    });

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coach deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting coach',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};