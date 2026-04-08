import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Shift, Rating, Event } from '../../types';
import { Star, ArrowLeft, Send } from 'lucide-react';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            size={28}
            className={star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

export default function RateEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [existingRatings, setExistingRatings] = useState<Rating[]>([]);
  const [ratings, setRatings] = useState<Record<string, { rating: number; review: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (eventId) {
      api.get<Event>(`/api/events/${eventId}`).then(setEvent).catch(() => {});
      api.get<Shift[]>(`/api/events/${eventId}/shifts`).then(setShifts).catch(() => {});
      api.get<Rating[]>(`/api/ratings/event/${eventId}`).then(setExistingRatings).catch(() => {});
    }
  }, [eventId]);

  const unratedWorkers = shifts.filter(s => {
    return s.status === 'completed' || s.status === 'clocked_out';
  }).filter(s => {
    return !existingRatings.some(r => r.to_user_id === s.worker_id && r.rating_type === 'customer_to_worker');
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      for (const shift of unratedWorkers) {
        const r = ratings[shift.worker_id];
        if (r && r.rating > 0) {
          await api.post('/api/ratings', {
            event_id: eventId,
            to_user_id: shift.worker_id,
            rating: r.rating,
            review_text: r.review || undefined,
          });
        }
      }
      setSuccess(true);
      setTimeout(() => navigate(`/customer/events/${eventId}`), 1500);
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star size={32} className="text-green-600 fill-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-500">Your ratings have been submitted.</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Rate Your Staff</h1>
      <p className="text-sm text-gray-500 mb-6">{event?.name}</p>

      {unratedWorkers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">All workers have been rated for this event.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {unratedWorkers.map(shift => (
            <div key={shift.id} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{shift.worker_name || 'Worker'}</h3>
                  <p className="text-xs text-gray-500 capitalize">{shift.role}</p>
                </div>
              </div>
              <div className="mb-3">
                <label className="text-sm text-gray-600 mb-1 block">Rating</label>
                <StarRating
                  value={ratings[shift.worker_id]?.rating || 0}
                  onChange={(v) => setRatings(prev => ({
                    ...prev,
                    [shift.worker_id]: { ...prev[shift.worker_id], rating: v, review: prev[shift.worker_id]?.review || '' }
                  }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Review (optional)</label>
                <textarea
                  value={ratings[shift.worker_id]?.review || ''}
                  onChange={(e) => setRatings(prev => ({
                    ...prev,
                    [shift.worker_id]: { ...prev[shift.worker_id], review: e.target.value, rating: prev[shift.worker_id]?.rating || 0 }
                  }))}
                  placeholder="How was this worker?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitting || !Object.values(ratings).some(r => r.rating > 0)}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {submitting ? 'Submitting...' : 'Submit Ratings'}
          </button>
        </div>
      )}
    </div>
  );
}
