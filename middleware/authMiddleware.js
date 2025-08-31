import jwt from 'jsonwebtoken';
import Admin from '../Models/Admin.js';
import Player from '../Models/Player.js';
import Coach from '../Models/Coach.js';
import Team from '../Models/Team.js';

// Authenticate token for players and coaches
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's a player token
    if (decoded.role === 'player') {
      const player = await Player.findById(decoded.id).select('-password');
      if (!player) {
        return res.status(401).json({
          success: false,
          message: 'Player not found'
        });
      }
      req.user = player;
      req.userRole = 'player';
    }
    // Check if it's a coach token
    else if (decoded.role === 'coach') {
      const coach = await Coach.findById(decoded.id).select('-password');
      if (!coach) {
        return res.status(401).json({
          success: false,
          message: 'Coach not found'
        });
      }
      req.user = coach;
      req.userRole = 'coach';
    }
    // Check if it's an admin token
    else if (decoded.role === 'admin' || decoded.isAdmin === true) {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }
      req.user = admin;
      req.userRole = 'admin';
    }
    else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Protect routes - check if user is logged in
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // For admin users
      if (decoded.isAdmin === true || decoded.role === 'admin') {
        req.admin = await Admin.findById(decoded.id).select('-password');
        req.user = req.admin;
        req.userRole = 'admin';
      } 
      // For team admins
      else if (decoded.role === 'team_admin') {
        req.team = await Team.findById(decoded.id).select('-password');
        req.user = req.team;
        req.userRole = 'team_admin';
      }
      // For player users
      else {
        req.player = await Player.findById(decoded.id).select('-password');
        req.user = req.player;
        req.userRole = 'player';
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token' 
    });
  }
};

// Restrict to admin users only
export const restrictToAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin rights required.'
    });
  }
  next();
};

// Restrict to specific team members
export const restrictToTeam = async (req, res, next) => {
  // If user is admin, allow access
  if (req.userRole === 'admin') {
    return next();
  }

  // For players, check if they belong to the team
  if (req.userRole === 'player') {
    const teamId = req.params.teamId || req.body.team || req.query.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    try {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }

      if (team._id.toString() !== req.player.team.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not belong to this team.'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error while checking team access'
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid user role.'
    });
  }
};