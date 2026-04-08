import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Dispute } from '../../types';
import { AlertTriangle, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveData, setResolveData] = useState({ status: 'resolved', resolution: '', refund_amount: 0, payout_adjustment: 0 });
  const [resolving, setResolving] = useState(false);

  useEffect(() => { loadDisputes(); }, [filterStatus]);

  const loadDisputes = async () => {
    try {
      const url = filterStatus ? `/api/disputes/admin/all?status=${filterStatus}` : '/api/disputes/admin/all';
      const data = await api.get<Dispute[]>(url);
      setDisputes(data);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolveData.resolution) return;
    setResolving(true);
    try {
      await api.put(`/api/disputes/${selectedDispute.id}/resolve`, {
        ...resolveData,
        refund_amount: resolveData.refund_amount || undefined,
        payout_adjustment: resolveData.payout_adjustment || undefined,
      });
      setSelectedDispute(null);
      setResolveData({ status: 'resolved', resolution: '', refund_amount: 0, payout_adjustment: 0 });
      loadDisputes();
    } catch { /* */ } finally { setResolving(false); }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-amber-100 text-amber-700',
      under_review: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      dismissed: 'bg-gray-100 text-gray-600',
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.open}`}>{status.replace('_', ' ')}</span>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Disputes Management</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['', 'open', 'under_review', 'resolved', 'dismissed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${
              filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle size={40} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No disputes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => (
            <div key={d.id} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-sm font-medium capitalize">{d.dispute_type.replace('_', ' ')}</span>
                  {statusBadge(d.status)}
                </div>
                {(d.status === 'open' || d.status === 'under_review') && (
                  <button
                    onClick={() => setSelectedDispute(d)}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <Eye size={12} /> Resolve
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{d.description}</p>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>By: {d.filed_by_name || 'Unknown'}</span>
                {d.filed_against_name && <span>Against: {d.filed_against_name}</span>}
                <span>{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              {d.resolution && (
                <div className="bg-gray-50 rounded-lg p-2 mt-2">
                  <p className="text-xs text-gray-500">Resolution: {d.resolution}</p>
                  {d.refund_amount && d.refund_amount > 0 && <p className="text-xs text-green-600">Refund: ${d.refund_amount.toFixed(2)}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Resolve Dispute</h3>
            <p className="text-sm text-gray-600 mb-4">{selectedDispute.description}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Action</label>
                <select
                  value={resolveData.status}
                  onChange={e => setResolveData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="resolved">Resolve</option>
                  <option value="dismissed">Dismiss</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Resolution Notes</label>
                <textarea
                  value={resolveData.resolution}
                  onChange={e => setResolveData(prev => ({ ...prev, resolution: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Refund ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={resolveData.refund_amount || ''}
                    onChange={e => setResolveData(prev => ({ ...prev, refund_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Payout Adj ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={resolveData.payout_adjustment || ''}
                    onChange={e => setResolveData(prev => ({ ...prev, payout_adjustment: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setSelectedDispute(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleResolve}
                disabled={resolving || !resolveData.resolution}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {resolving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
