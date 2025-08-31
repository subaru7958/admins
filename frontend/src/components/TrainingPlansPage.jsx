import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrainingSessions, deleteTrainingSession, updateTrainingSession } from '../services/trainingSessionService';
import { fetchSessions as fetchSeasons } from '../services/sessionService';
import { fetchEvents } from '../services/eventService';
import { fetchCoaches } from '../services/coachService';
import TrainingSessionCreateModal from './TrainingSessionCreateModal';
import TrainingSessionEditModal from './TrainingSessionEditModal';
import { getAttendanceStats } from '../services/attendanceService';

const GROUPS = ['Minimum', 'Cadet', 'Junior', 'Senior'];

function TrainingPlansPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assigningCoachesSession, setAssigningCoachesSession] = useState(null);
  const [isAssignCoachesModalOpen, setIsAssignCoachesModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay(); // 0 Sun..6 Sat
    // Compute Monday start (if Sunday, go back 6 days)
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0,0,0,0);
    return monday;
  });
  const [groupFilter, setGroupFilter] = useState('');
  const [weekEvents, setWeekEvents] = useState([]);
  const [sessionAttendance, setSessionAttendance] = useState({}); // { sessionId: { present: 0, absent: 0, late: 0 } }
  const [coaches, setCoaches] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [selectedCoaches, setSelectedCoaches] = useState([]);



  const load = async (date = selectedDate) => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const teamId = localStorage.getItem('teamId');
      const seasons = teamId ? await fetchSeasons(teamId) : [];
      const arrays = await Promise.all((seasons || []).map(s => fetchTrainingSessions(s._id)));
      let list = arrays.flat();
      // Keep all sessions; filter by group at render time
      if (groupFilter) list = list.filter(s => s.group === groupFilter);
      setSessions(list);

      // Load attendance statistics for all sessions
      await loadAttendanceStats(list);

      // Load coaches for assignment
      try {
        const coachesList = await fetchCoaches();
        setCoaches(coachesList || []);
      } catch (e) {
        console.error('Failed to load coaches:', e);
        setCoaches([]);
      }

      // Load subgroups for display
      try {
        const subgroupsList = await fetchSubgroupsForDisplay();
        setSubgroups(subgroupsList || []);
      } catch (e) {
        console.error('Failed to load subgroups:', e);
        setSubgroups([]);
      }

      // Load events for the visible week
      const startIso = new Date(weekStart).toISOString().split('T')[0];
      const end = new Date(weekStart); end.setDate(weekStart.getDate() + 5);
      const endIso = end.toISOString().split('T')[0];
      try {
        const evs = await fetchEvents({ startDate: startIso, endDate: endIso });
        setWeekEvents(evs || []);
      } catch (e) {
        setWeekEvents([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load training sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceStats = async (sessionsList) => {
    const attendanceStats = {};
    
    try {
      await Promise.all(
        sessionsList.map(async (session) => {
          try {
            const data = await getAttendanceStats(session._id);
            attendanceStats[session._id] = data?.stats || { present: 0, absent: 0, late: 0, total: 0 };
          } catch (error) {
            console.error(`Error loading attendance stats for session ${session._id}:`, error);
          }
        })
      );

      setSessionAttendance(attendanceStats);
    } catch (error) {
      console.error('Error loading attendance statistics:', error);
    }
  };

  useEffect(() => {
    load();
  }, [selectedDate, groupFilter, weekStart]);

  const weekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) { // Sunday..Saturday
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const label = d.toLocaleDateString(undefined, { weekday: 'long' });
      days.push({ date: d, label });
    }
    return days;
  };

  const weekRangeLabel = () => {
    const start = weekStart;
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
  };

  const goPrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() - 7); return d; });
  const goNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() + 7); return d; });

  const onDelete = async (sessionId) => {
    if (!window.confirm('Delete this training session?')) return;
    try {
      await deleteTrainingSession(sessionId);
      setMessage('Training session deleted successfully');
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete training session');
    }
  };

  const handleAssignCoaches = async () => {
    if (!assigningCoachesSession || selectedCoaches.length === 0) return;

    try {
      // Get current coaches and add selected ones
      const currentCoaches = assigningCoachesSession.coaches || [];
      const newCoaches = selectedCoaches.map(coachId => {
        const coach = coaches.find(c => c._id === coachId);
        return coach ? { _id: coach._id, fullName: coach.fullName } : { _id: coachId, fullName: 'Unknown Coach' };
      });

      // Combine existing and new coaches
      const updatedCoaches = [...currentCoaches, ...newCoaches];

      // Update the session with the new coaches array
      await updateTrainingSession(assigningCoachesSession._id, {
        coaches: updatedCoaches
      });

      setMessage(`${selectedCoaches.length} coach(es) assigned successfully`);
      setIsAssignCoachesModalOpen(false);
      setAssigningCoachesSession(null);
      setSelectedCoaches([]);
      load(); // Refresh the data
    } catch (err) {
      setError(err.message || 'Failed to assign coaches');
    }
  };

  const handleCoachSelection = (coachId) => {
    setSelectedCoaches(prev =>
      prev.includes(coachId)
        ? prev.filter(id => id !== coachId)
        : [...prev, coachId]
    );
  };

  // Fetch all subgroups for the team (across all sessions)
  const fetchSubgroupsForDisplay = async () => {
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

  // Get subgroup display name (returns the name directly)
  const getSubgroupDisplayName = (subgroupId) => {
    if (!subgroupId) return '';

    const subgroup = subgroups.find(sg => sg._id === subgroupId);
    if (!subgroup) return '';

    return subgroup.name; // This is already in format like "Senior 1"
  };



  // Group sessions by time slots (30-minute intervals)
  const groupedSessions = useMemo(() => {
    const groups = {};
    
    // Create time slots from 6:00 to 22:00 in 30-minute intervals
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        groups[timeKey] = [];
      }
    }
    
    // Assign sessions to time slots
    sessions.forEach(session => {
      const startTime = session.startTime;
      if (groups[startTime]) {
        groups[startTime].push(session);
      }
    });
    
    return groups;
  }, [sessions]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-sm rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 transition-colors"
              title="Go back"
            >
              ← Back
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Training Plans</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Groups</option>
              {GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <button
              onClick={load}
              className="text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-sm rounded-md bg-blue-600 dark:bg-blue-700 text-white px-3 py-2 hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
              title="Add Training Session"
            >
              + Add Session
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-3 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-2 text-sm">
            {message}
          </div>
        )}
        {isLoading ? (
          <div className="text-gray-600 dark:text-gray-300">Loading training sessions…</div>
        ) : error ? (
          <div className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-3 text-sm">
            {error}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Week: {weekRangeLabel()}</div>
              <div className="flex items-center gap-2">
                <button onClick={goPrevWeek} className="px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">← Prev</button>
                <button onClick={goNextWeek} className="px-2 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Next →</button>
              </div>
            </div>
            <div className="p-2 divide-y divide-gray-100 dark:divide-gray-700 transition-colors">
              {weekDays().map(({ date, label }) => (
                <div key={label} className="py-2">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div className="mt-1 space-y-2">
                    {/* Events badge for the day */}
                    {weekEvents.filter(ev => {
                      const d = new Date(ev.startDate);
                      const lbl = d.toLocaleDateString(undefined, { weekday: 'long' });
                      return lbl === label;
                    }).map(ev => (
                                             <div key={ev._id} className={`px-2 py-1 rounded text-xs inline-flex items-center gap-2 border transition-colors ${
                         ev.eventType?.toLowerCase() === 'match' 
                           ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600 hover:bg-red-300 dark:hover:bg-red-900/50' 
                           : 'bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-600 hover:bg-purple-300 dark:hover:bg-purple-900/50'
                       }`}>
                        <span className="font-medium">{ev.eventType?.toUpperCase() || 'EVENT'}</span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                    {sessions
                      .filter(s => s.dayOfWeek === label && (!groupFilter || s.group === groupFilter))
                      .sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''))
                      .map(session => (
                                                 <div key={session._id} className={`p-3 rounded-md border text-sm shadow-sm hover:shadow transition-colors ${
                           session.group === 'Minimum' ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/40' :
                           session.group === 'Cadet' ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 hover:bg-indigo-200 dark:hover:bg-indigo-900/40' :
                           session.group === 'Junior' ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 hover:bg-amber-200 dark:hover:bg-amber-900/40' :
                           session.group === 'Poussin' ? 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-600 hover:bg-pink-200 dark:hover:bg-pink-900/40' :
                           session.group === 'Ecole' ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700' :
                           'bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-600 hover:bg-sky-200 dark:hover:bg-sky-900/40'
                         }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{session.title}</span>
                                                                 {session.isWeekly && (
                                   <span className="px-1.5 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-600 text-[11px] transition-colors">Weekly</span>
                                 )}
                              </div>
                              <div className="mt-0.5 text-gray-700 dark:text-gray-300">
                                <div>{session.startTime} - {session.endTime} • {session.group}</div>
                                {session.subgroup && (
                                  <div className="text-xs mt-0.5">
                                    {getSubgroupDisplayName(session.subgroup) || `Subgroup: ${session.subgroup}`}
                                  </div>
                                )}
                              </div>
                              {session.coaches?.length ? (
                                <div className="text-gray-600 dark:text-gray-300 truncate text-xs">{session.coaches.map(c => c.fullName).join(', ')}</div>
                              ) : null}
                            </div>
                                                         <div className="flex-shrink-0 flex gap-1">
                               <button onClick={() => setEditingSession(session)} className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-gray-800/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs transition-colors hover:bg-blue-200 dark:hover:bg-gray-700/80">Edit</button>
                               <button onClick={() => onDelete(session._id)} className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-gray-800/70 dark:text-red-300 border border-red-300 dark:border-red-700 text-xs transition-colors hover:bg-red-200 dark:hover:bg-gray-700/80">Del</button>
                               <button onClick={() => { setAssigningCoachesSession(session); setIsAssignCoachesModalOpen(true); }} className="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-gray-800/70 dark:text-green-300 border border-green-300 dark:border-green-700 text-xs transition-colors hover:bg-green-200 dark:hover:bg-gray-700/80">Assign Coaches</button>
                             </div>
                          </div>
                          {session.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Coach Notes:</div>
                              <div className="text-xs text-gray-700 dark:text-gray-200 bg-blue-100 dark:bg-blue-900/30 p-2 rounded border-l-2 border-blue-300 dark:border-blue-500 transition-colors">
                                {session.notes}
                              </div>
                            </div>
                          )}
                           
                           {/* Attendance Summary */}
                           {sessionAttendance[session._id] && (
                             <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                               <div className="flex items-center gap-3 text-xs">
                                 <span className="text-gray-500 dark:text-gray-300">Attendance:</span>
                                 <div className="flex items-center gap-1">
                                   <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-xs transition-colors border border-green-300 dark:border-green-700">
                                     {sessionAttendance[session._id].present} Present
                                   </span>
                                   <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-xs transition-colors border border-yellow-300 dark:border-yellow-700">
                                     {sessionAttendance[session._id].late} Late
                                   </span>
                                   <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs transition-colors border border-red-300 dark:border-red-700">
                                     {sessionAttendance[session._id].absent} Absent
                                   </span>
                                 </div>
                                 {sessionAttendance[session._id].total > 0 && (
                                   <span className="text-gray-500 dark:text-gray-300">
                                     ({Math.round(((sessionAttendance[session._id].present + sessionAttendance[session._id].late) / sessionAttendance[session._id].total) * 100)}%)
                                   </span>
                                 )}
                               </div>
                             </div>
                           )}

                        </div>
                      ))}
                    {sessions.filter(s => s.dayOfWeek === label && (!groupFilter || s.group === groupFilter)).length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 px-2">No sessions</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <TrainingSessionCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          load();
        }}
        initialDate={selectedDate}
      />
      
      <TrainingSessionEditModal
        isOpen={!!editingSession}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSaved={() => {
          setEditingSession(null);
          load();
        }}
      />

      {/* Assign Coaches Modal */}
      {isAssignCoachesModalOpen && assigningCoachesSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsAssignCoachesModalOpen(false)}></div>

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Assign Coaches to {assigningCoachesSession.title}
              </h3>

              <div className="max-h-96 overflow-y-auto">
                {coaches.length === 0 ? (
                  <p className="text-center text-gray-500">No coaches available</p>
                ) : (
                  <div className="space-y-2">
                    {coaches.map(coach => {
                      const isSelected = selectedCoaches.includes(coach._id);
                      const isAlreadyAssigned = assigningCoachesSession.coaches?.some(c => c._id === coach._id || c === coach._id);

                      return (
                        <div key={coach._id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCoachSelection(coach._id)}
                              disabled={isAlreadyAssigned}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className={`text-sm ${isAlreadyAssigned ? 'text-gray-500' : 'text-gray-900'}`}>
                                {coach.fullName}
                              </span>
                              {coach.specialization && (
                                <p className="text-xs text-gray-500">{coach.specialization}</p>
                              )}
                              {isAlreadyAssigned && (
                                <span className="text-xs text-green-600 font-medium">(Already assigned)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignCoachesModalOpen(false);
                    setAssigningCoachesSession(null);
                    setSelectedCoaches([]);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignCoaches}
                  disabled={selectedCoaches.length === 0}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Coaches ({selectedCoaches.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TrainingPlansPage;