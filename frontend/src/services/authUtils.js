import { API_BASE_URL } from '../config/config';

/**
 * Get authentication token from localStorage or sessionStorage
 * @returns {string|null} Authentication token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken') || 
         localStorage.getItem('playerToken') || 
         localStorage.getItem('coachToken') ||
         sessionStorage.getItem('authToken') || 
         sessionStorage.getItem('playerToken') || 
         sessionStorage.getItem('coachToken');
};

/**
 * Get team information from localStorage
 * @returns {Object} Team information
 */
export const getTeamInfo = () => {
  return {
    teamName: localStorage.getItem('teamName'),
    discipline: localStorage.getItem('teamDiscipline'),
    logo: localStorage.getItem('teamLogo')
  };
};

/**
 * Create headers with authentication token
 * @returns {Object} Headers object with authentication
 */
export const createAuthHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};