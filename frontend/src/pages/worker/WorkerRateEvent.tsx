import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Event, Rating } from '../../types';
import { Star, ArrowLeft, Send } from 'lucide-react';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star size={28} className={star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  );
}

export default function WorkerRateEvent() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shift, setShift] = useState<{ event_id: string; event_name?: string } | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [existingRatings, setExistingRatings] = useState<Rating[]>([]);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (shiftId) {
      // Get shift details to find event
      api.get<{ event_id: string; event_name?: string }>(`/api/workers/shifts`).then(shifts => {
        // shifts is an array, find the one
      }).catch(() => {});
    }
  }, [shiftId]);

  // Load shift data from worker shifts
  useEffect(() => {
    const loadData = async () => {
      try {
        const shifts = await api.get<Array<{ id: string; event_id: string; event_name?: string }>>('/api/workers/shifts');
        const s = shifts.find(sh => sh.id === shiftId);
        if (s) {
          setShift(s);
          const ev = await api.get<Event>(`/api/events/${s.event_id}`);
          setEvent(ev);
          const ratings = await api.get<Rating[]>(`/api/ratings/event/${s.event_id}`);
          setExistingRatings(ratings);
        }
      } catch { /* */ }
    };
    if (shiftId) loadData();
  }, [shiftId]);

  const alreadyRated = existingRatings.some(
    r => r.from_user_id === user?.id && r.rating_type === 'worker_to_customer'
  );

  const handleSubmit = async () => {
    if (!event || rating === 0) return;
    setSubmitting(true);
    try {
      await api.post('/api/ratings', {
        event_id: event.id,
        to_user_id: event.customer_id,
        rating,
        review_text: review || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch { /* */ } finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star size={32} className="text-green-600 fill-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Rating Submitted!</h2>
        <p className="text-gray-500">Thank you for your feedback.</p>
      </div>
    );
  }

  if (alreadyRated) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center py-8">
          <p className="text-gray-500">You have already rated this customer.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Rate Customer</h1>
      <p className="text-sm text-gray-500 mb-6">{event?.name || shift?.event_name}</p>

      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-2 block">How was your experience?</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Comment (optional)</label>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Share your experience..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send size={18} />
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
