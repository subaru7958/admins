import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get all coaches for the authenticated team
export const fetchCoaches = async () => {
  const res = await fetch(`${API_BASE_URL}/api/coaches`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch coaches');
  }

  const data = await res.json();
  console.log('Coach service response:', data);
  console.log('Coach service data length:', data.data?.length || 0);
  return data.data;
};

// Get a coach by ID
export const fetchCoachById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/coaches/${id}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch coach');
  }

  const data = await res.json();
  return data.data;
};

// Create a new coach
export const createCoach = async (coachData) => {
  console.log('Creating coach with data:', coachData);
  console.log('Auth headers:', createAuthHeaders());
  
  const res = await fetch(`${API_BASE_URL}/api/coaches`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(coachData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error('Coach creation error response:', errorData);
    throw new Error(errorData.message || 'Failed to create coach');
  }

  const data = await res.json();
  return data.data;
};

// Update a coach
export const updateCoach = async (id, coachData) => {
  const res = await fetch(`${API_BASE_URL}/api/coaches/${id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(coachData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update coach');
  }

  const data = await res.json();
  return data.data;
};

// Delete a coach
export const deleteCoach = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/coaches/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete coach');
  }

  const data = await res.json();
  return data;
};