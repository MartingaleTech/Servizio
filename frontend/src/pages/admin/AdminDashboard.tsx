import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { AdminStats } from '../../types';
import { Users, Calendar, DollarSign, Shield, Briefcase, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminStats>('/api/admin/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Users size={20} className="text-indigo-500 mb-1" />
          <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Calendar size={20} className="text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{stats?.total_events || 0}</p>
          <p className="text-xs text-gray-500">Total Events</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Briefcase size={20} className="text-green-500 mb-1" />
          <p className="text-2xl font-bold">{stats?.total_bookings || 0}</p>
          <p className="text-xs text-gray-500">Bookings</p>
        </div>
        <Link
          to="/admin/verifications"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <Shield size={20} className="text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{stats?.pending_verifications || 0}</p>
          <p className="text-xs text-gray-500">Pending Verifications</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <DollarSign size={20} className="text-green-500 mb-1" />
          <p className="text-xl font-bold">${(stats?.total_revenue || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <DollarSign size={20} className="text-orange-500 mb-1" />
          <p className="text-xl font-bold">${(stats?.total_payouts || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Payouts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Customers</p>
          <p className="text-xl font-bold">{stats?.total_customers || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Workers</p>
          <p className="text-xl font-bold">{stats?.total_workers || 0}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        {[
          { to: '/admin/users', label: 'Manage Users', icon: Users },
          { to: '/admin/verifications', label: 'Review Verifications', icon: Shield },
          { to: '/admin/events', label: 'View Events', icon: Calendar },
          { to: '/admin/payouts', label: 'Manage Payouts', icon: DollarSign },
          { to: '/admin/pricing', label: 'Pricing Rules', icon: BarChart3 },
        ].map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-shadow"
          >
            <link.icon size={20} className="text-indigo-500" />
            <span className="font-medium text-gray-900">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
