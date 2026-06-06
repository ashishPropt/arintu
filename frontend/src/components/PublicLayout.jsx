import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const aboutLinks = [
  { to: '/about/team',    label: 'Team' },
  { to: '/about/cities',  label: 'Country' },
  { to: '/about/hq',      label: 'HQ Address' },
  { to: '/about/history', label: 'History' },
  { to: '/about/jobs',    label: 'Jobs' },
  { to: '/about/faq',     label: 'FAQ' },
];

const communityLinks = [
  { to: '/community/book-club',          label: 'Book Club' },
  { to: '/community/arintu-online',      label: 'Arintu Online' },
  { to: '/community/enfinitty-circle',   label: 'Enfinitty Circle' },
  { to: '/community/testimonials',       label: 'Testimonials' },
  { to: '/community/gallery',            label: '📷 Gallery' },
];

function NavDropdown({ label, links, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-50">
          {links.map(({ to, label: lbl }) => (
            <Link
              key={to}
              to={to}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {lbl}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50">
      {/* Sticky header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Home
            </Link>
            <NavDropdown label="About Us" links={aboutLinks} />
            <NavDropdown label="Community" links={communityLinks} />
            <Link
              to="/blog"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Blog
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right: CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => navigate('/app/dashboard')} className="btn-primary text-sm">
                Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block btn-secondary text-sm">Sign in</Link>
                <Link to="/login" className="sm:hidden btn-primary text-sm">Sign in</Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                {mobileOpen
                  ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <MobileSection label="Home" links={[{ to: '/', label: 'Home' }]} onNav={() => setMobileOpen(false)} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1 px-2">About Us</p>
            {aboutLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
                {label}
              </Link>
            ))}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1 px-2">Community</p>
            {communityLinks.map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
                {label}
              </Link>
            ))}
            <Link to="/blog" onClick={() => setMobileOpen(false)}
              className="block mt-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700">
              📝 Blog
            </Link>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2 pb-1 px-2">Legal</p>
            <Link to="/contact" onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
              Contact Us
            </Link>
            <Link to="/terms" onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
              Terms
            </Link>
            <Link to="/privacy" onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
              Privacy
            </Link>
          </div>
        )}
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-4 gap-8">
          <div>
            <Logo size="sm" />
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              Quality education for every learner, everywhere.
            </p>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              12268 Darkwood Road<br />
              San Diego, CA 92129
            </p>
            <a href="mailto:infoenfinitty@gmail.com" className="text-xs text-brand-500 hover:underline mt-1 block">
              infoenfinitty@gmail.com
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">About Us</p>
            <ul className="space-y-2">
              {aboutLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-brand-600">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Community</p>
            <ul className="space-y-2">
              {communityLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-brand-600">{label}</Link>
                </li>
              ))}
              <li><Link to="/blog" className="text-sm text-gray-500 hover:text-brand-600">📝 Blog</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Legal</p>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-sm text-gray-500 hover:text-brand-600">Contact Us</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-500 hover:text-brand-600">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-gray-500 hover:text-brand-600">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Arintu Learning Inc. All rights reserved. &nbsp;·&nbsp;
          <Link to="/terms" className="hover:text-gray-600">Terms</Link>
          &nbsp;·&nbsp;
          <Link to="/privacy" className="hover:text-gray-600">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}

function MobileSection({ links, onNav }) {
  return links.map(({ to, label }) => (
    <Link key={to} to={to} onClick={onNav}
      className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700">
      {label}
    </Link>
  ));
}
