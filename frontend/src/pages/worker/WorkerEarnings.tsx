import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Earnings } from '../../types';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';

export default function WorkerEarnings() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Earnings>('/api/workers/earnings')
      .then(setEarnings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <DollarSign size={20} className="text-green-500 mb-1" />
          <p className="text-2xl font-bold text-green-600">
            ${earnings?.total_earned?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500">Total Earned</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Clock size={20} className="text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-yellow-600">
            ${earnings?.total_pending?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-indigo-500" />
          <span className="font-medium text-gray-700">Completed Shifts</span>
        </div>
        <p className="text-2xl font-bold">{earnings?.completed_shifts_count || 0}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Payout History</h2>
        {!earnings?.payouts?.length ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <p className="text-gray-500">No payouts yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {earnings.payouts.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.event_name || 'Event'}</p>
                    <p className="text-xs text-gray-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${p.amount.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
