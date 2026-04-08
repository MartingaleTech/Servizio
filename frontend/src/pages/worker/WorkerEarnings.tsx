import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Earnings } from '../../types';
import { DollarSign, Clock, TrendingUp, Heart, Calendar, CreditCard } from 'lucide-react';

export default function WorkerEarnings() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('all');

  useEffect(() => {
    api.get<Earnings>('/api/workers/earnings')
      .then(setEarnings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const periodEarnings = period === 'weekly' ? earnings?.weekly_earnings :
    period === 'monthly' ? earnings?.monthly_earnings : earnings?.total_earned;
  const periodTips = period === 'weekly' ? earnings?.weekly_tips :
    period === 'monthly' ? earnings?.monthly_tips : earnings?.total_tips;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {(['weekly', 'monthly', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <DollarSign size={20} className="text-green-500 mb-1" />
          <p className="text-2xl font-bold text-green-600">
            ${(periodEarnings || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Base Pay</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Heart size={20} className="text-pink-500 mb-1" />
          <p className="text-2xl font-bold text-pink-600">
            ${(periodTips || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Tips</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Clock size={20} className="text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-yellow-600">
            ${earnings?.total_pending?.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <TrendingUp size={18} className="text-indigo-500 mb-1" />
          <p className="text-2xl font-bold text-indigo-600">
            {earnings?.completed_shifts_count || 0}
          </p>
          <p className="text-xs text-gray-500">Shifts Done</p>
        </div>
      </div>

      {/* Total Earnings Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
        <p className="text-sm opacity-80 mb-1">Total Earnings ({period === 'all' ? 'All Time' : period})</p>
        <p className="text-3xl font-bold">
          ${((periodEarnings || 0) + (periodTips || 0)).toFixed(2)}
        </p>
        <div className="flex gap-4 mt-2 text-xs opacity-80">
          <span>Base: ${(periodEarnings || 0).toFixed(2)}</span>
          <span>Tips: ${(periodTips || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Payout Schedule */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-indigo-500" />
          <span className="font-semibold text-gray-900">Payout Schedule</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-indigo-900">Next Payout</p>
            <p className="text-xs text-indigo-600">Processed weekly on Fridays</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-indigo-700">${earnings?.total_pending?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-indigo-500">pending</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard size={18} className="text-gray-500" />
          Payout History
        </h2>
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
