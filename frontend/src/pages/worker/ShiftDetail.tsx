import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Shift, Event } from '../../types';
import {
  ArrowLeft, MapPin, Calendar, Clock, DollarSign,
  CheckCircle, Play, Square, Navigation, Star, AlertTriangle,
} from 'lucide-react';

export default function ShiftDetail() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shiftId) return;
    api.get<Shift[]>('/api/workers/shifts')
      .then(shifts => {
        const s = shifts.find(sh => sh.id === shiftId);
        if (s) {
          setShift(s);
          return api.get<Event>(`/api/events/${s.event_id}`);
        }
        return null;
      })
      .then(e => { if (e) setEvent(e); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [shiftId]);

  const handleAction = async (action: string) => {
    if (!shiftId) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await api.post<Shift>(`/api/workers/shifts/${shiftId}/action`, { action });
      setShift(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!shift) return <div className="text-center py-12 text-gray-500">Shift not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Shift Details</h1>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      {/* Event Info */}
      <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-100 shadow-sm">
        <h2 className="font-semibold text-lg text-gray-900">{shift.event_name || event?.name}</h2>
        <span className="text-sm capitalize text-indigo-600 font-medium">{shift.role}</span>

        {event && (
          <>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={18} className="text-indigo-500" />
              <div>
                <p className="text-sm">
                  {new Date(event.start_datetime).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' - '}
                  {new Date(event.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-700">
              <MapPin size={18} className="text-indigo-500" />
              <p className="text-sm">{event.address}</p>
            </div>

            {event.dress_code && (
              <p className="text-sm text-gray-500">Dress code: {event.dress_code}</p>
            )}
            {event.special_instructions && (
              <p className="text-sm text-gray-500">Notes: {event.special_instructions}</p>
            )}
          </>
        )}
      </div>

      {/* Pay Info */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={18} className="text-green-500" />
          <span className="font-semibold text-gray-900">Pay</span>
        </div>
        <p className="text-2xl font-bold text-green-600">${shift.pay_amount?.toFixed(2)}</p>
        {shift.hours_worked && (
          <p className="text-sm text-gray-500">{shift.hours_worked.toFixed(1)} hours worked</p>
        )}
      </div>

      {/* Shift Status */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} className="text-blue-500" />
          <span className="font-semibold text-gray-900">Shift Status</span>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${
          shift.status === 'clocked_in' ? 'bg-blue-100 text-blue-700' :
          shift.status === 'accepted' ? 'bg-green-100 text-green-700' :
          ['clocked_out', 'completed'].includes(shift.status) ? 'bg-emerald-100 text-emerald-700' :
          shift.status === 'declined' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {shift.status.replace(/_/g, ' ')}
        </span>

        {shift.clock_in_time && (
          <p className="text-xs text-gray-400 mt-2">
            Clocked in: {new Date(shift.clock_in_time).toLocaleTimeString()}
          </p>
        )}
        {shift.clock_out_time && (
          <p className="text-xs text-gray-400">
            Clocked out: {new Date(shift.clock_out_time).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* V1: GPS & Overtime Info */}
      {(shift.eta_minutes || shift.arrived_at || shift.is_overtime) && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Navigation size={18} className="text-blue-500" />
            Tracking
          </h3>
          {shift.eta_minutes && shift.status === 'on_the_way' && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Navigation size={16} />
              ETA: ~{shift.eta_minutes} minutes
            </div>
          )}
          {shift.arrived_at && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} />
              Arrived at {new Date(shift.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {shift.is_overtime && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-sm">
                <AlertTriangle size={16} />
                Overtime: {shift.overtime_hours?.toFixed(1)}h extra
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Status: {shift.overtime_approved === true ? 'Approved' : shift.overtime_approved === false ? 'Disputed' : 'Pending approval'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {shift.status === 'assigned' && (
          <>
            <button
              onClick={() => handleAction('accept')}
              disabled={actionLoading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Accept Shift
            </button>
            <button
              onClick={() => handleAction('decline')}
              disabled={actionLoading}
              className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}

        {shift.status === 'accepted' && (
          <>
            <button
              onClick={() => handleAction('on_the_way')}
              disabled={actionLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              I'm On My Way
            </button>
            <button
              onClick={() => handleAction('clock_in')}
              disabled={actionLoading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Clock In
            </button>
          </>
        )}

        {shift.status === 'on_the_way' && (
          <button
            onClick={() => handleAction('clock_in')}
            disabled={actionLoading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Clock In
          </button>
        )}

        {shift.status === 'clocked_in' && (
          <button
            onClick={() => handleAction('clock_out')}
            disabled={actionLoading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Square size={18} />
            Clock Out
          </button>
        )}

        {['clocked_out', 'completed'].includes(shift.status) && (
          <div className="space-y-3">
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
              <CheckCircle size={24} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-emerald-700">Shift Complete</p>
              <p className="text-sm text-emerald-600">Earnings: ${shift.pay_amount?.toFixed(2)}</p>
            </div>
            {event && (
              <button
                onClick={() => navigate(`/worker/shifts/${shiftId}/rate`)}
                className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 flex items-center justify-center gap-2"
              >
                <Star size={18} /> Rate Customer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
