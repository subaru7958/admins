import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { fetchPlayers } from '../services/playerService';
import { fetchCoaches } from '../services/coachService';
import { fetchSessions } from '../services/sessionService';

function PaymentSchedulePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Load session data
  useEffect(() => {
    if (sessionId) {
      loadPaymentScheduleData();
    }
  }, [sessionId]);

  const loadPaymentScheduleData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const teamId = localStorage.getItem('teamId');
      if (!teamId) {
        throw new Error('Team ID not found');
      }

      // Load session, players, and coaches
      const [sessionsData, playersData, coachesData] = await Promise.all([
        fetchSessions(teamId),
        fetchPlayers(),
        fetchCoaches()
      ]);

      const currentSession = sessionsData.find(s => s._id === sessionId || s._id.toString() === sessionId);
      if (!currentSession) {
        throw new Error('Session not found');
      }

      // Filter players and coaches assigned to this session
      const sessionPlayers = playersData.filter(p =>
        (currentSession.players || []).some(sp => sp._id === p._id || sp === p._id)
      );
      const sessionCoaches = coachesData.filter(c =>
        (currentSession.coaches || []).some(sc => sc._id === c._id || sc === c._id)
      );

      setSession(currentSession);
      setPlayers(sessionPlayers || []);
      setCoaches(sessionCoaches || []);
    } catch (err) {
      setError(err.message || 'Failed to load payment schedule data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get months for session with status logic
  const getMonthsForSession = (session) => {
    const months = [];
    const startDate = new Date(session.startDate);
    const endDate = new Date(session.endDate);
    const today = new Date();
    today.setDate(1); // Set to first day of current month for comparison

    const current = new Date(startDate);
    while (current <= endDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Last day of month
      const isPast = monthEnd < today;

      months.push({
        key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        isPast,
        monthEnd
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  // Get status for a specific month (auto-delay past months)
  const getStatusForMonth = (month, currentStatus = 'pending') => {
    if (month.isPast && currentStatus === 'pending') {
      return 'delayed';
    }
    return currentStatus;
  };

  // Get color classes for status
  const getStatusColorClasses = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading payment schedule...</p>
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
                onClick={() => navigate('/dashboard/sessions')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Sessions
              </button>
            </div>
          ) : (
            <p className="text-red-600">Session not found</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/sessions')}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
            >
              ← Back to Sessions
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Payment Schedule: {session.name}
              </h1>
              <p className="text-sm text-gray-600">
                {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              alert('Payment status would be saved here');
            }}
            className="text-sm rounded-md bg-green-600 text-white px-4 py-2 hover:bg-green-700"
          >
            Save Changes
          </button>
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

        <div className="space-y-6">
          {/* Players Payment Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Players Payment Status</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    {getMonthsForSession(session).map(month => (
                      <th key={month.key} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${month.isPast ? 'text-red-600 bg-red-50' : 'text-gray-500'}`}>
                        {month.label}
                        {month.isPast && (
                          <div className="text-xs font-normal text-red-500 mt-1">
                            Past Due
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!players.length ? (
                    <tr>
                      <td colSpan={getMonthsForSession(session).length + 2} className="px-6 py-4 text-center text-gray-500">
                        No players assigned to this session
                      </td>
                    </tr>
                  ) : (
                    players.map(player => (
                      <tr key={player._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{player.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {player.group}
                          </span>
                        </td>
                        {getMonthsForSession(session).map(month => {
                          const status = getStatusForMonth(month, 'pending');
                          const colorClasses = getStatusColorClasses(status);
                          return (
                            <td key={month.key} className="px-4 py-4 whitespace-nowrap text-center">
                              <select
                                className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${colorClasses} ${month.isPast ? 'font-semibold' : ''}`}
                                defaultValue={status}
                                disabled={month.isPast && status === 'delayed'}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="delayed">Delayed</option>
                              </select>
                              {month.isPast && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Past due
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coaches Payment Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coaches Payment Status</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coach Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialization
                    </th>
                    {getMonthsForSession(session).map(month => (
                      <th key={month.key} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${month.isPast ? 'text-red-600 bg-red-50' : 'text-gray-500'}`}>
                        {month.label}
                        {month.isPast && (
                          <div className="text-xs font-normal text-red-500 mt-1">
                            Past Due
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!coaches.length ? (
                    <tr>
                      <td colSpan={getMonthsForSession(session).length + 2} className="px-6 py-4 text-center text-gray-500">
                        No coaches assigned to this session
                      </td>
                    </tr>
                  ) : (
                    coaches.map(coach => (
                      <tr key={coach._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{coach.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{coach.specialization || 'General'}</div>
                        </td>
                        {getMonthsForSession(session).map(month => {
                          const status = getStatusForMonth(month, 'pending');
                          const colorClasses = getStatusColorClasses(status);
                          return (
                            <td key={month.key} className="px-4 py-4 whitespace-nowrap text-center">
                              <select
                                className={`text-xs border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${colorClasses} ${month.isPast ? 'font-semibold' : ''}`}
                                defaultValue={status}
                                disabled={month.isPast && status === 'delayed'}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="delayed">Delayed</option>
                              </select>
                              {month.isPast && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Past due
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm text-gray-600">Total Players</div>
                <div className="text-2xl font-semibold text-blue-600">{players.length}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm text-gray-600">Total Coaches</div>
                <div className="text-2xl font-semibold text-green-600">{coaches.length}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm text-gray-600">Months to Track</div>
                <div className="text-2xl font-semibold text-purple-600">{getMonthsForSession(session).length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSchedulePage;