import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/config';
import { getPaymentSchedule as getPaymentScheduleApi, setPaymentStatus as setPaymentStatusApi } from '../services/paymentService';

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' }
];

const GROUPS = ['Minimum', 'Cadet', 'Junior', 'Senior'];

const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' }
];

function TrainingSchedulePage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isCreateModalOpen] = useState(false);
  const [isEditModalOpen] = useState(false);
  const [isAttendanceModalOpen] = useState(false);
  const [editingSession] = useState(null);
  const [attendanceSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData] = useState({});
  const [multiSlots, setMultiSlots] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  
  const [attendanceData] = useState({});
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(true);
  const [paymentMonths, setPaymentMonths] = useState([]);
  const [playerPaymentSchedule, setPlayerPaymentSchedule] = useState([]);
  const [coachPaymentSchedule, setCoachPaymentSchedule] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [playerGroupFilter, setPlayerGroupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState('default');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [selectedPaymentModal, setSelectedPaymentModal] = useState(null);

  const loadTrainingSessions = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const sessionRes = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!sessionRes.ok) {
        throw new Error('Failed to load session details');
      }
      
      const sessionData = await sessionRes.json();
      setSessionDetails(sessionData.data);
      
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to load training sessions');
      }
      
      const data = await res.json();
      setTrainingSessions(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load training sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlayersAndCoaches = async () => {};

  useEffect(() => {
    loadTrainingSessions();
    loadPlayersAndCoaches();
    loadPaymentSchedules();
  }, [sessionId]);

  const loadPaymentSchedules = async () => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const [playersData, coachesData] = await Promise.all([
        getPaymentScheduleApi({ sessionId, subjectType: 'player' }),
        getPaymentScheduleApi({ sessionId, subjectType: 'coach' }),
      ]);
      setPaymentMonths(playersData.months || []);
      setPlayerPaymentSchedule(playersData.schedule || []);
      setCoachPaymentSchedule(coachesData.schedule || []);
    } catch (err) {
      setPaymentsError(err.message || 'Failed to load payment schedules');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const cycleStatus = (current) => {
    const order = ['pending', 'delayed', 'paid'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  };

  const formatMonth = (m) => new Date(2000, m - 1, 1).toLocaleString(undefined, { month: 'short' });
  const filteredMonths = useMemo(() => {
    const now = new Date();
    const curr = { year: now.getFullYear(), month: now.getMonth() + 1 };
    const nextDate = new Date(curr.year, curr.month, 1);
    const next = { year: nextDate.getFullYear(), month: ((curr.month) % 12) + 1 };
    const set = new Set([`${curr.year}-${curr.month}`, `${next.year}-${next.month}`]);
    const addDelayed = (sched) => (sched || []).forEach(r => (r.rows || []).forEach(c => { if (c.status === 'delayed') set.add(`${c.year}-${c.month}`); }));
    addDelayed(playerPaymentSchedule);
    addDelayed(coachPaymentSchedule);
    return Array.from(set).map(k => ({ year: Number(k.split('-')[0]), month: Number(k.split('-')[1]) })).sort((a,b)=>(a.year-b.year)|| (a.month-b.month));
  }, [playerPaymentSchedule, coachPaymentSchedule]);

  const openPaymentModal = (type, data) => {
    setSelectedPaymentModal({ type, data });
  };

  const closePaymentModal = () => {
    setSelectedPaymentModal(null);
  };

  const isMonthPast = (year, month) => {
    const lastDay = new Date(year, month, 0);
    const today = new Date();
    lastDay.setHours(23,59,59,999);
    return lastDay < today;
  };

  const computeNextDueDate = (row) => {
    try {
      const monthsAsc = [...(paymentMonths || [])].sort((a, b) => (a.year - b.year) || (a.month - b.month));
      for (const { year, month } of monthsAsc) {
        const cell = (row.rows || []).find(r => r.year === year && r.month === month);
        if (cell && cell.status === 'pending' && !isMonthPast(year, month)) {
          return new Date(year, month - 1, 1);
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const matchesSearch = (row) => {
    const q = (paymentSearch || '').trim().toLowerCase();
    if (!q) return true;
    const name = String(row?.subject?.fullName || '').toLowerCase();
    const group = String(row?.subject?.group || '').toLowerCase();
    const spec = String(row?.subject?.specialization || '').toLowerCase();
    const id = String(row?.subject?._id || '').toLowerCase();
    return name.includes(q) || group.includes(q) || spec.includes(q) || id.includes(q);
  };

  const matchesPlayerGroup = (row) => {
    if (playerGroupFilter === 'All') return true;
    return String(row?.subject?.group || '') === playerGroupFilter;
  };

  const matchesStatus = (row) => {
    switch (statusFilter) {
      case 'delayed':
        return (row.rows || []).some(c => c.status === 'delayed');
      case 'pending':
        return (row.rows || []).some(c => c.status === 'pending' && !isMonthPast(c.year, c.month));
      case 'paid':
        return (row.rows || []).some(c => c.status === 'paid');
      case 'upcoming':
        return computeNextDueDate(row) !== null;
      case 'all':
      default:
        return true;
    }
  };

  const sortRows = (rows) => {
    if (sortMode !== 'nearestDue') return rows;
    return [...rows].sort((a, b) => {
      const da = computeNextDueDate(a);
      const db = computeNextDueDate(b);
      if (da && db) return da - db;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
  };

  const visiblePlayerPaymentSchedule = useMemo(() => {
    const filtered = (playerPaymentSchedule || [])
      .filter(row => matchesSearch(row) && matchesPlayerGroup(row) && matchesStatus(row));
    return sortRows(filtered);
  }, [playerPaymentSchedule, paymentSearch, playerGroupFilter, statusFilter, sortMode, paymentMonths]);

  const visibleCoachPaymentSchedule = useMemo(() => {
    const filtered = (coachPaymentSchedule || [])
      .filter(row => matchesSearch(row) && matchesStatus(row));
    return sortRows(filtered);
  }, [coachPaymentSchedule, paymentSearch, statusFilter, sortMode, paymentMonths]);

  const onTogglePaymentStatus = async ({ subjectId, subjectType, year, month, currentStatus }) => {
    try {
      const next = cycleStatus(currentStatus || 'unpaid');
      await setPaymentStatusApi({ sessionId, subjectId, subjectType, year, month, status: next });
      await loadPaymentSchedules();
      setMessage('Payment status updated');
    } catch (err) {
      setError(err.message || 'Failed to update payment status');
    }
  };

  const handleChange = () => {};

  const handleSubmit = async () => {};

  const handleDelete = async (trainingSessionId) => {
    if (!window.confirm('Are you sure you want to delete this training session?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete training session');
      }

      setMessage('Training session deleted successfully');
      loadTrainingSessions();
    } catch (err) {
      setError(err.message || 'Failed to delete training session');
    }
  };

  const handleManageAttendance = async () => {};

  const handleAddPlayerToTrainingSession = async (trainingSessionId, playerId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/players/${playerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add player to training session');
      }

      setMessage('Player added to training session successfully');
      loadTrainingSessions();
    } catch (err) {
      setError(err.message || 'Failed to add player to training session');
    }
  };

  const handleRemovePlayerFromTrainingSession = async (trainingSessionId, playerId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/players/${playerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove player from training session');
      }

      setMessage('Player removed from training session successfully');
      loadTrainingSessions();
    } catch (err) {
      setError(err.message || 'Failed to remove player from training session');
    }
  };

  const handleAddCoachToTrainingSession = async (trainingSessionId, coachId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/coaches/${coachId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add coach to training session');
      }

      setMessage('Coach added to training session successfully');
      loadTrainingSessions();
    } catch (err) {
      setError(err.message || 'Failed to add coach to training session');
    }
  };

  const handleRemoveCoachFromTrainingSession = async (trainingSessionId, coachId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/training-sessions/${trainingSessionId}/coaches/${coachId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove coach from training session');
      }

      setMessage('Coach removed from training session successfully');
      loadTrainingSessions();
    } catch (err) {
      setError(err.message || 'Failed to remove coach from training session');
    }
  };

  const filteredSessions = trainingSessions.filter(session => {
    return session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           session.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Schedule</h1>
              {sessionDetails && (
                <p className="text-sm text-gray-600">{sessionDetails.name}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, group…"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {paymentSearch && (
                <button
                  onClick={() => setPaymentSearch('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={playerGroupFilter}
              onChange={(e) => setPlayerGroupFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter players by group"
            >
              <option value="All">All Groups</option>
              {GROUPS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter by payment status"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming (nearest due)</option>
              <option value="delayed">Delayed</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Sort order"
            >
              <option value="default">Default order</option>
              <option value="nearestDue">Sort by nearest due</option>
            </select>

            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Filter by payment type"
            >
              <option value="all">All Payments</option>
              <option value="players">Players Only</option>
              <option value="coaches">Coaches Only</option>
            </select>

            {(playerGroupFilter !== 'All' || statusFilter !== 'all' || paymentSearch || sortMode !== 'default' || paymentTypeFilter !== 'all') && (
              <button
                onClick={() => { setPaymentSearch(''); setPlayerGroupFilter('All'); setStatusFilter('all'); setSortMode('default'); setPaymentTypeFilter('all'); }}
                className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
                title="Reset filters"
              >
                Reset
              </button>
            )}
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
      </div>

      {isPaymentsModalOpen && (
        <div className="space-y-4">
          {paymentsError && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">{paymentsError}</div>
          )}
          {paymentsLoading ? (
            <div className="p-4 text-gray-600">Loading…</div>
          ) : (
            <div className={`grid gap-6 ${paymentTypeFilter === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Players payments */}
              {(paymentTypeFilter === 'all' || paymentTypeFilter === 'players') && (
                <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-900">Players Payments</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee (DT)</th>
                          {filteredMonths.map(m => (
                            <th key={`phead-${m.year}-${m.month}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {formatMonth(m.month)} {String(m.year).slice(-2)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {visiblePlayerPaymentSchedule.length === 0 ? (
                          <tr><td className="px-4 py-3 text-center text-gray-500" colSpan={3 + filteredMonths.length}>No players</td></tr>
                        ) : (
                          visiblePlayerPaymentSchedule.map(row => (
                            <tr key={`prow-${row.subject._id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div>
                                    <div className="text-gray-900 font-medium">{row.subject.fullName || row.subject._id}</div>
                                    {row.subject.group && <div className="text-xs text-gray-500">{row.subject.group}</div>}
                                  </div>
                                  <button
                                    onClick={() => openPaymentModal('player', row)}
                                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-lg transition-colors duration-200"
                                  >
                                    View Calendar
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-700">{(row.subject.baseAmount ?? 0).toFixed(2)} DT</td>
                              {filteredMonths.map(m => {
                                const cell = (row.rows || []).find(r => r.year === m.year && r.month === m.month) || { status: 'pending' };
                                return (
                                  <td key={`pcell-${row.subject._id}-${m.year}-${m.month}`} className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => onTogglePaymentStatus({ subjectId: row.subject._id, subjectType: 'player', year: m.year, month: m.month, currentStatus: cell.status })}
                                      className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium 
                                        ${cell.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                                        ${cell.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                        ${cell.status === 'delayed' ? 'bg-orange-100 text-orange-800' : ''}
                                      `}
                                      title="Click to change status"
                                    >
                                      {cell.status}
                                    </button>
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
              )}

              {/* Coaches payments */}
              {(paymentTypeFilter === 'all' || paymentTypeFilter === 'coaches') && (
                <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-900">Coaches Payments</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coach</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (DT)</th>
                          {filteredMonths.map(m => (
                            <th key={`chead-${m.year}-${m.month}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {formatMonth(m.month)} {String(m.year).slice(-2)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {visibleCoachPaymentSchedule.length === 0 ? (
                          <tr><td className="px-4 py-3 text-center text-gray-500" colSpan={3 + filteredMonths.length}>No coaches</td></tr>
                        ) : (
                          visibleCoachPaymentSchedule.map(row => (
                            <tr key={`crow-${row.subject._id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div>
                                    <div className="text-gray-900 font-medium">{row.subject.fullName || row.subject._id}</div>
                                    {row.subject.specialization && <div className="text-xs text-gray-500">{row.subject.specialization}</div>}
                                  </div>
                                  <button
                                    onClick={() => openPaymentModal('coach', row)}
                                    className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-lg transition-colors duration-200"
                                  >
                                    View Calendar
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-gray-700">{(row.subject.baseAmount ?? 0).toFixed(2)} DT</td>
                              {filteredMonths.map(m => {
                                const cell = (row.rows || []).find(r => r.year === m.year && r.month === m.month) || { status: 'pending' };
                                return (
                                  <td key={`ccell-${row.subject._id}-${m.year}-${m.month}`} className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => onTogglePaymentStatus({ subjectId: row.subject._id, subjectType: 'coach', year: m.year, month: m.month, currentStatus: cell.status })}
                                      className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium 
                                        ${cell.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                                        ${cell.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                        ${cell.status === 'delayed' ? 'bg-orange-100 text-orange-800' : ''}
                                      `}
                                      title="Click to change status"
                                    >
                                      {cell.status}
                                    </button>
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
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Calendar Modal */}
      {selectedPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedPaymentModal.type === 'player' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <svg className={`w-6 h-6 ${
                      selectedPaymentModal.type === 'player' ? 'text-blue-600' : 'text-green-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Full Payment Calendar</h2>
                    <p className="text-sm text-gray-600">{selectedPaymentModal.data.subject.fullName}</p>
                  </div>
                </div>
                <button
                  onClick={closePaymentModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                  title="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paymentMonths.map(month => {
                  const cell = (selectedPaymentModal.data.rows || []).find(r => r.year === month.year && r.month === month.month) || { status: 'pending', amount: selectedPaymentModal.data.subject.baseAmount || 0 };
                  const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  
                  return (
                    <div 
                      key={`modal-${selectedPaymentModal.data.subject._id}-${month.year}-${month.month}`}
                      className={`border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
                        cell.status === 'paid' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-green-100' :
                        cell.status === 'pending' ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 shadow-yellow-100' :
                        cell.status === 'delayed' ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300 shadow-red-100' :
                        'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 shadow-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-gray-900 text-sm">{monthLabel}</h5>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          cell.status === 'paid' ? 'bg-green-200 text-green-800' :
                          cell.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                          cell.status === 'delayed' ? 'bg-red-200 text-red-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {cell.status}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 mb-3">
                          {cell.amount || selectedPaymentModal.data.subject.baseAmount || 0} DT
                        </p>
                        <button
                          onClick={() => onTogglePaymentStatus({ 
                            subjectId: selectedPaymentModal.data.subject._id, 
                            subjectType: selectedPaymentModal.type, 
                            year: month.year, 
                            month: month.month, 
                            currentStatus: cell.status 
                          })}
                          className={`w-full text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${
                            selectedPaymentModal.type === 'player' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          Change Status
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Payment Summary */}
              <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                <h5 className="font-bold text-gray-900 mb-4 text-lg flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Payment Summary
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Total Amount:</span>
                      <span className="font-bold text-lg text-gray-900">
                        {paymentMonths.reduce((sum, month) => {
                          const cell = (selectedPaymentModal.data.rows || []).find(r => r.year === month.year && r.month === month.month);
                          return sum + (cell?.amount || selectedPaymentModal.data.subject.baseAmount || 0);
                        }, 0).toFixed(2)} DT
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Paid:</span>
                      <span className="font-bold text-lg text-green-600">
                        {paymentMonths.filter(month => {
                          const cell = (selectedPaymentModal.data.rows || []).find(r => r.year === month.year && r.month === month.month);
                          return cell?.status === 'paid';
                        }).length} months
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Pending:</span>
                      <span className="font-bold text-lg text-yellow-600">
                        {paymentMonths.filter(month => {
                          const cell = (selectedPaymentModal.data.rows || []).find(r => r.year === month.year && r.month === month.month);
                          return cell?.status === 'pending';
                        }).length} months
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingSchedulePage;