import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCoaches, deleteCoach } from '../services/coachService';
import CoachCreateModal from './CoachCreateModal';
import CoachEditModal from './CoachEditModal';

// Category is assigned later via training sessions; remove filtering here

function CoachesListPage() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingCoach, setEditingCoach] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    try {
      const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      return `${formatted} DT`;
    } catch (e) {
      return `${value} DT`;
    }
  };

  const load = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const list = await fetchCoaches();
      setCoaches(list);
    } catch (err) {
      setError(err.message || 'Failed to load coaches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (coachId) => {
    if (!window.confirm('Delete this coach?')) return;
    try {
      await deleteCoach(coachId);
      setMessage('Coach deleted successfully');
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete coach');
    }
  };

  // Filter + search coaches
  const filteredCoaches = useMemo(() => {
    let list = coaches;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.specialization || '').toLowerCase().includes(q) ||
        (c.contactNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [coaches, search]);

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Coaches Management</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coaches..."
              className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={load}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200 w-full sm:w-auto"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-sm rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700 w-full sm:w-auto"
              title="Add Coach"
            >
              + Add Coach
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded p-2 text-sm">
            {message}
          </div>
        )}
        {isLoading ? (
          <div className="text-gray-600">Loading coaches…</div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
            {error}
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop/tablet table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agreed Salary</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCoaches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        {categoryFilter ? `No coaches found in category ${categoryFilter}` : 'No coaches found'}
                      </td>
                    </tr>
                  ) : (
                    filteredCoaches.map((coach) => (
                      <tr key={coach._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{coach.fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {coach.dateOfBirth ? new Date(coach.dateOfBirth).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{coach.contactNumber || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{coach.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{coach.specialization || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatCurrency(coach.agreedSalary)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingCoach(coach)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(coach._id)}
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
              {filteredCoaches.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {categoryFilter ? `No coaches found in category ${categoryFilter}` : 'No coaches found'}
                </div>
              ) : (
                filteredCoaches.map((coach) => (
                  <div key={coach._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{coach.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {coach.dateOfBirth ? new Date(coach.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{coach.email || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{coach.contactNumber || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-800">{coach.specialization || 'N/A'}</span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800">{formatCurrency(coach.agreedSalary)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-3">
                      <button onClick={() => setEditingCoach(coach)} className="text-xs text-blue-600">Edit</button>
                      <button onClick={() => onDelete(coach._id)} className="text-xs text-red-600">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <CoachCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          load();
        }}
      />
      
      <CoachEditModal
        isOpen={!!editingCoach}
        coach={editingCoach}
        onClose={() => setEditingCoach(null)}
        onSaved={() => {
          setEditingCoach(null);
          load();
        }}
      />
    </div>
  );
}

export default CoachesListPage;