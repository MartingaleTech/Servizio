import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { Event, Rating } from '../../types';
import { User, Mail, Phone, Building, Star, Calendar, MapPin } from 'lucide-react';

export default function CustomerProfile() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Event[]>('/api/events').catch(() => []),
      api.get<Rating[]>(`/api/ratings/user/${user.id}`).catch(() => []),
    ]).then(([e, r]) => {
      setEvents(e);
      setRatings(r);
    }).finally(() => setLoading(false));
  }, [user]);

  const workerRatings = ratings.filter(r => r.rating_type === 'worker_to_customer');
  const avgRating = workerRatings.length > 0
    ? workerRatings.reduce((sum, r) => sum + r.rating, 0) / workerRatings.length
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role} Account</p>
            {/* V1: Customer rating from workers */}
            {workerRatings.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-gray-700">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({workerRatings.length} reviews)</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail size={18} className="text-gray-400" />
            <span className="text-sm">{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-3 text-gray-700">
              <Phone size={18} className="text-gray-400" />
              <span className="text-sm">{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-gray-700">
            <Building size={18} className="text-gray-400" />
            <span className="text-sm">Event Host</span>
          </div>
        </div>
      </div>

      {/* V1: Event History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-indigo-500" />
          Event History ({events.length})
        </h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
            <p className="text-gray-500">No events yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 10).map(event => (
              <div key={event.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {new Date(event.start_datetime).toLocaleDateString()}
                    </p>
                    {event.address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={12} />
                        {event.address}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    event.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    event.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {event.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
