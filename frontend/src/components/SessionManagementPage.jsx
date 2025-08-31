import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { fetchPlayers } from '../services/playerService';
import { fetchCoaches } from '../services/coachService';
import { fetchSessions, deleteSession, addPlayerToSession, removePlayerFromSession, addCoachToSession, removeCoachFromSession } from '../services/sessionService';
import { createAuthHeaders } from '../services/authUtils';

const CATEGORIES = ['Poussin', 'Ecole', 'Minimum', 'Cadet', 'Junior', 'Senior'];

function SessionManagementPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [subgroups, setSubgroups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isCreateSubgroupModalOpen, setIsCreateSubgroupModalOpen] = useState(false);
  const [isEditSubgroupModalOpen, setIsEditSubgroupModalOpen] = useState(false);
  const [isAssignPlayerModalOpen, setIsAssignPlayerModalOpen] = useState(false);
  const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState(false);
  const [isManageSessionPlayersOpen, setIsManageSessionPlayersOpen] = useState(false);
  const [isManageSessionCoachesOpen, setIsManageSessionCoachesOpen] = useState(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [createCategory, setCreateCategory] = useState('Minimum');
  
  // Form states
  const [subgroupForm, setSubgroupForm] = useState({
    name: '',
    category: 'Minimum',
    description: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Minimum',
    description: ''
  });

  const [sessionForm, setSessionForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    type: 'season'
  });

  const [availableSessions, setAvailableSessions] = useState([]);

  // Handle session deletion
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? This will also delete all associated subgroups and assignments.')) {
      return;
    }

    try {
      await deleteSession(sessionId);
      setMessage('Session deleted successfully');
      // Reload available sessions
      await loadAvailableSessions();
    } catch (err) {
      setError(err.message || 'Failed to delete session');
    }
  };

  // Handle session editing (placeholder - would need a modal)
  const handleEditSession = (session) => {
    // For now, just show an alert. In a real implementation, you'd open an edit modal
    alert(`Edit functionality for session "${session.name}" would be implemented here.\n\nThis would open a modal to edit session details like name, dates, and type.`);
  };


  // Handle session form changes
  const handleSessionFormChange = (e) => {
    const { name, value } = e.target;
    setSessionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create new session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');

      const res = await fetch(`${API_BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          ...sessionForm,
          teamId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create session');
      }

      const data = await res.json();
      setMessage('Session created successfully');

      // Reset form and close modal
      setSessionForm({
        name: '',
        startDate: '',
        endDate: '',
        type: 'season'
      });
      setIsCreateSessionModalOpen(false);

      // Reload available sessions
      await loadAvailableSessions();
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    } else {
      // If no sessionId, load available sessions for selection
      loadAvailableSessions();
    }
  }, [sessionId]);


  const loadSessionData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      if (!teamId) {
        throw new Error('Team ID not found');
      }

      // Load session, subgroups, players, and coaches
      // Fetch data individually to handle failures gracefully
      let sessionsData = [];
      let subgroupsData = [];
      let playersData = [];
      let coachesData = [];

      try {
        sessionsData = await fetchSessions(teamId);
      } catch (err) {
        throw new Error('Failed to load sessions');
      }

      try {
        subgroupsData = await fetchSubgroups(sessionId);
      } catch (err) {
        // Don't throw, just set empty array
        subgroupsData = [];
      }

      try {
        playersData = await fetchPlayers();
      } catch (err) {
        playersData = [];
      }

      try {
        coachesData = await fetchCoaches();
      } catch (err) {
        coachesData = [];
      }

      const currentSession = sessionsData.find(s => s._id === sessionId || s._id.toString() === sessionId);
      if (!currentSession) {
        throw new Error('Session not found');
      }

      setSession(currentSession);
      setSubgroups(subgroupsData || []);
      setPlayers(playersData || []);
      setCoaches(coachesData || []);
    } catch (err) {
      setError(err.message || 'Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch subgroups for the session
  const fetchSubgroups = async (sessionId) => {
    const teamId = localStorage.getItem('teamId');
    const res = await fetch(`${API_BASE_URL}/api/subgroups/session/${sessionId}?teamId=${teamId}`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to fetch subgroups');
    }

    const data = await res.json();
    return data.data;
  };

  // Load available sessions for selection
  const loadAvailableSessions = async () => {
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      if (!teamId) {
        throw new Error('Team ID not found');
      }

      const data = await fetchSessions(teamId);
      setAvailableSessions(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle subgroup form changes
  const handleSubgroupFormChange = (e) => {
    const { name, value } = e.target;
    setSubgroupForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit form changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open edit modal and populate form
  const openEditModal = (subgroup) => {
    setSelectedSubgroup(subgroup);
    setEditForm({
      name: subgroup.name,
      category: subgroup.category,
      description: subgroup.description || ''
    });
    setIsEditSubgroupModalOpen(true);
  };

  // Close edit modal and reset form
  const closeEditModal = () => {
    setIsEditSubgroupModalOpen(false);
    setSelectedSubgroup(null);
    setEditForm({
      name: '',
      category: 'Minimum',
      description: ''
    });
  };

  // Create new subgroup
  const handleCreateSubgroup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      
      // Get next subgroup number for this category
      const existingSubgroupsInCategory = subgroups.filter(sg => sg.category === subgroupForm.category);
      const nextNumber = existingSubgroupsInCategory.length + 1;
      
      const res = await fetch(`${API_BASE_URL}/api/subgroups/session/${sessionId}`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          ...subgroupForm,
          name: `${subgroupForm.category} ${nextNumber}`,
          teamId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create subgroup');
      }

      const data = await res.json();
      setMessage('Subgroup created successfully');
      
      // Reset form and close modal
      setSubgroupForm({
        name: '',
        category: 'Minimum',
        description: ''
      });
      setIsCreateSubgroupModalOpen(false);
      
      // Reload data
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to create subgroup');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit subgroup
  const handleEditSubgroup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${selectedSubgroup._id}`, {
        method: 'PUT',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          ...editForm,
          teamId
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update subgroup');
      }

      const data = await res.json();
      setMessage('Subgroup updated successfully');
      
      // Close modal
      closeEditModal();
      
      // Reload data
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to update subgroup');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete subgroup
  const handleDeleteSubgroup = async (subgroupId) => {
    if (!window.confirm('Are you sure you want to delete this subgroup? This will remove all player and coach assignments.')) {
      return;
    }

    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${subgroupId}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
        body: JSON.stringify({ teamId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete subgroup');
      }

      setMessage('Subgroup deleted successfully');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to delete subgroup');
    }
  };

  // Assign player to subgroup
  const handleAssignPlayer = async (subgroup, playerId) => {
    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${subgroup._id}/players/${playerId}`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ teamId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to assign player to subgroup');
      }

      setMessage('Player assigned to subgroup successfully');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to assign player to subgroup');
    }
  };

  // Remove player from subgroup
  const handleRemovePlayer = async (subgroup, playerId) => {
    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${subgroup._id}/players/${playerId}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
        body: JSON.stringify({ teamId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove player from subgroup');
      }

      setMessage('Player removed from subgroup successfully');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to remove player from subgroup');
    }
  };

  // Assign coach to subgroup
  const handleAssignCoach = async (subgroup, coachId) => {
    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${subgroup._id}/coaches/${coachId}`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ teamId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to assign coach to subgroup');
      }

      setMessage('Coach assigned to subgroup successfully');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to assign coach to subgroup');
    }
  };

  // Remove coach from subgroup
  const handleRemoveCoach = async (subgroup, coachId) => {
    try {
      const teamId = localStorage.getItem('teamId');
      const res = await fetch(`${API_BASE_URL}/api/subgroups/${subgroup._id}/coaches/${coachId}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
        body: JSON.stringify({ teamId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove coach from subgroup');
      }

      setMessage('Coach removed from subgroup successfully');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to remove coach from subgroup');
    }
  };

  // Get available players for a category (not assigned to any subgroup)
  const getAvailablePlayersForCategory = (category) => {
    const allPlayersInCategory = players.filter(p => p.group === category);
    const assignedPlayerIds = subgroups.reduce((acc, sg) => {
      if (sg.category === category) {
        return acc.concat(sg.players.map(p => p._id));
      }
      return acc;
    }, []);
    
    return allPlayersInCategory.filter(p => !assignedPlayerIds.includes(p._id));
  };

  // Players not yet in this session
  const getPlayersNotInSession = () => {
    const inSessionIds = new Set((session?.players || []).map(p => p._id || p));
    return players.filter(p => !inSessionIds.has(p._id));
  };

  const handleAddPlayerToSession = async (playerId) => {
    try {
      await addPlayerToSession(sessionId, playerId);
      setMessage('Player added to session');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to add player to session');
    }
  };

  const handleRemovePlayerFromSession = async (playerId) => {
    try {
      await removePlayerFromSession(sessionId, playerId);
      setMessage('Player removed from session');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to remove player from session');
    }
  };

  // Get available coaches for a subgroup
  const getAvailableCoachesForSubgroup = (subgroup) => {
    const assignedCoachIds = subgroup.coaches.map(c => c._id);
    return coaches.filter(c => !assignedCoachIds.includes(c._id));
  };

  // Coaches not yet in this session
  const getCoachesNotInSession = () => {
    const inSessionIds = new Set((session?.coaches || []).map(c => c._id || c));
    return coaches.filter(c => !inSessionIds.has(c._id));
  };

  const handleAddCoachToSession = async (coachId) => {
    try {
      await addCoachToSession(sessionId, coachId);
      setMessage('Coach added to session');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to add coach to session');
    }
  };

  const handleRemoveCoachFromSession = async (coachId) => {
    try {
      await removeCoachFromSession(sessionId, coachId);
      setMessage('Coach removed from session');
      await loadSessionData();
    } catch (err) {
      setError(err.message || 'Failed to remove coach from session');
    }
  };

  // Filter subgroups based on selected category and search term
  const filteredSubgroups = subgroups.filter(subgroup => {
    const matchesCategory = selectedCategory === 'all' || subgroup.category === selectedCategory;
    const matchesSearch = subgroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subgroup.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get statistics for each category
  const getCategoryStats = (category) => {
    const categorySubgroups = subgroups.filter(sg => sg.category === category);
    const totalPlayers = categorySubgroups.reduce((acc, sg) => acc + sg.players.length, 0);
    const totalCoaches = categorySubgroups.reduce((acc, sg) => acc + sg.coaches.length, 0);
    const availablePlayers = getAvailablePlayersForCategory(category);
    
    return {
      subgroups: categorySubgroups.length,
      players: totalPlayers,
      coaches: totalCoaches,
      availablePlayers: availablePlayers.length
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading session management...</p>
        </div>
      </div>
    );
  }

  // If no sessionId, show session selection
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/sessions')}
                className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
              >
                ← Back to Sessions
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Session Management</h1>
            </div>
          
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Session to Manage</h2>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading sessions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No sessions available</p>
                <button
                  onClick={() => navigate('/dashboard/sessions')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create a Session
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableSessions.map(session => (
                  <div key={session._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{session.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">{session.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/session-management/${session._id}`)}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Manage Session
                        </button>
                        <button
                          onClick={() => handleSchedulePayments(session)}
                          className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => handleEditSession(session)}
                          className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session._id)}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError('');
                  if (sessionId) {
                    loadSessionData();
                  } else {
                    loadAvailableSessions();
                  }
                }}
                className="mr-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-red-600">Session not found</p>
          )}
          <button
            onClick={() => navigate('/dashboard/sessions')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/sessions')}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
            >
              ← Back to Sessions
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Session Management: {session.name}
              </h1>
              <p className="text-sm text-gray-600">
                {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/dashboard/sessions')}
              className="text-sm rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700"
            >
              + Add New Session
            </button>
            <button
              onClick={() => setIsCreateSubgroupModalOpen(true)}
              className="text-sm rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
            >
              + Create Subgroup
            </button>
            <button
              onClick={() => setIsManageSessionPlayersOpen(true)}
              className="text-sm rounded-md bg-gray-800 text-white px-4 py-2 hover:bg-gray-900"
            >
              Manage Session Players
            </button>
            <button
              onClick={() => setIsManageSessionCoachesOpen(true)}
              className="text-sm rounded-md bg-gray-700 text-white px-4 py-2 hover:bg-gray-800"
            >
              Manage Session Coaches
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded p-3 text-sm">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
            {error}
          </div>
        )}

        {/* Category Statistics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(category => {
              const stats = getCategoryStats(category);
              return (
                <div key={category} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 text-sm">{category}</h3>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>{stats.subgroups} subgroups</p>
                    <p>{stats.players} players</p>
                    <p>{stats.coaches} coaches</p>
                    <p>{stats.availablePlayers} available</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Subgroups</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subgroups Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Subgroups ({filteredSubgroups.length})
            </h2>
          </div>
          
          {filteredSubgroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No subgroups match your filters' 
                : 'No subgroups created yet'}
              <button
                onClick={() => setIsCreateSubgroupModalOpen(true)}
                className="mt-2 block mx-auto text-sm text-blue-600 hover:text-blue-700"
              >
                Create first subgroup
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Subgroup Number
                     </th>
                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Category & Number
                     </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Players
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coaches
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubgroups.map(subgroup => (
                    <tr key={subgroup._id} className="hover:bg-gray-50">
                                             <td className="px-6 py-4">
                         <div>
                           <div className="text-sm font-medium text-gray-900">Subgroup {subgroup.name.split(' ').pop()}</div>
                           {subgroup.description && (
                             <div className="text-sm text-gray-500">{subgroup.description}</div>
                           )}
                         </div>
                       </td>
                                             <td className="px-6 py-4">
                         <div className="space-y-1">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             {subgroup.category}
                           </span>
                           <div className="text-xs text-gray-500">
                             {subgroup.name}
                           </div>
                         </div>
                       </td>
                                             <td className="px-6 py-4">
                         <div className="text-sm text-gray-900">
                           {subgroup.players.length} assigned
                         </div>
                         <div className="text-xs text-gray-500">
                           {getAvailablePlayersForCategory(subgroup.category).length} available
                         </div>
                         
                         {/* Show assigned players */}
                         {subgroup.players.length > 0 && (
                           <div className="mt-2 space-y-1">
                             {subgroup.players.map(player => (
                               <div key={player._id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                                 <span className="text-gray-700">{player.fullName}</span>
                                 <button
                                   onClick={() => handleRemovePlayer(subgroup, player._id)}
                                   className="text-red-600 hover:text-red-700 text-xs"
                                 >
                                   Remove
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                         
                         <button
                           onClick={() => {
                             setSelectedSubgroup(subgroup);
                             setIsAssignPlayerModalOpen(true);
                           }}
                           className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                         >
                           + Add Player
                         </button>
                       </td>
                                             <td className="px-6 py-4">
                         <div className="text-sm text-gray-900">
                           {subgroup.coaches.length} assigned
                         </div>
                         <div className="text-xs text-gray-500">
                           {getAvailableCoachesForSubgroup(subgroup).length} available
                         </div>
                         
                         {/* Show assigned coaches */}
                         {subgroup.coaches.length > 0 && (
                           <div className="mt-2 space-y-1">
                             {subgroup.coaches.map(coach => (
                               <div key={coach._id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                                 <span className="text-gray-700">{coach.fullName}</span>
                                 <button
                                   onClick={() => handleRemoveCoach(subgroup, coach._id)}
                                   className="text-red-600 hover:text-red-700 text-xs"
                                 >
                                   Remove
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                         
                         <button
                           onClick={() => {
                             setSelectedSubgroup(subgroup);
                             setIsAssignCoachModalOpen(true);
                           }}
                           className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                         >
                           + Add Coach
                         </button>
                       </td>
                                             <td className="px-6 py-4">
                         <div className="flex space-x-2">
                           <button
                             onClick={() => openEditModal(subgroup)}
                             className="text-blue-600 hover:text-blue-900 text-sm"
                           >
                             Edit
                           </button>
                           <button
                             onClick={() => handleDeleteSubgroup(subgroup._id)}
                             className="text-red-600 hover:text-red-900 text-sm"
                           >
                             Delete
                           </button>
                         </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

             {/* Create Subgroup Modal */}
       {isCreateSubgroupModalOpen && (
         <div className="fixed inset-0 z-50 overflow-y-auto">
           <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsCreateSubgroupModalOpen(false)}></div>
             
             <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
               <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create New Subgroup</h3>
               
               <form onSubmit={handleCreateSubgroup}>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Category *</label>
                     <select
                       name="category"
                       value={subgroupForm.category}
                       onChange={handleSubgroupFormChange}
                       required
                       className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                     >
                       {CATEGORIES.map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                       ))}
                     </select>
                     <p className="mt-1 text-xs text-gray-500">Subgroup name will be auto-generated (e.g., Minimum 1, Minimum 2)</p>
                   </div>
                   

                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Description</label>
                     <textarea
                       name="description"
                       value={subgroupForm.description}
                       onChange={handleSubgroupFormChange}
                       rows="3"
                       className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                       placeholder="Optional description for this subgroup"
                     />
                   </div>
                   

                 </div>
                 
                 <div className="mt-6 flex justify-end gap-3">
                   <button
                     type="button"
                     onClick={() => setIsCreateSubgroupModalOpen(false)}
                     className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={isLoading}
                     className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                   >
                     {isLoading ? 'Creating...' : 'Create Subgroup'}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>
       )}

       {/* Edit Subgroup Modal */}
       {isEditSubgroupModalOpen && selectedSubgroup && (
         <div className="fixed inset-0 z-50 overflow-y-auto">
           <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeEditModal}></div>
             
             <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
               <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Subgroup: {selectedSubgroup.name}</h3>
               
               <form onSubmit={handleEditSubgroup}>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Subgroup Name *</label>
                     <input
                       type="text"
                       name="name"
                       value={editForm.name}
                       onChange={handleEditFormChange}
                       required
                       className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                       placeholder="e.g., Group A, Team 1"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Category *</label>
                     <select
                       name="category"
                       value={editForm.category}
                       onChange={handleEditFormChange}
                       required
                       className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                     >
                       {CATEGORIES.map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                       ))}
                     </select>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Description</label>
                     <textarea
                       name="description"
                       value={editForm.description}
                       onChange={handleEditFormChange}
                       rows="3"
                       className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                       placeholder="Optional description for this subgroup"
                     />
                   </div>
                   

                 </div>
                 
                 <div className="mt-6 flex justify-end gap-3">
                   <button
                     type="button"
                     onClick={closeEditModal}
                     className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={isLoading}
                     className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                   >
                     {isLoading ? 'Updating...' : 'Update Subgroup'}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>
       )}

      {/* Assign Player Modal */}
      {isAssignPlayerModalOpen && selectedSubgroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsAssignPlayerModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Assign Player to {selectedSubgroup.name}
              </h3>
              
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  const availablePlayers = getAvailablePlayersForCategory(selectedSubgroup.category);
                  if (availablePlayers.length === 0) {
                    return <p className="text-center text-gray-500">No available players in this category</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {availablePlayers.map(player => (
                        <div key={player._id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <span className="text-sm text-gray-900">{player.fullName}</span>
                          <button
                            onClick={() => {
                              handleAssignPlayer(selectedSubgroup, player._id);
                              setIsAssignPlayerModalOpen(false);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAssignPlayerModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Session Coaches Modal */}
      {isManageSessionCoachesOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsManageSessionCoachesOpen(false)}></div>
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Session Coaches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Coaches in Session ({session?.coaches?.length || 0})</h4>
                  <div className="max-h-72 overflow-y-auto border rounded">
                    {(session?.coaches || []).length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">No coaches assigned yet</p>
                    ) : (
                      (session?.coaches || []).map(c => (
                        <div key={c._id} className="flex items-center justify-between px-3 py-2 border-b text-sm">
                          <span>{c.fullName}</span>
                          <button onClick={() => handleRemoveCoachFromSession(c._id)} className="text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Available Coaches ({getCoachesNotInSession().length})</h4>
                  <div className="max-h-72 overflow-y-auto border rounded">
                    {getCoachesNotInSession().length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">All coaches are already in this session</p>
                    ) : (
                      getCoachesNotInSession().map(c => (
                        <div key={c._id} className="flex items-center justify-between px-3 py-2 border-b text-sm">
                          <span>{c.fullName}</span>
                          <button onClick={() => handleAddCoachToSession(c._id)} className="text-blue-600 hover:text-blue-700">Add</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageSessionCoachesOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Session Players Modal */}
      {isManageSessionPlayersOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsManageSessionPlayersOpen(false)}></div>
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Session Players</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Players in Session ({session?.players?.length || 0})</h4>
                  <div className="max-h-72 overflow-y-auto border rounded">
                    {(session?.players || []).length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">No players assigned yet</p>
                    ) : (
                      (session?.players || []).map(p => (
                        <div key={p._id} className="flex items-center justify-between px-3 py-2 border-b text-sm">
                          <span>{p.fullName}</span>
                          <button onClick={() => handleRemovePlayerFromSession(p._id)} className="text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Available Players ({getPlayersNotInSession().length})</h4>
                  <div className="max-h-72 overflow-y-auto border rounded">
                    {getPlayersNotInSession().length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">All players are already in this session</p>
                    ) : (
                      getPlayersNotInSession().map(p => (
                        <div key={p._id} className="flex items-center justify-between px-3 py-2 border-b text-sm">
                          <span>{p.fullName} <span className="text-xs text-gray-500">({p.group})</span></span>
                          <button onClick={() => handleAddPlayerToSession(p._id)} className="text-blue-600 hover:text-blue-700">Add</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageSessionPlayersOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Coach Modal */}
      {isAssignCoachModalOpen && selectedSubgroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsAssignCoachModalOpen(false)}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Assign Coach to {selectedSubgroup.name}
              </h3>
              
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  const availableCoaches = getAvailableCoachesForSubgroup(selectedSubgroup);
                  if (availableCoaches.length === 0) {
                    return <p className="text-center text-gray-500">No available coaches</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {availableCoaches.map(coach => (
                        <div key={coach._id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <div>
                            <span className="text-sm text-gray-900">{coach.fullName}</span>
                            {coach.specialization && (
                              <p className="text-xs text-gray-500">{coach.specialization}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              handleAssignCoach(selectedSubgroup, coach._id);
                              setIsAssignCoachModalOpen(false);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAssignCoachModalOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateSessionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsCreateSessionModalOpen(false)}></div>

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create New Session</h3>

              <form onSubmit={handleCreateSession}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={sessionForm.name}
                      onChange={handleSessionFormChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="e.g., Season 2025/2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={sessionForm.startDate}
                      onChange={handleSessionFormChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={sessionForm.endDate}
                      onChange={handleSessionFormChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type *</label>
                    <select
                      name="type"
                      value={sessionForm.type}
                      onChange={handleSessionFormChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="season">Season</option>
                      <option value="tournament">Tournament</option>
                      <option value="camp">Camp</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateSessionModalOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SessionManagementPage;
