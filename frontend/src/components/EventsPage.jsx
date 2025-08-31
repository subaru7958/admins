import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEvents, deleteEvent } from '../services/eventService';
import EventCreateModal from './EventCreateModal';
import EventEditModal from './EventEditModal';

const EVENT_TYPES = ['Match', 'Tournament', 'Training Camp', 'Meeting', 'Other'];

function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  });

  const load = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const list = await fetchEvents({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setEvents(list);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(eventId);
      setMessage('Event deleted successfully');
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.startDate).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Events Calendar</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={load}
              className="text-sm rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
              title="Refresh"
            >
              Refresh
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-sm rounded-md bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
              title="Add Event"
            >
              + Add Event
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded p-2 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="text-gray-600">Loading events…</div>
        ) : sortedDates.length === 0 ? (
          <div className="text-gray-600 text-center py-10">
            No events found in the selected date range.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedEvents[date].map(event => {
                    const startDate = new Date(event.startDate);
                    const endDate = new Date(event.endDate);
                    return (
                      <div key={event._id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500"></div>
                              <div>
                                <h3 className="font-medium text-gray-900">{event.title}</h3>
                                <div className="text-sm text-gray-600 mt-1">
                                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {event.eventType}
                                </div>
                                {event.location && (
                                  <div className="text-xs text-gray-500">
                                    Location: {event.location}
                                  </div>
                                )}
                                {event.description && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {event.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(event._id)}
                              className="text-xs text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {event.notes && (
                          <div className="text-xs text-gray-600 mt-2 border-t border-gray-100 pt-2">
                            Notes: {event.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <EventCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setIsCreateModalOpen(false);
          load();
        }}
      />
      
      <EventEditModal
        isOpen={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={() => {
          setEditingEvent(null);
          load();
        }}
      />
    </div>
  );
}

export default EventsPage;