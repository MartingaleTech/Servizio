import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import CreateEvent from './pages/customer/CreateEvent';
import EventDetail from './pages/customer/EventDetail';
import CustomerBookings from './pages/customer/CustomerBookings';
import CustomerProfile from './pages/customer/CustomerProfile';

import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerShifts from './pages/worker/WorkerShifts';
import ShiftDetail from './pages/worker/ShiftDetail';
import WorkerEarnings from './pages/worker/WorkerEarnings';
import WorkerProfile from './pages/worker/WorkerProfile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminEvents from './pages/admin/AdminEvents';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminPricing from './pages/admin/AdminPricing';
import AdminDisputes from './pages/admin/AdminDisputes';

import NotificationsPage from './pages/NotificationsPage';
import ChatPage from './pages/ChatPage';
import DisputesPage from './pages/DisputesPage';
import RateEvent from './pages/customer/RateEvent';
import TipEvent from './pages/customer/TipEvent';
import WorkerRateEvent from './pages/worker/WorkerRateEvent';

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
  if (user.role === 'worker') return <Navigate to="/worker/dashboard" />;
  return <Navigate to="/customer/dashboard" />;
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <RoleRedirect />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <RoleRedirect />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Root redirect */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Customer routes */}
          <Route path="/customer/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/events" element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/events/new" element={<ProtectedRoute allowedRoles={['customer']}><CreateEvent /></ProtectedRoute>} />
          <Route path="/customer/events/:eventId" element={<ProtectedRoute allowedRoles={['customer']}><EventDetail /></ProtectedRoute>} />
          <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['customer']}><CustomerBookings /></ProtectedRoute>} />
          <Route path="/customer/events/:eventId/rate" element={<ProtectedRoute allowedRoles={['customer']}><RateEvent /></ProtectedRoute>} />
          <Route path="/customer/events/:eventId/tip" element={<ProtectedRoute allowedRoles={['customer']}><TipEvent /></ProtectedRoute>} />
          <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />

          {/* Worker routes */}
          <Route path="/worker/dashboard" element={<ProtectedRoute allowedRoles={['worker']}><WorkerDashboard /></ProtectedRoute>} />
          <Route path="/worker/shifts" element={<ProtectedRoute allowedRoles={['worker']}><WorkerShifts /></ProtectedRoute>} />
          <Route path="/worker/shifts/:shiftId" element={<ProtectedRoute allowedRoles={['worker']}><ShiftDetail /></ProtectedRoute>} />
          <Route path="/worker/earnings" element={<ProtectedRoute allowedRoles={['worker']}><WorkerEarnings /></ProtectedRoute>} />
          <Route path="/worker/shifts/:shiftId/rate" element={<ProtectedRoute allowedRoles={['worker']}><WorkerRateEvent /></ProtectedRoute>} />
          <Route path="/worker/profile" element={<ProtectedRoute allowedRoles={['worker']}><WorkerProfile /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminVerifications /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['admin']}><AdminEvents /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayouts /></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute allowedRoles={['admin']}><AdminPricing /></ProtectedRoute>} />
          <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={['admin']}><AdminDisputes /></ProtectedRoute>} />

          {/* Shared routes */}
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/disputes" element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
