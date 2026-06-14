import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import DiscountBanner from './DiscountBanner';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 -ml-1.5"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
            </svg>
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <DiscountBanner />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
