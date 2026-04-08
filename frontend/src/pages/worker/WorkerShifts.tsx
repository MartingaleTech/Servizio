import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Shift } from '../../types';
import { Clock } from 'lucide-react';

export default function WorkerShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filter, setFilter] = useState<string>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Shift[]>('/api/workers/shifts')
      .then(setShifts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredShifts = shifts.filter(s => {
    if (filter === 'upcoming') return ['assigned', 'accepted', 'on_the_way'].includes(s.status);
    if (filter === 'active') return s.status === 'clocked_in';
    if (filter === 'completed') return ['clocked_out', 'completed'].includes(s.status);
    return true;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">My Shifts</h1>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['upcoming', 'active', 'completed', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredShifts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Clock size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No {filter} shifts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map(shift => (
            <Link
              key={shift.id}
              to={`/worker/shifts/${shift.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.event_name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{shift.role}</p>
                  {shift.planned_start && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(shift.planned_start).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  )}
                  {shift.hours_worked && (
                    <p className="text-xs text-gray-400">{shift.hours_worked.toFixed(1)} hrs worked</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">${shift.pay_amount?.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    shift.status === 'clocked_in' ? 'bg-blue-100 text-blue-700' :
                    shift.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    ['clocked_out', 'completed'].includes(shift.status) ? 'bg-emerald-100 text-emerald-700' :
                    shift.status === 'declined' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {shift.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
