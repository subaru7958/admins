// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// API Endpoints
export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  TEAMS: `${API_BASE_URL}/api/auth/teams`,
  TEAM_BY_ID: (id) => `${API_BASE_URL}/api/auth/teams/${id}`,
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'SportManager',
  VERSION: '1.0.0',
  DESCRIPTION: 'Professional Sports Team Management Platform',
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
}; 