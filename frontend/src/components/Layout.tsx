import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Calendar,
  User,
  Bell,
  LogOut,
  Settings,
  Users,
  Briefcase,
  DollarSign,
  BarChart3,
  Clock,
  Shield,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const customerNav = [
    { path: '/customer/dashboard', icon: Home, label: 'Home' },
    { path: '/customer/events', icon: Calendar, label: 'Events' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/customer/bookings', icon: Briefcase, label: 'Bookings' },
    { path: '/customer/profile', icon: User, label: 'Profile' },
  ];

  const workerNav = [
    { path: '/worker/dashboard', icon: Home, label: 'Home' },
    { path: '/worker/shifts', icon: Clock, label: 'Shifts' },
    { path: '/chat', icon: MessageCircle, label: 'Chat' },
    { path: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
    { path: '/worker/profile', icon: User, label: 'Profile' },
  ];

  const adminNav = [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/verifications', icon: Shield, label: 'Verify' },
    { path: '/admin/events', icon: Calendar, label: 'Events' },
    { path: '/admin/payouts', icon: DollarSign, label: 'Payouts' },
    { path: '/admin/disputes', icon: AlertTriangle, label: 'Disputes' },
    { path: '/admin/pricing', icon: Settings, label: 'Pricing' },
  ];

  const navItems =
    user?.role === 'admin'
      ? adminNav
      : user?.role === 'worker'
      ? workerNav
      : customerNav;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            Servizio
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700"
            >
              <Bell size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
