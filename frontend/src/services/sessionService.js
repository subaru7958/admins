import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get all sessions for a team
export const fetchSessions = async (teamId) => {
  if (!teamId) {
    throw new Error('Team ID is required');
  }

  const res = await fetch(`${API_BASE_URL}/api/sessions?teamId=${teamId}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch sessions');
  }

  const data = await res.json();
  return data.data;
};

// Create a new session
export const createSession = async (sessionData) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(sessionData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create session');
  }

  const data = await res.json();
  return data.data;
};

// Update a session
export const updateSession = async (id, sessionData) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(sessionData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update session');
  }

  const data = await res.json();
  return data.data;
};

// Delete a session
export const deleteSession = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete session');
  }

  const data = await res.json();
  return data;
};

// Add a player to a session
export const addPlayerToSession = async (sessionId, playerId) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/players/${playerId}`, {
    method: 'POST',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to add player to session');
  }

  const data = await res.json();
  return data.data;
};

// Remove a player from a session
export const removePlayerFromSession = async (sessionId, playerId) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/players/${playerId}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to remove player from session');
  }

  const data = await res.json();
  return data.data;
};

// Add a coach to a session
export const addCoachToSession = async (sessionId, coachId) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/coaches/${coachId}`, {
    method: 'POST',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to add coach to session');
  }

  const data = await res.json();
  return data.data;
};

// Remove a coach from a session
export const removeCoachFromSession = async (sessionId, coachId) => {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/coaches/${coachId}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to remove coach from session');
  }

  const data = await res.json();
  return data.data;
};