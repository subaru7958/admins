import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPlayers, deletePlayer } from '../services/playerService';
import PlayerEditModal from './PlayerEditModal';
import PlayersCreateModal from './PlayersCreateModal';
import { API_BASE_URL } from '../config/config';
import { createAuthHeaders } from '../services/authUtils';

const GROUPS = ['Poussin', 'Ecole', 'Minimum', 'Cadet', 'Junior', 'Senior'];

function PlayersListPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      // Fetch players and subgroups in parallel
      const [playersList, subgroupsList] = await Promise.all([
        fetchPlayers(),
        fetchSubgroups()
      ]);
      setPlayers(playersList);
      setSubgroups(subgroupsList);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all subgroups for the team (across all sessions)
  const fetchSubgroups = async () => {
    const teamId = localStorage.getItem('teamId');

    try {
      // First, get all sessions for the team
      const sessionsRes = await fetch(`${API_BASE_URL}/api/sessions?teamId=${teamId}`, {
        method: 'GET',
        headers: createAuthHeaders(),
      });

      if (!sessionsRes.ok) {
        console.warn('Failed to fetch sessions, returning empty subgroups');
        return [];
      }

      const sessionsData = await sessionsRes.json();
      const sessions = sessionsData.data || [];

      // Then, get subgroups for each session
      const subgroupPromises = sessions.map(async (session) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/subgroups/session/${session._id}?teamId=${teamId}`, {
            method: 'GET',
            headers: createAuthHeaders(),
          });

          if (res.ok) {
            const data = await res.json();
            return data.data || [];
          }
          return [];
        } catch (error) {
          console.warn(`Failed to fetch subgroups for session ${session._id}:`, error);
          return [];
        }
      });

      const subgroupArrays = await Promise.all(subgroupPromises);
      const allSubgroups = subgroupArrays.flat();

      return allSubgroups;
    } catch (error) {
      console.error('Error fetching subgroups:', error);
      return [];
    }
  };

  // Get subgroup display name (name + category)
  const getSubgroupDisplayName = (subgroupId) => {
    if (!subgroupId) return '—';

    const subgroup = subgroups.find(sg => sg._id === subgroupId);
    if (!subgroup) return '—';

    return `${subgroup.name} (${subgroup.category})`;
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (playerId) => {
    if (!window.confirm('Delete this player?')) return;
    try {
      await deletePlayer(playerId);
      setMessage('Player deleted');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete player');
    }
  };

  // Filter players by category if a filter is selected
  const filteredPlayers = useMemo(() => {
    let list = players;
    if (categoryFilter) list = list.filter(player => player.group === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.fullName || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.group || '').toLowerCase().includes(q) ||
        getSubgroupDisplayName(p.subgroup).toLowerCase().includes(q)
      );
    }
    return list;
  }, [players, categoryFilter, search, subgroups]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
              title="Go back"
            >
              ← Back
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Players Management</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <button
              onClick={load}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200 w-full sm:w-auto"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={() => setCreatingPlayer(true)}
              className="text-sm rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 w-full sm:w-auto"
              title="Add Player"
            >
              + Add Player
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded p-2 text-sm">{message}</div>
        )}
        {isLoading ? (
          <div className="text-gray-600">Loading players…</div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">{error}</div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop/tablet table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subgroup</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        {categoryFilter ? `No players found in category ${categoryFilter}` : 'No players found'}
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((player) => (
                      <tr key={player._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{player.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{player.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {player.group || 'Minimum'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {getSubgroupDisplayName(player.subgroup)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(player._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredPlayers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {categoryFilter ? `No players found in category ${categoryFilter}` : 'No players found'}
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div key={player._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{player.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{player.email || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800">{player.group || 'Minimum'}</span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-800">{getSubgroupDisplayName(player.subgroup)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-3">
                      <button onClick={() => setEditingPlayer(player)} className="text-xs text-blue-600">Edit</button>
                      <button onClick={() => onDelete(player._id)} className="text-xs text-red-600">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <PlayerEditModal
        isOpen={!!editingPlayer}
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onSaved={() => {
          setEditingPlayer(null);
          load();
        }}
      />
      <PlayersCreateModal
        isOpen={creatingPlayer}
        onClose={() => setCreatingPlayer(false)}
        onCreated={() => {
          setCreatingPlayer(false);
          load();
        }}
      />
    </div>
  );
}

export default PlayersListPage;
