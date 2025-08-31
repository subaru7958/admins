import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get all events for the team
export const fetchEvents = async (params = {}) => {
  const teamId = localStorage.getItem('teamId');
  const mergedParams = { ...params };
  if (teamId && !mergedParams.team) {
    mergedParams.team = teamId;
  }
  const queryParams = new URLSearchParams(mergedParams).toString();
  const url = `${API_BASE_URL}/api/events${queryParams ? `?${queryParams}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch events');
  }

  return data.data;
};

// Get a specific event by ID
export const fetchEventById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch event');
  }

  return data.data;
};

// Create a new event
export const createEvent = async (eventData) => {
  const teamId = localStorage.getItem('teamId');
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ ...eventData, team: eventData.team || teamId }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create event');
  }

  return data.data;
};

// Update an existing event
export const updateEvent = async (id, eventData) => {
  const teamId = localStorage.getItem('teamId');
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({ ...eventData, team: eventData.team || teamId }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update event');
  }

  return data.data;
};

// Delete an event
export const deleteEvent = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete event');
  }

  return data;
};