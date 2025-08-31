import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from './authUtils';

// Get all players for the authenticated team
export const fetchPlayers = async () => {
  console.log('Fetching players with headers:', createAuthHeaders());
  
  const res = await fetch(`${API_BASE_URL}/api/players`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    console.error('Player fetch error response:', errorData);
    throw new Error(errorData.message || 'Failed to fetch players');
  }

  const data = await res.json();
  console.log('Player service response:', data);
  console.log('Player service data length:', data.data?.length || 0);
  return data.data;
};

// Get a player by ID
export const fetchPlayerById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/players/${id}`, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch player');
  }

  const data = await res.json();
  return data.data;
};

// Create a new player
export const createPlayer = async (playerData) => {
  const res = await fetch(`${API_BASE_URL}/api/players`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(playerData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to create player');
  }

  const data = await res.json();
  return data.data;
};

// Public registration of a player (no auth); must include team in body
export const publicRegisterPlayer = async (playerData) => {
  const res = await fetch(`${API_BASE_URL}/api/players/public-register`, {
    method: 'POST',
    body: (() => {
      if (playerData instanceof FormData) return playerData;
      const form = new FormData();
      Object.entries(playerData || {}).forEach(([k, v]) => form.append(k, v));
      return form;
    })(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to register player');
  }

  const data = await res.json();
  return data.data;
};

// Update a player
export const updatePlayer = async (id, playerData) => {
  const res = await fetch(`${API_BASE_URL}/api/players/${id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(playerData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to update player');
  }

  const data = await res.json();
  return data.data;
};

// Mark player's current month as paid
export const markPlayerPaid = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/players/${id}/mark-paid`, {
    method: 'PUT',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to record payment');
  }

  const data = await res.json();
  return data.data;
};

// Delete a player
export const deletePlayer = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/players/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to delete player');
  }

  const data = await res.json();
  return data;
};

// Move a player to a different group
export const movePlayer = async (id, groupData) => {
  const res = await fetch(`${API_BASE_URL}/api/players/${id}/move`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(groupData),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to move player');
  }

  const data = await res.json();
  return data.data;
};
