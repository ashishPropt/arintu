import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Schedules from './pages/Schedules';
import Users from './pages/Users';
import Worksheets from './pages/Worksheets';
import Pricing from './pages/superadmin/Pricing';
import Regions from './pages/superadmin/Regions';
import Countries from './pages/superadmin/Countries';
import Scholarships from './pages/superadmin/Scholarships';
import ManageTeam from './pages/superadmin/ManageTeam';
import PendingAccounts from './pages/superadmin/PendingAccounts';
import Applications from './pages/admin/Applications';
import StudentVerification from './pages/admin/StudentVerification';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import PendingVerification from './pages/PendingVerification';
import ForcePasswordChange from './pages/ForcePasswordChange';
import Family from './pages/Family';
import TwoFactorSetup from './pages/TwoFactorSetup';
import Recordings from './pages/Recordings';

// Public content pages
import Team from './pages/public/Team';
import AboutCities from './pages/public/AboutCities';
import HQAddress from './pages/public/HQAddress';
import History from './pages/public/History';
import Jobs from './pages/public/Jobs';
import FAQ from './pages/public/FAQ';
import BookClub from './pages/public/BookClub';
import ArintuOnline from './pages/public/ArintuOnline';
import EnfinittyCircle from './pages/public/EnfinittyCircle';
import ContactUs from './pages/public/ContactUs';
import Terms from './pages/public/Terms';
import Privacy from './pages/public/Privacy';
import PaymentSuccess from './pages/public/PaymentSuccess';
import PaymentCancel from './pages/public/PaymentCancel';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // Accounts awaiting ID verification cannot access the main app
  if (user.account_status === 'pending' || user.account_status === 'rejected') {
    return <Navigate to="/pending-verification" replace />;
  }
  // Accounts created by family members must set their own password first
  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending-verification" element={<PendingVerification />} />
          <Route path="/change-password" element={<ForcePasswordChange />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public pages — wrapped in PublicLayout (shared header + footer) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<SmartLanding />} />
            <Route path="/about/team"      element={<Team />} />
            <Route path="/about/cities"    element={<AboutCities />} />
            <Route path="/about/countries" element={<Navigate to="/about/cities" replace />} />
            <Route path="/about/hq"        element={<HQAddress />} />
            <Route path="/about/history"   element={<History />} />
            <Route path="/about/jobs"      element={<Jobs />} />
            <Route path="/about/faq"       element={<FAQ />} />
            <Route path="/community/book-club"        element={<BookClub />} />
            <Route path="/community/arintu-online"    element={<ArintuOnline />} />
            <Route path="/community/enfinitty-circle" element={<EnfinittyCircle />} />
            <Route path="/contact"         element={<ContactUs />} />
            <Route path="/terms"           element={<Terms />} />
            <Route path="/privacy"         element={<Privacy />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel"  element={<PaymentCancel />} />
          </Route>

          {/* Authenticated app */}
          <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="classes" element={<Classes />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="worksheets" element={<Worksheets />} />
            <Route path="users" element={
              <RequireAuth roles={['superadmin', 'admin']}>
                <Users />
              </RequireAuth>
            } />
            <Route path="verification" element={
              <RequireAuth roles={['superadmin', 'admin']}>
                <StudentVerification />
              </RequireAuth>
            } />
            <Route path="pending-accounts" element={
              <RequireAuth roles={['superadmin']}>
                <PendingAccounts />
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
            <Route path="scholarships" element={
              <RequireAuth roles={['superadmin']}>
                <Scholarships />
              </RequireAuth>
            } />
            <Route path="manage-team" element={
              <RequireAuth roles={['superadmin']}>
                <ManageTeam />
              </RequireAuth>
            } />
            <Route path="family" element={
              <RequireAuth roles={['student', 'parent']}>
                <Family />
              </RequireAuth>
            } />
            <Route path="recordings" element={<Recordings />} />
            <Route path="security" element={<TwoFactorSetup />} />
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
  if (user) {
    if (user.account_status === 'pending' || user.account_status === 'rejected') {
      return <Navigate to="/pending-verification" replace />;
    }
    if (user.must_change_password) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Login />;
}

// Show the public landing page to everyone — logged-in users see a Dashboard button in the header.
function SmartLanding() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Landing />;
}
