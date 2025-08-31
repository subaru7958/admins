import React, { useEffect, useRef, useState } from 'react';
import { fetchPlayers } from '../services/playerService';

const GROUPS = ['Minimum', 'Cadet', 'Junior', 'Senior'];

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

function PlayersQuickDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [group, setGroup] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  useOnClickOutside(panelRef, () => setIsOpen(false));

  useEffect(() => {
    async function load() {
      if (!isOpen || !group) return;
      setLoading(true);
      setError('');
      try {
        const list = await fetchPlayers({ group });
        setPlayers(list);
      } catch (err) {
        setError(err.message || 'Failed to load players');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOpen, group]);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-900 hover:bg-gray-200 focus:outline-none"
      >
        View
      </button>
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute z-20 right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700">Group</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select group</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
          ) : group ? (
            players.length ? (
              <ul className="max-h-56 overflow-auto divide-y divide-gray-100">
                {players.map((p) => (
                  <li key={p._id} className="py-2">
                    <div className="text-sm font-medium text-gray-900">{p.fullName}</div>
                    <div className="text-xs text-gray-500">
                      {(Array.isArray(p.positions) && p.positions[0]) || p.position || '—'}
                      {p.jerseyNumber ? ` · #${p.jerseyNumber}` : ''}
                      {p.subgroup ? ` · ${p.subgroup}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-600">No players in {group}.</div>
            )
          ) : (
            <div className="text-xs text-gray-500">Choose a group to view players.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayersQuickDropdown;


