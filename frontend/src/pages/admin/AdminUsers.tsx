import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
import { Ban, CheckCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = filter === 'all' ? '/api/admin/users' : `/api/admin/users?role=${filter}`;
    api.get<User[]>(endpoint)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const toggleActive = async (userId: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/deactivate`);
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <div className="flex gap-2">
        {['all', 'customer', 'worker', 'admin'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
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
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">
                      {user.role}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(user.id)}
                  className={`p-2 rounded-lg ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                  title={user.is_active ? 'Deactivate' : 'Activate'}
                >
                  {user.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
