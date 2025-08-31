import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { getAttendanceForSession } from '../services/attendanceService';

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('playerToken');
    const storedPlayerData = localStorage.getItem('playerData');

    if (!token || !storedPlayerData) {
      navigate('/');
      return;
    }

    try {
      const parsedData = JSON.parse(storedPlayerData);
      setPlayerData(parsedData);
      loadPlayerData(token, parsedData);
    } catch (error) {
      console.error('Error parsing player data:', error);
      navigate('/');
    }
  }, [navigate]);

  const loadPlayerData = async (token, player) => {
    setIsLoading(true);
    setError('');

    try {
      // Load payment schedule only if player has a session
      if (player.session?._id) {
        const paymentResponse = await fetch(
          `${API_BASE_URL}/api/payments/schedule?sessionId=${player.session._id}&subjectType=player&subjectId=${player._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          setPaymentSchedule(paymentData.data?.schedule || []);
        }
      } else {
        setPaymentSchedule([]);
      }

      // Load upcoming training sessions; if none returned, fallback to active team session
      const tryLoadSessions = async (sessionIdToUse) => {
        const sessionsResponse = await fetch(
          `${API_BASE_URL}/api/training-sessions/session/${sessionIdToUse}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          const allSessions = sessionsData.data || [];
          const subgroupId = (player.subgroup && typeof player.subgroup === 'object') ? player.subgroup._id : player.subgroup;
          const filteredSessions = allSessions.filter(s => {
            const sSubgroupId = (s.subgroup && typeof s.subgroup === 'object') ? s.subgroup._id : s.subgroup;
            const groupMatch = !player.group || s.group === player.group;
            // If player has a subgroup, match exact subgroup; otherwise accept any subgroup
            const subgroupMatch = !subgroupId || !sSubgroupId || sSubgroupId === subgroupId;
            return groupMatch && subgroupMatch;
          });
          
          // Sort training sessions by day of week and time to find the nearest one
          const sortedSessions = [...filteredSessions].sort((a, b) => {
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
          
          setUpcomingSessions(sortedSessions);
          
          // Load attendance data for each training session
          const attendancePromises = sortedSessions.map(async (session) => {
            try {
              const attendance = await getAttendanceForSession(session._id);
              return { sessionId: session._id, attendance };
            } catch (error) {
              console.error(`Error loading attendance for session ${session._id}:`, error);
              return { sessionId: session._id, attendance: null };
            }
          });
          
          const attendanceResults = await Promise.all(attendancePromises);
          const attendanceMap = {};
          attendanceResults.forEach(result => {
            if (result.attendance) {
              attendanceMap[result.sessionId] = result.attendance;
            }
          });
          setAttendanceData(attendanceMap);
        }
      };

      if (player.session?._id) {
        await tryLoadSessions(player.session._id);
        if (upcomingSessions.length === 0) {
          // Attempt to fallback to the latest team session
          const teamId = player.team?._id;
          if (teamId) {
            try {
              const sessionsListRes = await fetch(`${API_BASE_URL}/api/sessions?teamId=${teamId}`, {
                headers: { 'Content-Type': 'application/json' }
              });
              if (sessionsListRes.ok) {
                const sessionsListData = await sessionsListRes.json();
                const sessionsList = sessionsListData.data || [];
                // Pick the most recent session by endDate
                sessionsList.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
                if (sessionsList[0]?._id && sessionsList[0]._id !== player.session._id) {
                  await tryLoadSessions(sessionsList[0]._id);
                }
              }
            } catch (err) {
              console.error('Failed to fallback load sessions:', err);
            }
          }
        }
      }
    } catch (error) {
      setError('Failed to load data');
      console.error('Error loading player data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('playerToken');
    localStorage.removeItem('playerData');
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

  const formatTime = (timeString) => {
    return timeString;
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPlayerAttendanceStatus = (sessionId) => {
    const sessionAttendance = attendanceData[sessionId];
    if (!sessionAttendance || !sessionAttendance.attendance) return 'not_marked';
    
    const playerAttendance = sessionAttendance.attendance.find(
      item => item.player._id === playerData?._id
    );
    return playerAttendance ? playerAttendance.status : 'not_marked';
  };

  const groupSessionsByWeek = (sessions) => {
    const weeks = {};
    
    sessions.forEach(session => {
      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = dayOrder.indexOf(session.dayOfWeek);
      
      // Create a week key (you could also use actual dates if available)
      const weekKey = `Week ${Math.floor(dayIndex / 7) + 1}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(session);
    });
    
    return weeks;
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
              <h1 className="text-2xl font-bold text-gray-900">Player Dashboard</h1>
              {playerData?.team?.logo && (
                <img
                  src={`${API_BASE_URL}${playerData.team.logo}`}
                  alt="Team Logo"
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {playerData?.fullName}
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

        {/* Next Training Session - Prominent Display */}
        {upcomingSessions.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Next Training Session</h2>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{upcomingSessions[0].title}</h3>
                  <p className="text-blue-100">
                    {upcomingSessions[0].dayOfWeek} • {upcomingSessions[0].startTime} - {upcomingSessions[0].endTime}
                  </p>
                  {upcomingSessions[0].description && (
                    <p className="text-blue-100 text-sm">{upcomingSessions[0].description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Info Card */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Player Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-gray-900">{playerData?.fullName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-gray-900">{playerData?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Group:</span>
                <p className="text-gray-900">{playerData?.group}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Team:</span>
                <p className="text-gray-900">{playerData?.team?.teamName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Session:</span>
                <p className="text-gray-900">{playerData?.session?.name}</p>
              </div>
            </div>
          </div>

          {/* Training Sessions by Week */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Training Sessions by Week</h2>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Present</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">Late</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">Absent</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Not Marked</span>
                </div>
              </div>
            </div>
            
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500">No training sessions available</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-6">
                {Object.entries(groupSessionsByWeek(upcomingSessions)).map(([weekKey, weekSessions]) => (
                  <div key={weekKey} className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {weekKey}
                    </h3>
                    <div className="space-y-2">
                      {weekSessions.map((session, index) => {
                        const attendanceStatus = getPlayerAttendanceStatus(session._id);
                        const isNextSession = upcomingSessions.indexOf(session) === 0;
                        
                        return (
                          <div 
                            key={session._id} 
                            className={`border rounded-lg p-3 transition-colors relative ${
                              isNextSession 
                                ? 'border-green-500 bg-green-50' 
                                : getAttendanceStatusColor(attendanceStatus).replace('bg-', 'border-').replace(' text-', ' bg-').replace(' border-', ' text-')
                            }`}
                          >
                            {isNextSession && (
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                Next
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900 text-sm truncate">{session.title}</h4>
                                  <span className={`text-xs px-2 py-1 rounded-full ${getAttendanceStatusColor(attendanceStatus)}`}>
                                    {attendanceStatus === 'not_marked' ? 'Not Marked' : attendanceStatus}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {session.dayOfWeek} • {session.startTime} - {session.endTime}
                                </p>
                                {session.description && (
                                  <p className="text-xs text-gray-500 mt-1 truncate">{session.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  attendanceStatus === 'present' ? 'bg-green-500' :
                                  attendanceStatus === 'late' ? 'bg-yellow-500' :
                                  attendanceStatus === 'absent' ? 'bg-red-500' :
                                  'bg-gray-400'
                                }`}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Schedule */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Payment Schedule</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Paid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Delayed</span>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {paymentSchedule.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Schedule</h3>
                <p className="text-gray-500">
                  Your payment schedule will appear here once it's set up by the admin.
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paymentSchedule[0]?.rows?.map((payment, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-4 transition-colors ${
                        payment.status === 'paid' ? 'bg-green-50 border-green-200' :
                        payment.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                        payment.status === 'delayed' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {new Date(payment.year, payment.month - 1, 1).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {payment.amount || 0} DT
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {payment.status === 'paid' ? 'Payment completed' :
                           payment.status === 'pending' ? 'Payment due' :
                           payment.status === 'delayed' ? 'Payment overdue' :
                           'No payment info'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-semibold">
                        {paymentSchedule[0]?.rows?.reduce((sum, payment) => sum + (payment.amount || 0), 0)} DT
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span className="font-semibold text-green-600">
                        {paymentSchedule[0]?.rows?.filter(p => p.status === 'paid').reduce((sum, payment) => sum + (payment.amount || 0), 0)} DT
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-yellow-600">
                        {paymentSchedule[0]?.rows?.filter(p => p.status === 'pending').reduce((sum, payment) => sum + (payment.amount || 0), 0)} DT
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
