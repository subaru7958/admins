import { API_ENDPOINTS } from '../config/config';

/**
 * Authenticate user via backend.
 * Returns token and user payload on success.
 */
export async function login({ email, password }) {
  const response = await fetch(API_ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  let result;
  try {
    result = await response.json();
  } catch (e) {
    result = null;
  }

  const isSuccess = result?.success === true;

  if (!response.ok || !isSuccess) {
    const message = result?.message || 'Login failed';
    const errors = Array.isArray(result?.errors) ? result.errors.join(', ') : '';
    throw new Error(errors ? `${message}: ${errors}` : message);
  }

  const token = result?.data?.token || result?.token;
  const user = result?.data || { teamName: result?.teamName };

  return { token, user, message: result?.message };
}

/**
 * Logout user by clearing all authentication data.
 * Returns success status.
 */
export function logout() {
  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('teamName');
  localStorage.removeItem('teamLogo');
  
  // Clear sessionStorage
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('teamName');
  sessionStorage.removeItem('teamLogo');
  
  return { success: true, message: 'Logged out successfully' };
}


