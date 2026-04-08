import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Event, Quote, Booking, Shift, Invoice, Rating } from '../../types';
import {
  ArrowLeft, Calendar, MapPin, Users, DollarSign,
  CheckCircle, CreditCard, FileText, Star, Heart,
  MessageCircle, AlertTriangle, Navigation, Clock,
} from 'lucide-react';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    Promise.all([
      api.get<Event>(`/api/events/${eventId}`),
      api.get<Quote>(`/api/events/${eventId}/quote`).catch(() => null),
      api.get<Booking | null>(`/api/events/${eventId}/booking`).catch(() => null),
      api.get<Shift[]>(`/api/events/${eventId}/shifts`).catch(() => []),
      api.get<Invoice | null>(`/api/events/${eventId}/invoice`).catch(() => null),
      api.get<Rating[]>(`/api/ratings/event/${eventId}`).catch(() => []),
    ]).then(([e, q, b, s, i, r]) => {
      setEvent(e);
      setQuote(q);
      setBooking(b);
      setShifts(s);
      setInvoice(i);
      setRatings(r);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleBook = async () => {
    if (!eventId) return;
    setBookingLoading(true);
    setError('');
    try {
      const b = await api.post<Booking>(`/api/events/${eventId}/book`, {
        event_id: eventId,
        payment_method: 'card',
      });
      setBooking(b);
      const s = await api.get<Shift[]>(`/api/events/${eventId}/shifts`);
      setShifts(s);
      const e = await api.get<Event>(`/api/events/${eventId}`);
      setEvent(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleOvertimeAction = async (shiftId: string, action: 'approve' | 'dispute') => {
    if (!eventId) return;
    try {
      await api.put(`/api/events/${eventId}/shifts/${shiftId}/overtime`, { action });
      const s = await api.get<Shift[]>(`/api/events/${eventId}/shifts`);
      setShifts(s);
    } catch { /* */ }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading event...</div>;
  if (!event) return <div className="text-center py-12 text-gray-500">Event not found</div>;

  const hours = Math.max(
    (new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / 3600000,
    1
  );

  const isCompleted = event.status === 'completed' || shifts.some(s => ['clocked_out', 'completed'].includes(s.status));
  const hasRated = ratings.some(r => r.rating_type === 'customer_to_worker');

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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{event.name}</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[event.status] || ''}`}>
          {event.status.replace(/_/g, ' ')}
        </span>
        <span className="text-sm text-gray-400 capitalize">{event.event_type.replace(/_/g, ' ')}</span>
      </div>

      {/* Event Info */}
      <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 text-gray-700">
          <Calendar size={18} className="text-indigo-500" />
          <div>
            <p className="text-sm font-medium">
              {new Date(event.start_datetime).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {' - '}
              {new Date(event.end_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {' '}({hours.toFixed(1)} hrs)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-gray-700">
          <MapPin size={18} className="text-indigo-500" />
          <p className="text-sm">{event.address}</p>
        </div>

        {event.guest_count && (
          <div className="flex items-center gap-3 text-gray-700">
            <Users size={18} className="text-indigo-500" />
            <p className="text-sm">{event.guest_count} guests</p>
          </div>
        )}

        {event.dress_code && (
          <p className="text-sm text-gray-500">Dress code: {event.dress_code}</p>
        )}
        {event.special_instructions && (
          <p className="text-sm text-gray-500">Notes: {event.special_instructions}</p>
        )}
      </div>

      {/* Quote */}
      {quote && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-green-500" />
            Quote Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            {quote.servers_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Servers ({quote.servers_count} x {quote.hours}h x ${quote.servers_rate})</span>
                <span className="font-medium">${(quote.servers_count * quote.hours * quote.servers_rate).toFixed(2)}</span>
              </div>
            )}
            {quote.bartenders_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Bartenders ({quote.bartenders_count} x {quote.hours}h x ${quote.bartenders_rate})</span>
                <span className="font-medium">${(quote.bartenders_count * quote.hours * quote.bartenders_rate).toFixed(2)}</span>
              </div>
            )}
            {quote.cleaners_count > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cleaners ({quote.cleaners_count} x {quote.hours}h x ${quote.cleaners_rate})</span>
                <span className="font-medium">${(quote.cleaners_count * quote.hours * quote.cleaners_rate).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform fee</span>
              <span>${quote.platform_fee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-indigo-600">${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Book button */}
      {!booking && event.status === 'draft' && quote && (
        <button
          onClick={handleBook}
          disabled={bookingLoading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          {bookingLoading ? 'Processing...' : `Confirm & Pay $${quote.total.toFixed(2)}`}
        </button>
      )}

      {/* Booking info */}
      {booking && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            Booking Confirmed
          </h3>
          <div className="text-sm space-y-1">
            <p className="text-gray-600">Booking ID: {booking.id.slice(0, 8)}</p>
            <p className="text-gray-600">Total: ${booking.total_amount.toFixed(2)}</p>
            <p className="text-gray-600 capitalize">Payment: {booking.payment_status}</p>
          </div>
        </div>
      )}

      {/* V1: Assigned Workers with GPS & Overtime */}
      {shifts.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            Assigned Staff ({shifts.length})
          </h3>
          <div className="space-y-3">
            {shifts.map(shift => (
              <div key={shift.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{shift.worker_name || 'Worker'}</p>
                    <p className="text-xs text-gray-500 capitalize">{shift.role}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    shift.status === 'on_the_way' ? 'bg-blue-100 text-blue-700' :
                    shift.status === 'clocked_in' ? 'bg-indigo-100 text-indigo-700' :
                    shift.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    ['clocked_out', 'completed'].includes(shift.status) ? 'bg-emerald-100 text-emerald-700' :
                    shift.status === 'declined' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {shift.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {shift.status === 'on_the_way' && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs">
                    <Navigation size={14} />
                    {shift.eta_minutes ? `ETA: ~${shift.eta_minutes} min` : 'On the way...'}
                  </div>
                )}
                {shift.arrived_at && (
                  <div className="mt-2 flex items-center gap-2 text-green-600 text-xs">
                    <CheckCircle size={14} />
                    Arrived at {new Date(shift.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {shift.is_overtime && (
                  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="flex items-center gap-1 text-amber-700 text-xs mb-1">
                      <Clock size={14} />
                      Overtime: {shift.overtime_hours?.toFixed(1)}h extra
                    </div>
                    {shift.overtime_approved === null && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => handleOvertimeAction(shift.id, 'approve')}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Approve</button>
                        <button onClick={() => handleOvertimeAction(shift.id, 'dispute')}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Dispute</button>
                      </div>
                    )}
                    {shift.overtime_approved === true && <p className="text-xs text-green-600">Approved</p>}
                    {shift.overtime_approved === false && <p className="text-xs text-red-600">Disputed</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice */}
      {invoice && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            Invoice
          </h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="capitalize font-medium">{invoice.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* V1: Action Buttons for completed events */}
      {isCompleted && booking && (
        <div className="space-y-3">
          {!hasRated && (
            <Link to={`/customer/events/${eventId}/rate`}
              className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 flex items-center justify-center gap-2">
              <Star size={18} /> Rate Your Staff
            </Link>
          )}
          <Link to={`/customer/events/${eventId}/tip`}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2">
            <Heart size={18} /> Tip Your Staff
          </Link>
        </div>
      )}

      {/* V1: Quick Actions */}
      {booking && (
        <div className="grid grid-cols-2 gap-3">
          <Link to={`/chat?eventId=${eventId}`}
            className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:border-indigo-300 transition-colors">
            <MessageCircle size={20} className="mx-auto text-indigo-500 mb-1" />
            <p className="text-xs font-medium text-gray-700">Chat</p>
          </Link>
          <Link to={`/disputes?eventId=${eventId}`}
            className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:border-red-300 transition-colors">
            <AlertTriangle size={20} className="mx-auto text-red-500 mb-1" />
            <p className="text-xs font-medium text-gray-700">Report Issue</p>
          </Link>
        </div>
      )}
    </div>
  );
}
