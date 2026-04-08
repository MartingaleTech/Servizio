import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Event } from '../../types';
import { Calendar, MapPin, Users } from 'lucide-react';

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = filter === 'all' ? '/api/admin/events' : `/api/admin/events?status=${filter}`;
    api.get<Event[]>(endpoint)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Events</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'draft', 'pending_assignment', 'fully_staffed', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No events found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-500">by {event.customer_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[event.status] || ''}`}>
                  {event.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(event.start_datetime).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {event.address.substring(0, 30)}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {event.servers_needed + event.bartenders_needed + event.cleaners_needed} staff
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
