import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get all training sessions for a session
export const fetchTrainingSessions = async (sessionId, { group, subgroup } = {}) => {
  const params = new URLSearchParams();
  if (group) params.set('group', group);
  if (subgroup) params.set('subgroup', subgroup);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/session/${sessionId}${qs}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch training sessions');
  }

  const data = await res.json();
  return data.data;
};

// Get a training session by ID
export const fetchTrainingSessionById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${id}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch training session');
  }

  const data = await res.json();
  return data.data;
};

// Create a new training session
export const createTrainingSession = async (trainingSessionData) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trainingSessionData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create training session');
  }

  const data = await res.json();
  return data.data;
};

// Update a training session
export const updateTrainingSession = async (id, trainingSessionData) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trainingSessionData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update training session');
  }

  const data = await res.json();
  return data.data;
};

// Delete a training session
export const deleteTrainingSession = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete training session');
  }

  const data = await res.json();
  return data;
};

// Add a player to a training session
export const addPlayerToTrainingSession = async (trainingSessionId, playerId) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/players/${playerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to add player to training session');
  }

  const data = await res.json();
  return data.data;
};

// Remove a player from a training session
export const removePlayerFromTrainingSession = async (trainingSessionId, playerId) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/players/${playerId}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to remove player from training session');
  }

  const data = await res.json();
  return data.data;
};

// Add a coach to a training session
export const addCoachToTrainingSession = async (trainingSessionId, coachId) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/coaches/${coachId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to add coach to training session');
  }

  const data = await res.json();
  return data.data;
};

// Remove a coach from a training session
export const removeCoachFromTrainingSession = async (trainingSessionId, coachId) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/coaches/${coachId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to remove coach from training session');
  }

  const data = await res.json();
  return data.data;
};

// Update attendance for a training session
export const updateAttendance = async (trainingSessionId, playerId, status) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/attendance`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId, status }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update attendance');
  }

  const data = await res.json();
  return data.data;
};

// Get attendance for a training session
export const getAttendance = async (trainingSessionId) => {
  const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/attendance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to get attendance');
  }

  const data = await res.json();
  return data.data;
};

// Mark payment for a subject (player/coach) for a session
export const markSubjectPaidForSession = async ({ sessionId, subjectId, subjectType, amount, year, month, notes }) => {
  const res = await fetch(`${API_BASE_URL}/api/payments/${sessionId}/mark-paid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subjectId, subjectType, amount, year, month, notes }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to record payment');
  }

  const data = await res.json();
  return data.data;
};