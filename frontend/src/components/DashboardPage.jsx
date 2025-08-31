import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { logout } from '../services/authService';
import PlayersCreateModal from './PlayersCreateModal';
import CoachCreateModal from './CoachCreateModal';
import { fetchPlayers } from '../services/playerService';
import { fetchCoaches } from '../services/coachService';
import { fetchTrainingSessions } from '../services/trainingSessionService';
import { fetchSessions as fetchSeasons } from '../services/sessionService';
import { fetchEvents } from '../services/eventService';
import { getPaymentSchedule as getPaymentScheduleApi } from '../services/paymentService';

function DashboardPage() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState(localStorage.getItem('teamName') || '');
  const [teamLogo, setTeamLogo] = useState(localStorage.getItem('teamLogo') || '');
  const [teamDiscipline, setTeamDiscipline] = useState(localStorage.getItem('teamDiscipline') || '');
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!teamName);
  const [dashboardData, setDashboardData] = useState({
    players: [],
    coaches: [],
    trainingSessions: [],
    events: []
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [avgAgesByGroup, setAvgAgesByGroup] = useState({ Minimum: 0, Cadet: 0, Junior: 0, Senior: 0 });
  const [paymentsByMonth, setPaymentsByMonth] = useState([]);

  const getToken = () =>
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // If we don't have teamName cached, optionally fetch it in background.
    if (!teamName) {
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          if (res.ok) {
            const parsed = await res.json();
            const payload = parsed?.data || parsed;
            const name = payload?.teamName || payload?.team?.teamName || '';
            const logo = payload?.team?.logo || payload?.logo || '';
            if (name) {
              localStorage.setItem('teamName', name);
              setTeamName(name);
            }
            if (logo) {
              localStorage.setItem('teamLogo', logo);
              setTeamLogo(logo);
            }
          }
        } catch {}
        setIsLoading(false);
      })();
      return () => controller.abort();
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  // Live-update header on team settings change
  useEffect(() => {
    const handler = (e) => {
      const tn = e?.detail?.teamName;
      const tl = e?.detail?.teamLogo;
      if (typeof tn === 'string') setTeamName(tn);
      if (typeof tl === 'string') setTeamLogo(tl);
    };
    window.addEventListener('sm-team-updated', handler);
    return () => window.removeEventListener('sm-team-updated', handler);
  }, []);

  // Load dashboard data
  const loadDashboardData = async () => {
    setDataLoading(true);
    setDataError('');
    
    try {
      console.log('Starting to load dashboard data...');
      
      // Fetch data individually to handle failures gracefully
      let players = [];
      let coaches = [];
      let sessions = [];
      let events = [];
      
      try {
        players = await fetchPlayers();
        console.log('Players loaded:', players?.length || 0);
      } catch (err) {
        console.error('Failed to load players:', err);
      }
      
      try {
        coaches = await fetchCoaches();
        console.log('Coaches loaded:', coaches?.length || 0);
      } catch (err) {
        console.error('Failed to load coaches:', err);
      }
      
      try {
        const teamId = localStorage.getItem('teamId');
        const allSeasons = teamId ? await fetchSeasons(teamId) : [];
        const allSessionsArrays = await Promise.all(
          (allSeasons || []).map(s => fetchTrainingSessions(s._id))
        );
        const allTrainingSessions = allSessionsArrays.flat();
        const today = new Date();
        const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });
        sessions = allTrainingSessions.filter(ts => ts.dayOfWeek === todayDay);
        console.log('Sessions loaded:', sessions?.length || 0);
      } catch (err) {
        console.error('Failed to load training sessions:', err);
      }
      
      try {
        events = await fetchEvents({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
        });
        console.log('Events loaded:', events?.length || 0);
      } catch (err) {
        console.error('Failed to load events:', err);
      }
      
      console.log('Dashboard data loaded:', {
        players: players?.length || 0,
        coaches: coaches?.length || 0,
        sessions: sessions?.length || 0,
        events: events?.length || 0
      });
      
      setDashboardData({
        players: players || [],
        coaches: coaches || [],
        trainingSessions: sessions || [],
        events: events || []
      });

      // Compute average ages by group
      const byGroup = { Minimum: [], Cadet: [], Junior: [], Senior: [] };
      (players || []).forEach(p => {
        if (!p.dateOfBirth) return;
        const dob = new Date(p.dateOfBirth);
        const now = new Date();
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        if (Number.isFinite(age) && age >= 0 && age <= 100) {
          (byGroup[p.group] || byGroup.Minimum).push(age);
        }
      });
      const avgs = Object.fromEntries(
        Object.entries(byGroup).map(([g, arr]) => [g, arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0])
      );
      setAvgAgesByGroup(avgs);

      // Payments summary per month (players only)
      try {
        const payments = await getPaymentScheduleApi({ sessionId: null, subjectType: 'player' });
        const months = (payments.months || []).slice(0, 6);
        const schedule = payments.schedule || [];
        const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
        const expectedByMonth = {};
        const delayedRatioByMonth = {};
        months.forEach(({ year, month }) => {
          const key = monthKey(year, month);
          let delayed = 0;
          let total = 0;
          let expected = 0;
          schedule.forEach(row => {
            const base = Number(row?.subject?.baseAmount || 0);
            expected += base;
            const cell = (row.rows || []).find(r => r.year === year && r.month === month);
            if (cell) {
              total += 1;
              if (cell.status === 'delayed') delayed += 1;
            }
          });
          expectedByMonth[key] = expected;
          delayedRatioByMonth[key] = total > 0 ? delayed / total : 0;
        });
        const summarized = months.map(({ year, month }) => ({
          year,
          month,
          expectedTotal: expectedByMonth[monthKey(year, month)] || 0,
          delayedPct: delayedRatioByMonth[monthKey(year, month)] || 0,
        }));
        setPaymentsByMonth(summarized);
      } catch (e) {
        console.warn('Failed to load payment schedule for dashboard:', e?.message);
        setPaymentsByMonth([]);
      }
    } catch (err) {
      setDataError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadDashboardData();
    }
  }, [isLoading]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const quickLinks = [
    { label: 'Players', to: '/dashboard/players' },
    { label: 'Coaches', to: '/dashboard/coaches' },
    { label: 'Training Plans', to: '/dashboard/training-plans' },
    { label: 'Events', to: '/dashboard/events' },
  ];

  // Group players by category for chart
  const getPlayerGroupCounts = () => {
    const groups = { Minimum: 0, Cadet: 0, Junior: 0, Senior: 0 };
    dashboardData.players.forEach(player => {
      if (groups.hasOwnProperty(player.group)) {
        groups[player.group]++;
      }
    });
    return groups;
  };

  const playerGroups = getPlayerGroupCounts();

  // Debug: Log current dashboard data
  console.log('Current dashboard data state:', {
    players: dashboardData.players?.length || 0,
    coaches: dashboardData.coaches?.length || 0,
    sessions: dashboardData.trainingSessions?.length || 0,
    events: dashboardData.events?.length || 0
  });

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    return dashboardData.events
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5); // Limit to 5 events
  };

  // Get today's training sessions
  const getTodaysSessions = () => {
    return dashboardData.trainingSessions
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5); // Limit to 5 sessions
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          {teamLogo ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-gray-200 flex-shrink-0">
              <img
                src={teamLogo.startsWith('http') ? teamLogo : `${API_BASE_URL}${teamLogo}`}
                alt={`${teamName} logo`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = teamLogo; }}
              />
            </div>
          ) : null}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, {teamName}</h1>
            <p className="text-gray-600 mt-1">Manage your team resources from your dashboard.</p>
            {teamDiscipline && (
              <p className="text-xs text-gray-500 mt-1">Discipline: {teamDiscipline}</p>
            )}
          </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              disabled={dataLoading}
              className="inline-flex justify-center items-center rounded-md bg-gray-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 disabled:opacity-50"
              title="Refresh dashboard data"
            >
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  handleLogout();
                }
              }}
              className="inline-flex justify-center items-center rounded-md bg-red-600 px-4 py-2 text-white font-medium shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Players card with floating + button */}
          <div className="relative h-28 rounded-xl bg-white shadow-sm border border-gray-200 px-4 py-3 hover:shadow-md">
            <button
              onClick={() => navigate('/dashboard/players')}
              className="absolute inset-0 w-full h-full text-left focus:outline-none"
              aria-label="Open players"
            />
            <div className="text-lg font-semibold text-gray-900">Players</div>
            <div className="text-sm text-gray-500 mt-1">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
              ) : (
                `${dashboardData.players.length} players`
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayerModalOpen(true);
              }}
              className="absolute bottom-3 right-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Add player"
            >
              +
            </button>
          </div>

          {/* Coaches card with floating + button */}
          <div className="relative h-28 rounded-xl bg-white shadow-sm border border-gray-200 px-4 py-3 hover:shadow-md">
            <button
              onClick={() => navigate('/dashboard/coaches')}
              className="absolute inset-0 w-full h-full text-left focus:outline-none"
              aria-label="Open coaches"
            />
            <div className="text-lg font-semibold text-gray-900">Coaches</div>
            <div className="text-sm text-gray-500 mt-1">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
              ) : (
                `${dashboardData.coaches.length} coaches`
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCoachModalOpen(true);
              }}
              className="absolute bottom-3 right-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Add coach"
            >
              +
            </button>
          </div>

          {/* Training Plans card */}
          <button
            onClick={() => navigate('/dashboard/training-plans')}
            className="h-28 rounded-xl bg-white shadow-sm border border-gray-200 px-4 py-3 text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <div className="text-lg font-semibold text-gray-900">Training Plans</div>
            <div className="text-sm text-gray-500 mt-1">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
              ) : (
                `${dashboardData.trainingSessions.length} sessions today`
              )}
            </div>
          </button>

          {/* Events card */}
          <button
            onClick={() => navigate('/dashboard/events')}
            className="h-28 rounded-xl bg-white shadow-sm border border-gray-200 px-4 py-3 text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <div className="text-lg font-semibold text-gray-900">Events</div>
            <div className="text-sm text-gray-500 mt-1">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-500"></div>
              ) : (
                `${dashboardData.events.length} events this week`
              )}
            </div>
          </button>
        </section>

        {/* Dashboard data section */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Players by Group - Dynamic Chart */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Players by Group</h3>
              <span className="text-xs text-gray-500">Live data</span>
            </div>
            <div className="h-40 flex items-end gap-3">
              {Object.entries(playerGroups).map(([group, count]) => {
                const maxHeight = 60; // Max bar height in pixels
                const barHeight = count > 0 ? Math.max(10, (count / Math.max(...Object.values(playerGroups))) * maxHeight) : 0;
                const colors = {
                  'Minimum': 'bg-blue-500',
                  'Cadet': 'bg-green-500',
                  'Junior': 'bg-yellow-500',
                  'Senior': 'bg-purple-500'
                };
                
                return (
                  <div key={group} className="flex-1 flex flex-col items-center justify-end">
                    <div 
                      className={`${colors[group]} rounded-t`} 
                      style={{ height: `${barHeight}px`, width: '100%', maxWidth: '32px' }} 
                    />
                    <div className="mt-1 text-xs text-gray-600">{group}</div>
                    <div className="text-xs font-medium text-gray-900">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Average Age by Group */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Average Age by Group</h3>
              <span className="text-xs text-gray-500">Players</span>
            </div>
            <div className="space-y-2">
              {['Minimum','Cadet','Junior','Senior'].map(group => {
                const age = avgAgesByGroup[group] || 0;
                const pct = Math.min(1, age / 40); // scale up to 40 years max
                const color = group === 'Minimum' ? 'bg-blue-500' : group === 'Cadet' ? 'bg-green-500' : group === 'Junior' ? 'bg-yellow-500' : 'bg-purple-500';
                return (
                  <div key={group} className="text-sm">
                    <div className="flex justify-between text-gray-700 mb-1">
                      <span>{group}</span>
                      <span className="font-medium">{age ? age.toFixed(1) : '0.0'} yrs</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded">
                      <div className={`${color} h-2 rounded`} style={{ width: `${pct * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payments: Expected and Delayed % per Month */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Payments (Expected & Delayed%)</h3>
              <span className="text-xs text-gray-500">Players</span>
            </div>
            <div className="space-y-3">
              {paymentsByMonth.length === 0 ? (
                <div className="text-sm text-gray-500">No payment data</div>
              ) : (
                paymentsByMonth.map(({ year, month, expectedTotal, delayedPct }) => {
                  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'short' });
                  const delayedWidth = Math.round(delayedPct * 100);
                  const ontimeWidth = 100 - delayedWidth;
                  return (
                    <div key={`${year}-${month}`}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{monthLabel} {String(year).slice(-2)}</span>
                        <span className="font-medium">{expectedTotal.toFixed(2)} DT</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded overflow-hidden flex">
                        <div className="bg-orange-400 h-3" style={{ width: `${delayedWidth}%` }} title={`Delayed ${delayedWidth}%`} />
                        <div className="bg-emerald-400 h-3" style={{ width: `${ontimeWidth}%` }} title={`On-time/Pending ${ontimeWidth}%`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
              <span className="text-xs text-gray-500">Next 7 days</span>
            </div>
            <div className="h-40 overflow-y-auto">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : dataError ? (
                <div className="text-red-500 text-sm">{dataError}</div>
              ) : dashboardData.events.length === 0 ? (
                <div className="text-gray-500 text-sm flex items-center justify-center h-full">
                  No upcoming events
                </div>
              ) : (
                <ul className="space-y-2">
                  {getUpcomingEvents().map(event => {
                    const eventDate = new Date(event.startDate);
                    return (
                      <li key={event._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                        <div className="font-medium text-gray-900 truncate">{event.title}</div>
                        <div className="flex justify-between text-gray-500">
                          <span>{eventDate.toLocaleDateString()}</span>
                          <span>{event.eventType}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Today's Training Sessions */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Today's Sessions</h3>
              <span className="text-xs text-gray-500">Today</span>
            </div>
            <div className="h-40 overflow-y-auto">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {getTodaysSessions().length === 0 ? (
                    <div className="text-gray-500 text-sm flex items-center justify-center h-full">
                      No sessions today
                    </div>
                  ) : (
                    getTodaysSessions().map(session => (
                      <li key={session._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                        <div className="font-medium text-gray-900 truncate">{session.title}</div>
                        <div className="flex justify-between text-gray-500">
                          <span>{session.startTime} - {session.endTime}</span>
                          <span>{session.group}</span>
                        </div>
                        {session.location && (
                          <div className="text-xs text-gray-500 truncate">{session.location}</div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Stats summary section */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
              ) : (
                dashboardData.players.length
              )}
            </div>
            <div className="text-sm text-gray-600">Total Players</div>
          </div>
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
              ) : (
                dashboardData.coaches.length
              )}
            </div>
            <div className="text-sm text-gray-600">Total Coaches</div>
          </div>
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-yellow-600"></div>
              ) : (
                dashboardData.trainingSessions.length
              )}
            </div>
            <div className="text-sm text-gray-600">Sessions Today</div>
          </div>
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {dataLoading ? (
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600"></div>
              ) : (
                dashboardData.events.length
              )}
            </div>
            <div className="text-sm text-gray-600">Events This Week</div>
          </div>
        </section>

        <PlayersCreateModal
          isOpen={isPlayerModalOpen}
          onClose={() => setIsPlayerModalOpen(false)}
          onCreated={() => {
            // Refresh all dashboard data
            loadDashboardData();
            setIsPlayerModalOpen(false);
          }}
        />

        <CoachCreateModal
          isOpen={isCoachModalOpen}
          onClose={() => setIsCoachModalOpen(false)}
          onCreated={() => {
            // Refresh all dashboard data
            loadDashboardData();
            setIsCoachModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
