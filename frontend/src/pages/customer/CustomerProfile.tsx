import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, Building } from 'lucide-react';

export default function CustomerProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 capitalize">{user?.role} Account</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail size={18} className="text-gray-400" />
            <span className="text-sm">{user?.email}</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-3 text-gray-700">
              <Phone size={18} className="text-gray-400" />
              <span className="text-sm">{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-gray-700">
            <Building size={18} className="text-gray-400" />
            <span className="text-sm">Event Host</span>
          </div>
        </div>
      </div>
    </div>
  );
}
