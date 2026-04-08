import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Payout } from '../../types';
import { DollarSign, CheckCircle } from 'lucide-react';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const endpoint = filter === 'all' ? '/api/admin/payouts' : `/api/admin/payouts?status=${filter}`;
    api.get<Payout[]>(endpoint)
      .then(setPayouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const processPayout = async (id: string) => {
    setProcessingId(id);
    try {
      await api.post(`/api/admin/payouts/${id}/process`);
      setPayouts(payouts.map(p => p.id === id ? { ...p, status: 'paid' } : p));
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>

      <div className="flex gap-2">
        {['all', 'pending', 'paid'].map(f => (
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
      ) : payouts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No payouts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map(p => (
            <div key={p.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.event_name || 'Event'}</p>
                  <p className="text-xs text-gray-500">Worker: {p.worker_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${p.amount.toFixed(2)}</p>
                  {p.status === 'pending' ? (
                    <button
                      onClick={() => processPayout(p.id)}
                      disabled={processingId === p.id}
                      className="mt-1 bg-green-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle size={12} />
                      {processingId === p.id ? '...' : 'Pay'}
                    </button>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Paid
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
