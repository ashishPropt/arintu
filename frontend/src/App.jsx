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
import Pricing from './pages/superadmin/Pricing';
import Regions from './pages/superadmin/Regions';
import Countries from './pages/superadmin/Countries';
import FeeWaivers from './pages/superadmin/FeeWaivers';
import Scholarships from './pages/superadmin/Scholarships';
import ManageTeam from './pages/superadmin/ManageTeam';
import ManageCities from './pages/superadmin/ManageCities';
import ManageBooks from './pages/superadmin/ManageBooks';
import Applications from './pages/admin/Applications';

// Public content pages
import Team from './pages/public/Team';
import AboutCities from './pages/public/AboutCities';
import AboutCountries from './pages/public/AboutCountries';
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
  if (roles && !roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/login" element={<LoginRedirect />} />

          {/* Public pages — all wrapped in PublicLayout (shared header + footer) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/about/team"      element={<Team />} />
            <Route path="/about/cities"    element={<AboutCities />} />
            <Route path="/about/countries" element={<AboutCountries />} />
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
            <Route path="fee-waivers" element={
              <RequireAuth roles={['superadmin']}>
                <FeeWaivers />
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
            <Route path="manage-cities" element={
              <RequireAuth roles={['superadmin']}>
                <ManageCities />
              </RequireAuth>
            } />
            <Route path="manage-books" element={
              <RequireAuth roles={['superadmin']}>
                <ManageBooks />
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
