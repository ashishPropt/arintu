import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Schedules from './pages/Schedules';
import Users from './pages/Users';
import Pricing from './pages/superadmin/Pricing';
import Regions from './pages/superadmin/Regions';
import Countries from './pages/superadmin/Countries';
import Applications from './pages/admin/Applications';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="classes" element={<Classes />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="users" element={
              <RequireAuth roles={['superadmin', 'admin']}>
                <Users />
              </RequireAuth>
            } />
            <Route path="pricing" element={
              <RequireAuth roles={['superadmin']}>
                <Pricing />
              </RequireAuth>
            } />
            <Route path="regions" element={
              <RequireAuth roles={['superadmin']}>
                <Regions />
              </RequireAuth>
            } />
            <Route path="countries" element={
              <RequireAuth roles={['superadmin']}>
                <Countries />
              </RequireAuth>
            } />
            <Route path="applications" element={
              <RequireAuth roles={['superadmin', 'admin']}>
                <Applications />
              </RequireAuth>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <Login />;
}
