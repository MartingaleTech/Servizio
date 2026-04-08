import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event } from '../../types';
import { Briefcase } from 'lucide-react';

export default function CustomerBookings() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Event[]>('/api/events')
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const bookedEvents = events.filter(e => e.status !== 'draft');

  const statusColor: Record<string, string> = {
    pending_assignment: 'bg-yellow-100 text-yellow-700',
    partially_staffed: 'bg-orange-100 text-orange-700',
    fully_staffed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : bookedEvents.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Briefcase size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No bookings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookedEvents.map(event => (
            <Link
              key={event.id}
              to={`/customer/events/${event.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(event.start_datetime).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[event.status] || 'bg-gray-100 text-gray-700'}`}>
                  {event.status.replace(/_/g, ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
