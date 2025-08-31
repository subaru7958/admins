import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Hash a password using bcrypt
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} - The hashed password
 */
export const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error.message);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - The plain text password
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
export const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error.message);
    return false;
  }
};

/**
 * Generate a JWT token with 7-day expiration
 * @param {Object} payload - The data to include in the token
 * @returns {string} - The generated JWT token
 */
export const generateToken = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a valid object');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  try {
    const token = jwt.sign(payload, secret, {
      expiresIn: '7d',
      issuer: 'sportmanager',
      audience: 'sportmanager-users'
    });
    return token;
  } catch (error) {
    console.error('Error generating token:', error.message);
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} - The decoded token payload
 */
export const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a valid string');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'sportmanager',
      audience: 'sportmanager-users'
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - The Authorization header (e.g., "Bearer token")
 * @returns {string|null} - The token or null if not found
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Create a standardized user payload for JWT
 * @param {Object} user - The user object
 * @returns {Object} - The payload for JWT
 */
export const createUserPayload = (user) => {
  if (!user || !user._id) {
    throw new Error('Invalid user object');
  }

  return {
    id: user._id,
    email: user.email,
    teamName: user.teamName,
    discipline: user.discipline,
    role: 'team_admin'
  };
}; 