import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get attendance for a training session
export const getAttendanceForSession = async (trainingSessionId, coachId = null) => {
  const url = new URL(`${API_BASE_URL}/api/attendance/session/${trainingSessionId}`);
  if (coachId) {
    url.searchParams.append('coachId', coachId);
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch attendance');
  }

  const data = await res.json();
  return data.data;
};

// Mark attendance for a single player
export const markAttendance = async (trainingSessionId, playerId, status, coachId = null) => {
  const body = { status };
  if (coachId) {
    body.coachId = coachId;
  }

  const res = await fetch(`${API_BASE_URL}/api/attendance/session/${trainingSessionId}/player/${playerId}`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to mark attendance');
  }

  const data = await res.json();
  return data.data;
};

// Mark attendance for multiple players
export const markBulkAttendance = async (trainingSessionId, attendanceData, coachId = null) => {
  const body = { attendanceData };
  if (coachId) {
    body.coachId = coachId;
  }

  const res = await fetch(`${API_BASE_URL}/api/attendance/session/${trainingSessionId}/bulk`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to mark bulk attendance');
  }

  const data = await res.json();
  return data.data;
};

// Get attendance statistics for a training session
export const getAttendanceStats = async (trainingSessionId) => {
  const res = await fetch(`${API_BASE_URL}/api/attendance/session/${trainingSessionId}/stats`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch attendance stats');
  }

  const data = await res.json();
  return data.data;
};
