import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { IDVerification, User } from '../../types';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

export default function AdminVerifications() {
  const [verifications, setVerifications] = useState<IDVerification[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, User>>({});

  useEffect(() => {
    setLoading(true);
    const endpoint = filter === 'all'
      ? '/api/admin/verifications'
      : `/api/admin/verifications?status=${filter}`;
    api.get<IDVerification[]>(endpoint)
      .then(async (vList) => {
        setVerifications(vList);
        const userIds = [...new Set(vList.map(v => v.user_id))];
        const usersMap: Record<string, User> = {};
        for (const uid of userIds) {
          try {
            const u = await api.get<User>(`/api/admin/users/${uid}`);
            usersMap[uid] = u;
          } catch {
            // skip
          }
        }
        setUsers(usersMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id);
    try {
      const updated = await api.put<IDVerification>(`/api/admin/verifications/${id}`, {
        status,
        admin_notes: notes[id] || undefined,
      });
      setVerifications(verifications.map(v => v.id === id ? updated : v));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>

      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
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
      ) : verifications.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Shield size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No {filter} verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map(v => (
            <div key={v.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {users[v.user_id]?.full_name || 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-500">{users[v.user_id]?.email}</p>
                  <p className="text-xs text-gray-400">
                    Submitted: {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  v.status === 'approved' ? 'bg-green-100 text-green-700' :
                  v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {v.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">ID Front</p>
                  <p className="text-xs text-indigo-600 truncate">{v.government_id_front_url ? 'Uploaded' : 'Missing'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">ID Back</p>
                  <p className="text-xs text-indigo-600 truncate">{v.government_id_back_url ? 'Uploaded' : 'Missing'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Selfie</p>
                  <p className="text-xs text-indigo-600 truncate">{v.selfie_url ? 'Uploaded' : 'Missing'}</p>
                </div>
              </div>

              {v.status === 'pending' && (
                <>
                  <input
                    type="text"
                    placeholder="Admin notes (optional)"
                    value={notes[v.id] || ''}
                    onChange={e => setNotes({ ...notes, [v.id]: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(v.id, 'approved')}
                      disabled={actionLoading === v.id}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(v.id, 'rejected')}
                      disabled={actionLoading === v.id}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </>
              )}

              {v.admin_notes && v.status !== 'pending' && (
                <p className="text-sm text-gray-500">Notes: {v.admin_notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
