import React, { useState, useEffect } from 'react';
import { fetchTrainingSessionById, updateTrainingSession } from '../services/trainingSessionService';
import { fetchPlayers } from '../services/playerService';
import { fetchSessions } from '../services/sessionService';
import { API_BASE_URL } from '../config/config';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function TrainingSessionEditModal({ isOpen, session, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    group: '',
    subgroup: '',
    notes: '',
    isWeekly: false,
    dayOfWeek: 'Monday',
    isSpecialDate: false,
    session: '',
  });
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  // Load session data when modal opens
  useEffect(() => {
    if (isOpen && session) {
      setIsFetching(true);
      fetchTrainingSessionById(session._id)
        .then(data => {
          setFormData({
            title: data.title || '',
            description: data.description || '',
            date: data.date ? data.date.split('T')[0] : '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            location: data.location || '',
            group: data.group || '',
            subgroup: data.subgroup || '',
            notes: data.notes || '',
            isWeekly: !!data.isWeekly,
            dayOfWeek: data.dayOfWeek || 'Monday',
            isSpecialDate: !data.isWeekly && !data.dayOfWeek,
            session: data.session || '',
          });
        })
        .catch(err => {
          setError(err.message || 'Failed to load training session data');
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [isOpen, session]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPlayers();
      loadSessions();
    }
  }, [isOpen]);

  // Load subgroups when group changes
  useEffect(() => {
    if (formData.group && formData.session) {
      console.log('Loading subgroups for group:', formData.group, 'session:', formData.session);
      loadSubgroups();
    }
  }, [formData.group, formData.session]);

  const loadPlayers = async () => {
    try {
      const playersList = await fetchPlayers();
      setPlayers(playersList || []);
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const teamId = localStorage.getItem('teamId');
      if (!teamId) return;
      const sessionsList = await fetchSessions(teamId);
      setSessions(sessionsList || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadSubgroups = async () => {
    try {
      const teamId = localStorage.getItem('teamId');
      if (!teamId || !formData.session) return;
      
      console.log('Fetching subgroups for session:', formData.session);
      
      const res = await fetch(`${API_BASE_URL}/api/subgroups/session/${formData.session}?teamId=${teamId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch subgroups');
      }

      const data = await res.json();
      console.log('Subgroups response:', data);
      
      const categorySubgroups = data.data.filter(sg => sg.category === formData.group);
      console.log('Filtered subgroups for category:', formData.group, ':', categorySubgroups);
      
      setSubgroups(categorySubgroups || []);
    } catch (err) {
      console.error('Failed to load subgroups:', err);
      setSubgroups([]);
    }
  };

  // Get categories that have players
  const getCategoriesWithPlayers = () => {
    const categories = [...new Set(players.map(p => p.group))];
    return categories.filter(cat => cat && cat.trim() !== '');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.session) {
        throw new Error('Please select a season/session');
      }

      if (!formData.group) {
        throw new Error('Please select a group');
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        startTime: formData.startTime,
        endTime: formData.endTime,
        dayOfWeek: formData.isSpecialDate ? null : formData.dayOfWeek,
        location: formData.location,
        group: formData.group,
        subgroup: formData.subgroup || null,
        session: formData.session,
        notes: formData.notes,
        isWeekly: formData.isWeekly && !formData.isSpecialDate,
      };

      await updateTrainingSession(session._id, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update training session');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        group: '',
        subgroup: '',
        notes: '',
        isWeekly: false,
        dayOfWeek: 'Monday',
        isSpecialDate: false,
        session: '',
      });
      setError('');
      setSubgroups([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categoriesWithPlayers = getCategoriesWithPlayers();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Edit Training Session</h3>
          
          {error && (
            <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
              {error}
            </div>
          )}
          
          {isFetching ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading session data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Weekly and Special Date Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      id="edit-isWeekly"
                      type="checkbox"
                      name="isWeekly"
                      checked={!!formData.isWeekly && !formData.isSpecialDate}
                      onChange={handleChange}
                      disabled={formData.isSpecialDate}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="edit-isWeekly" className="text-sm font-medium text-blue-800">
                      Repeat weekly (same day/time for this group)
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <input
                      id="edit-isSpecialDate"
                      type="checkbox"
                      name="isSpecialDate"
                      checked={!!formData.isSpecialDate}
                      onChange={handleChange}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded"
                    />
                    <label htmlFor="edit-isSpecialDate" className="text-sm font-medium text-green-800">
                      Special date training (one-time session)
                    </label>
                  </div>
                </div>

                {/* Day of Week Selection - Only show if not special date */}
                {!formData.isSpecialDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Week *</label>
                    <select
                      name="dayOfWeek"
                      value={formData.dayOfWeek}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
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
                    rows="2"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Season/Session *</label>
                  <select
                    value={formData.session || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, session: e.target.value }))}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Select a session</option>
                    {sessions.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date and Day Selection under Season/Session
                    - Show when not weekly, OR when special date is selected (date-only)
                */}
                {(!formData.isWeekly || formData.isSpecialDate) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date *</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    
                    {!formData.isSpecialDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Day of Week *</label>
                        <select
                          name="dayOfWeek"
                          value={formData.dayOfWeek}
                          onChange={handleChange}
                          required
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group *</label>
                  <select
                    name="group"
                    value={formData.group}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Select a group</option>
                    {categoriesWithPlayers.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                  {categoriesWithPlayers.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">No groups with players available</p>
                  )}
                </div>
                
                {/* Subgroup Selection - Always show if group is selected and has subgroups */}
                {formData.group && subgroups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subgroup (Optional)</label>
                    <select
                      name="subgroup"
                      value={formData.subgroup}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="">All subgroups</option>
                      {subgroups.map(subgroup => (
                        <option key={subgroup._id} value={subgroup._id}>
                          {subgroup.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {subgroups.length} subgroup{subgroups.length !== 1 ? 's' : ''} available for {formData.group}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Session'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrainingSessionEditModal;