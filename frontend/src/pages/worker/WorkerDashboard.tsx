import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { Shift, WorkerProfile } from '../../types';
import { Clock, Star, CheckCircle, AlertTriangle, Briefcase } from 'lucide-react';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<WorkerProfile>('/api/workers/profile/me').catch(() => null),
      api.get<Shift[]>('/api/workers/shifts').catch(() => []),
    ]).then(([p, s]) => {
      setProfile(p);
      setShifts(s);
    }).finally(() => setLoading(false));
  }, []);

  const upcomingShifts = shifts.filter(s => ['assigned', 'accepted', 'on_the_way'].includes(s.status));
  const activeShifts = shifts.filter(s => s.status === 'clocked_in');
  const completedShifts = shifts.filter(s => ['clocked_out', 'completed'].includes(s.status));

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hi, {user?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 text-sm">Your work dashboard</p>
      </div>

      {/* Verification Warning */}
      {profile && profile.verification_status !== 'approved' && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          profile.verification_status === 'pending' ? 'bg-yellow-50 border border-yellow-200' :
          profile.verification_status === 'rejected' ? 'bg-red-50 border border-red-200' :
          'bg-orange-50 border border-orange-200'
        }`}>
          <AlertTriangle size={20} className={
            profile.verification_status === 'pending' ? 'text-yellow-500' :
            profile.verification_status === 'rejected' ? 'text-red-500' : 'text-orange-500'
          } />
          <div>
            <p className="font-medium text-gray-900">
              {profile.verification_status === 'pending' ? 'Verification Pending' :
               profile.verification_status === 'rejected' ? 'Verification Rejected' :
               'Verification Required'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {profile.verification_status === 'unverified'
                ? 'Complete ID verification to start accepting jobs.'
                : profile.verification_status === 'pending'
                ? 'Your verification is being reviewed.'
                : 'Please resubmit your verification documents.'}
            </p>
            {profile.verification_status !== 'pending' && (
              <Link to="/worker/profile" className="text-sm text-indigo-600 font-semibold mt-2 inline-block">
                Go to Verification
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Clock size={20} className="text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{upcomingShifts.length}</p>
          <p className="text-xs text-gray-500">Upcoming</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <CheckCircle size={20} className="text-green-500 mb-1" />
          <p className="text-2xl font-bold">{completedShifts.length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Star size={20} className="text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{profile?.average_rating?.toFixed(1) || '—'}</p>
          <p className="text-xs text-gray-500">Rating</p>
        </div>
      </div>

      {/* Active Shifts */}
      {activeShifts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Shift</h2>
          {activeShifts.map(shift => (
            <Link
              key={shift.id}
              to={`/worker/shifts/${shift.id}`}
              className="block bg-blue-50 rounded-xl p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.event_name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{shift.role}</p>
                </div>
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Clocked In
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming Shifts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Shifts</h2>
        {upcomingShifts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <Briefcase size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No upcoming shifts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingShifts.map(shift => (
              <Link
                key={shift.id}
                to={`/worker/shifts/${shift.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{shift.event_name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{shift.role}</p>
                    {shift.planned_start && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(shift.planned_start).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${shift.pay_amount?.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      shift.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {shift.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
