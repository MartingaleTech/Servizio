import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Shift, Event, Tip } from '../../types';
import { ArrowLeft, DollarSign, Heart } from 'lucide-react';

export default function TipEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [existingTips, setExistingTips] = useState<Tip[]>([]);
  const [splitType, setSplitType] = useState<'even' | 'per_worker'>('even');
  const [totalTip, setTotalTip] = useState(0);
  const [workerTips, setWorkerTips] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const presetAmounts = [5, 10, 15, 20, 25, 50];

  useEffect(() => {
    if (eventId) {
      api.get<Event>(`/api/events/${eventId}`).then(setEvent).catch(() => {});
      api.get<Shift[]>(`/api/events/${eventId}/shifts`).then(setShifts).catch(() => {});
      api.get<Tip[]>(`/api/tips/event/${eventId}`).then(setExistingTips).catch(() => {});
    }
  }, [eventId]);

  const completedShifts = shifts.filter(s => s.status === 'completed' || s.status === 'clocked_out');
  const alreadyTipped = existingTips.length > 0;

  const handleSubmit = async () => {
    if (!eventId || totalTip <= 0) return;
    setSubmitting(true);
    try {
      const payload: { event_id: string; amount: number; split_type: string; worker_tips?: { worker_id: string; amount: number }[] } = {
        event_id: eventId,
        amount: totalTip,
        split_type: splitType,
      };
      if (splitType === 'per_worker') {
        payload.worker_tips = Object.entries(workerTips)
          .filter(([, amount]) => amount > 0)
          .map(([worker_id, amount]) => ({ worker_id, amount }));
      }
      await api.post('/api/tips', payload);
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
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart size={32} className="text-pink-600 fill-pink-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tip Sent!</h2>
        <p className="text-gray-500">Your staff will appreciate your generosity.</p>
      </div>
    );
  }

  if (alreadyTipped) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-center py-8">
          <Heart size={48} className="mx-auto text-pink-300 mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Already Tipped</h2>
          <p className="text-gray-500 text-sm">You have already sent a tip for this event.</p>
          <p className="text-gray-400 text-xs mt-2">
            Total: ${existingTips.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Tip Your Staff</h1>
      <p className="text-sm text-gray-500 mb-6">{event?.name}</p>

      {completedShifts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No completed shifts to tip yet.</p>
      ) : (
        <div className="space-y-6">
          {/* Split type */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">How to split?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSplitType('even')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                  splitType === 'even' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                Split Evenly
              </button>
              <button
                onClick={() => { setSplitType('per_worker'); setTotalTip(0); }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                  splitType === 'per_worker' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                Per Worker
              </button>
            </div>
          </div>

          {splitType === 'even' ? (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Total Tip Amount</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTotalTip(amt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                      totalTip === amt ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalTip || ''}
                  onChange={(e) => setTotalTip(parseFloat(e.target.value) || 0)}
                  placeholder="Custom amount"
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {totalTip > 0 && completedShifts.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  ${(totalTip / completedShifts.length).toFixed(2)} per worker ({completedShifts.length} workers)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {completedShifts.map(shift => (
                <div key={shift.id} className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{shift.worker_name || 'Worker'}</p>
                      <p className="text-xs text-gray-500 capitalize">{shift.role}</p>
                    </div>
                    <div className="relative w-24">
                      <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={workerTips[shift.worker_id] || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setWorkerTips(prev => ({ ...prev, [shift.worker_id]: val }));
                          setTotalTip(Object.values({ ...workerTips, [shift.worker_id]: val }).reduce((a, b) => a + b, 0));
                        }}
                        className="w-full border border-gray-300 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalTip > 0 && (
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">${totalTip.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1">Total tip</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || totalTip <= 0}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Heart size={18} />
            {submitting ? 'Sending...' : `Send $${totalTip.toFixed(2)} Tip`}
          </button>
        </div>
      )}
    </div>
  );
}
