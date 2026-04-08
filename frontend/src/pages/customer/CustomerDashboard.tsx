import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { Event } from '../../types';
import { Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Event[]>('/api/events')
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcomingEvents = events.filter(e => !['completed', 'cancelled'].includes(e.status));
  const pastEvents = events.filter(e => ['completed', 'cancelled'].includes(e.status));

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_assignment: 'bg-yellow-100 text-yellow-700',
    partially_staffed: 'bg-orange-100 text-orange-700',
    fully_staffed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 text-sm">Manage your events</p>
        </div>
        <Link
          to="/customer/events/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold hover:bg-indigo-700"
        >
          <Plus size={16} />
          New Event
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Calendar size={20} className="text-indigo-500 mb-1" />
          <p className="text-2xl font-bold">{events.length}</p>
          <p className="text-xs text-gray-500">Total Events</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Clock size={20} className="text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{upcomingEvents.length}</p>
          <p className="text-xs text-gray-500">Upcoming</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <CheckCircle size={20} className="text-green-500 mb-1" />
          <p className="text-2xl font-bold">{pastEvents.filter(e => e.status === 'completed').length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No upcoming events</p>
            <Link
              to="/customer/events/new"
              className="text-indigo-600 text-sm font-semibold mt-2 inline-block"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                to={`/customer/events/${event.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(event.start_datetime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-gray-400">{event.address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[event.status] || 'bg-gray-100 text-gray-700'}`}>
                    {event.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-gray-500">
                  {event.servers_needed > 0 && <span>{event.servers_needed} servers</span>}
                  {event.bartenders_needed > 0 && <span>{event.bartenders_needed} bartenders</span>}
                  {event.cleaners_needed > 0 && <span>{event.cleaners_needed} cleaners</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Past Events</h2>
          <div className="space-y-3">
            {pastEvents.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                to={`/customer/events/${event.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-700">{event.name}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(event.start_datetime).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[event.status] || ''}`}>
                    {event.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
