// API Response Messages
export const MESSAGES = {
  // Success Messages
  REGISTRATION_SUCCESS: 'Team registered successfully!',
  LOGIN_SUCCESS: 'Login successful!',
  TEAMS_RETRIEVED: 'Teams retrieved successfully',
  TEAM_RETRIEVED: 'Team retrieved successfully',
  
  // Error Messages
  VALIDATION_FAILED: 'Validation failed',
  EMAIL_EXISTS: 'Email already registered. Please use a different email or try logging in.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TEAM_NOT_FOUND: 'Team not found',
  INVALID_TEAM_ID: 'Invalid team ID format',
  INTERNAL_ERROR: 'Internal server error. Please try again later.',
  FILE_TOO_LARGE: 'File too large. Maximum size is 5MB.',
  INVALID_FILE_TYPE: 'Only image files (JPG, PNG, GIF, WebP) are allowed.',
  TOO_MANY_FILES: 'Too many files. Only one file is allowed.',
  NO_TOKEN: 'Access denied. No token provided.',
  ADMIN_REQUIRED: 'Access denied. Admin privileges required.',
  
  // Validation Messages
  TEAM_NAME_REQUIRED: 'Team name is required',
  DISCIPLINE_REQUIRED: 'Discipline is required',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  PHONE_REQUIRED: 'Phone number is required',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  TEAM_ID_REQUIRED: 'Team ID is required'
};

// HTTP Status Codes
export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIMES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  FIELD_NAME: 'teamLogo',
  UPLOAD_DIR: 'uploads'
};

// JWT Configuration
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',
  ISSUER: 'sportmanager',
  AUDIENCE: 'sportmanager-users'
};

// Database Configuration
export const DB_CONFIG = {
  MAX_POOL_SIZE: 10,
  SERVER_SELECTION_TIMEOUT: 5000,
  SOCKET_TIMEOUT: 45000
};

// Validation Rules
export const VALIDATION_RULES = {
  TEAM_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128
  },
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
}; 