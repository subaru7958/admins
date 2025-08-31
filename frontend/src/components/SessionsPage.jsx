import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { fetchPlayers } from '../services/playerService';
import { fetchCoaches } from '../services/coachService';
import { fetchSessions, addPlayerToSession, removePlayerFromSession, addCoachToSession, removeCoachFromSession } from '../services/sessionService';

const SESSION_TYPES = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' }
];

function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isManagingParticipants, setIsManagingParticipants] = useState(false);
  const [expandedAvailablePlayerGroups, setExpandedAvailablePlayerGroups] = useState({ Minimum: true, Cadet: true, Junior: true, Senior: true });
  const [expandedAssignedPlayerGroups, setExpandedAssignedPlayerGroups] = useState({ Minimum: true, Cadet: true, Junior: true, Senior: true });
  const [expandedAvailableCoachGroups, setExpandedAvailableCoachGroups] = useState({});
  const [expandedAssignedCoachGroups, setExpandedAssignedCoachGroups] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    type: 'yearly'
  });

  const loadSessions = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const teamId = localStorage.getItem('teamId');
      
      if (!teamId) {
        throw new Error('Team ID not found');
      }
      
      const data = await fetchSessions(teamId);
      setSessions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlayersAndCoaches = async () => {
    try {
      const playersData = await fetchPlayers();
      const coachesData = await fetchCoaches();
      setPlayers(playersData || []);
      setCoaches(coachesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load players and coaches');
    }
  };

  useEffect(() => {
    loadSessions();
    loadPlayersAndCoaches();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      
      if (!teamId) {
        throw new Error('Team ID not found');
      }
      
      const sessionData = {
        ...formData,
        team: teamId
      };

      const url = editingSession
        ? `${API_BASE_URL}/api/sessions/${editingSession._id}`
        : `${API_BASE_URL}/api/sessions`;
        
      const method = editingSession ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${editingSession ? 'update' : 'create'} session`);
      }

      const data = await res.json();
      setMessage(`Session ${editingSession ? 'updated' : 'created'} successfully`);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        type: 'yearly'
      });
      
      setEditingSession(null);
      setIsCreateModalOpen(false);
      loadSessions();
    } catch (err) {
      setError(err.message || `Failed to ${editingSession ? 'update' : 'create'} session`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      name: session.name || '',
      description: session.description || '',
      startDate: session.startDate ? session.startDate.split('T')[0] : '',
      endDate: session.endDate ? session.endDate.split('T')[0] : '',
      type: session.type || 'yearly'
    });
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete session');
      }

      setMessage('Session deleted successfully');
      loadSessions();
    } catch (err) {
      setError(err.message || 'Failed to delete session');
    }
  };

  const handleManageParticipants = (session) => {
    setSelectedSession(session);
    setIsManagingParticipants(true);
  };

  const reloadParticipants = async (currentSessionId) => {
    try {
      const teamId = localStorage.getItem('teamId');
      const [sessionsData, playersData, coachesData] = await Promise.all([
        fetchSessions(teamId),
        fetchPlayers(),
        fetchCoaches(),
      ]);
      setSessions(sessionsData || []);
      setPlayers(playersData || []);
      setCoaches(coachesData || []);
      const refreshed = (sessionsData || []).find(s => s._id === currentSessionId);
      if (refreshed) setSelectedSession(refreshed);
    } catch (err) {
      setError(err.message || 'Failed to refresh participants');
    }
  };

  const handleAddPlayerToSession = async (playerId) => {
    try {
      await addPlayerToSession(selectedSession._id, playerId);
      setMessage('Player added to session successfully');
      await reloadParticipants(selectedSession._id);
    } catch (err) {
      setError(err.message || 'Failed to add player to session');
    }
  };

  const handleRemovePlayerFromSession = async (playerId) => {
    try {
      await removePlayerFromSession(selectedSession._id, playerId);
      setMessage('Player removed from session successfully');
      await reloadParticipants(selectedSession._id);
    } catch (err) {
      setError(err.message || 'Failed to remove player from session');
    }
  };

  const handleAddCoachToSession = async (coachId) => {
    try {
      await addCoachToSession(selectedSession._id, coachId);
      setMessage('Coach added to session successfully');
      await reloadParticipants(selectedSession._id);
    } catch (err) {
      setError(err.message || 'Failed to add coach to session');
    }
  };

  const handleRemoveCoachFromSession = async (coachId) => {
    try {
      await removeCoachFromSession(selectedSession._id, coachId);
      setMessage('Coach removed from session successfully');
      await reloadParticipants(selectedSession._id);
    } catch (err) {
      setError(err.message || 'Failed to remove coach from session');
    }
  };

  const filteredSessions = sessions.filter(session => {
    return session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           session.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get players not yet assigned to the selected session
  const availablePlayers = selectedSession 
    ? players.filter(player => !selectedSession.players?.some(p => p._id === player._id))
    : [];

  // Get coaches not yet assigned to the selected session
  const availableCoaches = selectedSession 
    ? coaches.filter(coach => !selectedSession.coaches?.some(c => c._id === coach._id))
    : [];

  // Get players assigned to the selected session
  const assignedPlayers = selectedSession 
    ? players.filter(player => selectedSession.players?.some(p => p._id === player._id))
    : [];

  // Get coaches assigned to the selected session
  const assignedCoaches = selectedSession 
    ? coaches.filter(coach => selectedSession.coaches?.some(c => c._id === coach._id))
    : [];

  const groupBy = (items, keyGetter, orderKeys = []) => {
    const groups = items.reduce((acc, item) => {
      const key = keyGetter(item) || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    const keys = orderKeys.length ? orderKeys.filter(k => groups[k]) : Object.keys(groups).sort();
    return { keys, groups };
  };

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Session Management</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={loadSessions}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                setEditingSession(null);
                setFormData({
                  name: '',
                  description: '',
                  startDate: '',
                  endDate: '',
                  type: 'yearly'
                });
                setIsCreateModalOpen(true);
              }}
              className="text-sm rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
              title="Add Session"
            >
              + Add Session
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded p-2 text-sm">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading sessions...</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coaches</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchTerm ? 'No sessions found matching your criteria' : 'No sessions found'}
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{session.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{session.description || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {session.startDate ? new Date(session.startDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {session.endDate ? new Date(session.endDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{session.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {session.players?.length || 0} players
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {session.coaches?.length || 0} coaches
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/dashboard/sessions/${session._id}/schedule`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Schedule
                          </Link>
                          <Link
                            to={`/dashboard/session-management/${session._id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() => handleEdit(session)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(session._id)}
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
          </div>
        )}
      </div>

      {/* Create/Edit Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsCreateModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingSession ? 'Edit Session' : 'Create New Session'}
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Type *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      {SESSION_TYPES.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (editingSession ? 'Updating...' : 'Creating...') : (editingSession ? 'Update Session' : 'Create Session')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Participants Modal */}
      {isManagingParticipants && selectedSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsManagingParticipants(false)}></div>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Manage Participants for "{selectedSession.name}"
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Players grouped by category */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Available Players</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {(() => {
                      const { keys, groups } = groupBy(availablePlayers, p => p.group, ['Minimum','Cadet','Junior','Senior']);
                      if (keys.length === 0) return <div className="p-4 text-center text-gray-500">No available players</div>;
                      return keys.map(group => (
                        <div key={`avail-p-${group}`} className="mb-2 border rounded-md">
                          <button
                            type="button"
                            onClick={() => setExpandedAvailablePlayerGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                          >
                            <span className="font-medium text-gray-900">{group}</span>
                            <span className="text-gray-500">{expandedAvailablePlayerGroups[group] ? '▾' : '▸'}</span>
                          </button>
                          {expandedAvailablePlayerGroups[group] && (
                            <ul className="divide-y divide-gray-200">
                              {groups[group].map(player => (
                                <li key={player._id} className="px-3 py-2 flex justify-between items-center">
                                  <div className="text-sm text-gray-900">{player.fullName}</div>
                                  <button onClick={() => handleAddPlayerToSession(player._id)} className="text-blue-600 hover:text-blue-900 text-sm">Add</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                
                {/* Assigned Players grouped by category */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Assigned Players</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {(() => {
                      const { keys, groups } = groupBy(assignedPlayers, p => p.group, ['Minimum','Cadet','Junior','Senior']);
                      if (keys.length === 0) return <div className="p-4 text-center text-gray-500">No assigned players</div>;
                      return keys.map(group => (
                        <div key={`ass-p-${group}`} className="mb-2 border rounded-md">
                          <button
                            type="button"
                            onClick={() => setExpandedAssignedPlayerGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                          >
                            <span className="font-medium text-gray-900">{group}</span>
                            <span className="text-gray-500">{expandedAssignedPlayerGroups[group] ? '▾' : '▸'}</span>
                          </button>
                          {expandedAssignedPlayerGroups[group] && (
                            <ul className="divide-y divide-gray-200">
                              {groups[group].map(player => (
                                <li key={player._id} className="px-3 py-2 flex justify-between items-center">
                                  <div className="text-sm text-gray-900">{player.fullName}</div>
                                  <button onClick={() => handleRemovePlayerFromSession(player._id)} className="text-red-600 hover:text-red-900 text-sm">Remove</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                
                {/* Available Coaches grouped by specialization */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Available Coaches</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {(() => {
                      const { keys, groups } = groupBy(availableCoaches, c => c.specialization || 'General');
                      if (keys.length === 0) return <div className="p-4 text-center text-gray-500">No available coaches</div>;
                      return keys.map(spec => (
                        <div key={`avail-c-${spec}`} className="mb-2 border rounded-md">
                          <button
                            type="button"
                            onClick={() => setExpandedAvailableCoachGroups(prev => ({ ...prev, [spec]: !prev[spec] }))}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                          >
                            <span className="font-medium text-gray-900">{spec}</span>
                            <span className="text-gray-500">{expandedAvailableCoachGroups[spec] ? '▾' : '▸'}</span>
                          </button>
                          {expandedAvailableCoachGroups[spec] && (
                            <ul className="divide-y divide-gray-200">
                              {groups[spec].map(coach => (
                                <li key={coach._id} className="px-3 py-2 flex justify-between items-center">
                                  <div className="text-sm text-gray-900">{coach.fullName}</div>
                                  <button onClick={() => handleAddCoachToSession(coach._id)} className="text-blue-600 hover:text-blue-900 text-sm">Add</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                
                {/* Assigned Coaches grouped by specialization */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Assigned Coaches</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {(() => {
                      const { keys, groups } = groupBy(assignedCoaches, c => c.specialization || 'General');
                      if (keys.length === 0) return <div className="p-4 text-center text-gray-500">No coaches assigned</div>;
                      return keys.map(spec => (
                        <div key={`ass-c-${spec}`} className="mb-2 border rounded-md">
                          <button
                            type="button"
                            onClick={() => setExpandedAssignedCoachGroups(prev => ({ ...prev, [spec]: !prev[spec] }))}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                          >
                            <span className="font-medium text-gray-900">{spec}</span>
                            <span className="text-gray-500">{expandedAssignedCoachGroups[spec] ? '▾' : '▸'}</span>
                          </button>
                          {expandedAssignedCoachGroups[spec] && (
                            <ul className="divide-y divide-gray-200">
                              {groups[spec].map(coach => (
                                <li key={coach._id} className="px-3 py-2 flex justify-between items-center">
                                  <div className="text-sm text-gray-900">{coach.fullName}</div>
                                  <button onClick={() => handleRemoveCoachFromSession(coach._id)} className="text-red-600 hover:text-red-900 text-sm">Remove</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManagingParticipants(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionsPage;