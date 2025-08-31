import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { getAttendanceForSession, markAttendance as markAttendanceService } from '../services/attendanceService';
import { updateTrainingSession } from '../services/trainingSessionService';
import { createAuthHeaders } from '../services/authUtils';

const CoachDashboard = () => {
  const navigate = useNavigate();
  const [coachData, setCoachData] = useState(null);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [error, setError] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('coachToken');
    const storedCoachData = localStorage.getItem('coachData');

    if (!token || !storedCoachData) {
      navigate('/');
      return;
    }

    try {
      const parsedData = JSON.parse(storedCoachData);
      setCoachData(parsedData);
      loadCoachData(token, parsedData);
    } catch (error) {
      console.error('Error parsing coach data:', error);
      navigate('/');
    }
  }, [navigate]);

  const loadCoachData = async (token, coach) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Coach data:', coach); // Debug log
      
      // First, get all sessions for the team
      const teamId = coach.team?._id;
      if (!teamId) {
        setError('No team assigned to coach');
        return;
      }

      // Get all sessions for the team
      const response = await fetch(`${API_BASE_URL}/api/sessions?teamId=${teamId}`, {
        method: 'GET',
        headers: createAuthHeaders(),
      });
      const sessionsData = await response.json();
      const sessions = sessionsData.data || [];
      
      console.log('Sessions found:', sessions); // Debug log

      // Get training sessions for each session
      let allTrainingSessions = [];
      for (const session of sessions) {
        try {
          const trainingSessionsResponse = await fetch(`${API_BASE_URL}/api/training-sessions/session/${session._id}`, {
            method: 'GET',
            headers: createAuthHeaders(),
          });
          const trainingSessionsData = await trainingSessionsResponse.json();
          const trainingSessions = trainingSessionsData.data || [];
          
          // Check if this coach is responsible for any subgroups in this session
          const subgroupsResponse = await fetch(`${API_BASE_URL}/api/subgroups/session/${session._id}?teamId=${teamId}`, {
            method: 'GET',
            headers: createAuthHeaders(),
          });
          const subgroupsData = await subgroupsResponse.json();
          const subgroups = subgroupsData.data || [];
          
          // Filter subgroups where this coach is assigned
          const coachSubgroups = subgroups.filter(sg => 
            sg.coaches && sg.coaches.some(c => 
              (typeof c === 'string' ? c : c._id) === coach._id
            )
          );

          if (coachSubgroups.length > 0) {
            const coachSubgroupIds = new Set(coachSubgroups.map(sg => sg._id?.toString() || sg.toString()));
            const relevantGroups = new Set(coachSubgroups.map(sg => sg.category));
            const relevantTrainingSessions = trainingSessions.filter(ts => {
              const tsSubgroupId = ts.subgroup && (typeof ts.subgroup === 'object') ? ts.subgroup._id : ts.subgroup;
              // If the training session is tied to a specific subgroup, require coach assignment to that subgroup
              if (tsSubgroupId) {
                return coachSubgroupIds.has(tsSubgroupId.toString());
              }
              // Otherwise, allow by group match
              return relevantGroups.has(ts.group);
            });
            allTrainingSessions.push(...relevantTrainingSessions);
          }
        } catch (error) {
          console.error(`Error fetching data for session ${session._id}:`, error);
        }
      }
      
      console.log('Training sessions for coach subgroups:', allTrainingSessions); // Debug log
       
      // Sort training sessions by day of week and time to find the nearest one
      const sortedTrainingSessions = [...allTrainingSessions].sort((a, b) => {
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const aDay = dayOrder.indexOf(a.dayOfWeek);
        const bDay = dayOrder.indexOf(b.dayOfWeek);
        
        if (aDay !== bDay) {
          // Get current day of week
          const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Calculate days until each session
          const daysUntilA = (aDay - currentDay + 7) % 7;
          const daysUntilB = (bDay - currentDay + 7) % 7;
          
          return daysUntilA - daysUntilB;
        }
        
        // If same day, sort by start time
        return a.startTime.localeCompare(b.startTime);
      });
      
      setTrainingSessions(sortedTrainingSessions);
      
      // Auto-select the nearest training session
      if (sortedTrainingSessions.length > 0) {
        const nearestSession = sortedTrainingSessions[0];
        setSelectedSession(nearestSession);
        await loadAttendanceData(nearestSession._id);
      }
    } catch (error) {
      setError('Failed to load data');
      console.error('Error loading coach data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttendanceData = async (sessionId) => {
    setIsLoadingAttendance(true);
    try {
      console.log('Loading attendance for session:', sessionId); // Debug log
      const data = await getAttendanceForSession(sessionId, coachData?._id);
      console.log('Attendance data received:', data); // Debug log
      setAttendanceData(data?.attendance || []);
      setSubgroups(data?.subgroups || []);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const markAttendance = async (playerId, status, notes = '') => {
    try {
      await markAttendanceService(selectedSession._id, playerId, status, coachData?._id);
      // Reload attendance data
      await loadAttendanceData(selectedSession._id);
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const handleSessionSelect = async (session) => {
    console.log('Selected training session:', session); // Debug log
    setSelectedSession(session);
    setSessionNotes(session?.notes || '');
    setAttendanceData([]); // Clear previous data
    setShowAttendanceModal(true); // Show attendance modal
    await loadAttendanceData(session._id);
  };

  const saveSessionNotes = async () => {
    if (!selectedSession) return;
    setIsSavingNotes(true);
    setNotesMessage('');
    try {
      await updateTrainingSession(selectedSession._id, { notes: sessionNotes });
      setNotesMessage('Notes saved');
    } catch (e) {
      setNotesMessage(e.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('coachToken');
    localStorage.removeItem('coachData');
    localStorage.removeItem('userType');
    navigate('/');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Coach Dashboard</h1>
              {coachData?.team?.logo && (
                <img
                  src={`${API_BASE_URL}${coachData.team.logo}`}
                  alt="Team Logo"
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {coachData?.fullName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coach Info Card */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Coach Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-gray-900">{coachData?.fullName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-gray-900">{coachData?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Specialization:</span>
                <p className="text-gray-900">{coachData?.specialization}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Team:</span>
                <p className="text-gray-900">{coachData?.team?.teamName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Session:</span>
                <p className="text-gray-900">{coachData?.session?.name}</p>
              </div>
            </div>
          </div>

          {/* Training Sessions */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Sessions</h2>
            {trainingSessions.length === 0 ? (
              <p className="text-gray-500">No training sessions assigned</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {trainingSessions.map((session, index) => (
                  <div
                    key={session._id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors relative ${
                      selectedSession?._id === session._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSessionSelect(session)}
                  >
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        Next
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{session.title}</h3>
                        <p className="text-xs text-gray-600">
                          {session.dayOfWeek} • {session.startTime} - {session.endTime}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedSession?._id === session._id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedSession?._id === session._id ? 'Active' : 'Click'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

                 {/* Attendance Modal */}
         {showAttendanceModal && selectedSession && (
           <div className="fixed inset-0 z-50 overflow-y-auto">
             <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
               {/* Background overlay */}
               <div 
                 className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
                 onClick={() => setShowAttendanceModal(false)}
               ></div>
               
               {/* Modal content */}
               <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                 {/* Header */}
                 <div className="flex items-center justify-between mb-6">
                   <div>
                     <h2 className="text-2xl font-bold text-gray-900">
                       Attendance - {selectedSession.title}
                     </h2>
                     <p className="text-sm text-gray-600 mt-1">
                       {selectedSession.dayOfWeek} • {selectedSession.startTime} - {selectedSession.endTime}
                     </p>
                   </div>
                   <button
                     onClick={() => setShowAttendanceModal(false)}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
                 
                 {/* Content */}
                 {isLoadingAttendance ? (
                   <div className="text-center py-12">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                     <p className="mt-4 text-gray-600">Loading attendance data...</p>
                   </div>
                 ) : attendanceData.length === 0 ? (
                   <div className="text-center py-12">
                     <div className="text-gray-400 mb-4">
                       <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                       </svg>
                     </div>
                     <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Found</h3>
                     <p className="text-gray-500">
                       No players are assigned to subgroups you're responsible for in this training session.
                     </p>
                   </div>
                 ) : (
                   <>
                     {/* Coach Notes */}
                     <div className="mb-4">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Coach Notes / Review</label>
                       <textarea
                         value={sessionNotes}
                         onChange={(e) => setSessionNotes(e.target.value)}
                         rows={3}
                         placeholder="Write your notes about this session (visible on Training Plans)."
                         className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                       <div className="mt-2 flex items-center gap-3">
                         <button
                           onClick={saveSessionNotes}
                           disabled={isSavingNotes}
                           className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
                         >
                           {isSavingNotes ? 'Saving…' : 'Save Notes'}
                         </button>
                         {notesMessage && (
                           <span className="text-sm text-gray-600">{notesMessage}</span>
                         )}
                       </div>
                     </div>
                     {/* Subgroups Info */}
                     {subgroups.length > 0 && (
                       <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                         <h3 className="font-semibold text-blue-900 mb-2">Your Subgroups:</h3>
                         <div className="flex flex-wrap gap-2">
                           {subgroups.map(subgroup => (
                             <span key={subgroup._id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                               {subgroup.name} ({subgroup.playerCount} players)
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     <div className="max-h-96 overflow-y-auto">
                       <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50 sticky top-0">
                           <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Player
                             </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Group
                             </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Status
                             </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Actions
                             </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Time
                             </th>
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {attendanceData.map((item) => (
                             <tr key={item.player._id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex items-center">
                                   {item.player.photo && (
                                     <img
                                       src={`${API_BASE_URL}${item.player.photo}`}
                                       alt={item.player.fullName}
                                       className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                                     />
                                   )}
                                   <div className="ml-4">
                                     <div className="text-sm font-medium text-gray-900">
                                       {item.player.fullName}
                                     </div>
                                   </div>
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">{item.player.group}</div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 {item.status !== 'not_marked' ? (
                                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                     {item.status}
                                   </span>
                                 ) : (
                                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                     Not Marked
                                   </span>
                                 )}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex space-x-2">
                                   <button
                                     onClick={() => markAttendance(item.player._id, 'present')}
                                     className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                       item.status === 'present'
                                         ? 'bg-green-600 text-white'
                                         : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-300'
                                     }`}
                                   >
                                     Present
                                   </button>
                                   <button
                                     onClick={() => markAttendance(item.player._id, 'late')}
                                     className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                       item.status === 'late'
                                         ? 'bg-yellow-600 text-white'
                                         : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-300'
                                     }`}
                                   >
                                     Late
                                   </button>
                                   <button
                                     onClick={() => markAttendance(item.player._id, 'absent')}
                                     className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                       item.status === 'absent'
                                         ? 'bg-red-600 text-white'
                                         : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-300'
                                     }`}
                                   >
                                     Absent
                                   </button>
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                 {item.status !== 'not_marked' && item.markedAt ? (
                                   new Date(item.markedAt).toLocaleTimeString()
                                 ) : (
                                   '-'
                                 )}
                               </td>
                             </tr>
                           ))}
                           {/* Summary Row */}
                           <tr className="bg-gray-50 font-medium">
                             <td className="px-6 py-4 text-sm text-gray-900">
                               Total Players: {attendanceData.length}
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-900">
                               -
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-900">
                               <div className="flex space-x-3">
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                   {attendanceData.filter(item => item.status === 'present').length} Present
                                 </span>
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                   {attendanceData.filter(item => item.status === 'late').length} Late
                                 </span>
                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                   {attendanceData.filter(item => item.status === 'absent').length} Absent
                                 </span>
                               </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-900">
                               -
                             </td>
                             <td className="px-6 py-4 text-sm text-gray-900">
                               -
                             </td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </>
                 )}
                 
                 {/* Footer */}
                 <div className="mt-6 flex justify-end">
                   <button
                     onClick={() => setShowAttendanceModal(false)}
                     className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                   >
                     Close
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default CoachDashboard;
