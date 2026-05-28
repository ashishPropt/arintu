import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { payments } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const appId = searchParams.get('app_id');
  const { user } = useAuth();
  const [cleaned, setCleaned] = useState(false);

  useEffect(() => {
    // Clean up the pending application record so the student can apply again later
    if (appId && user) {
      payments.cancelPending(appId)
        .then(() => setCleaned(true))
        .catch(() => setCleaned(true)); // best-effort
    } else {
      setCleaned(true);
    }
  }, [appId, user]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-5">↩️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment cancelled</h1>
      <p className="text-gray-600 mb-6 leading-relaxed">
        No problem — you haven't been charged. Your application was not submitted. You can apply again whenever you're ready.
      </p>

      {!cleaned && (
        <div className="flex justify-center mb-6">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Link to="/" className="btn-primary">Back to classes</Link>
        <Link to="/app/dashboard" className="btn-secondary">Dashboard</Link>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Need help?{' '}
        <a href="mailto:infoenfinitty@gmail.com" className="text-brand-600 underline">
          Contact us
        </a>
      </p>
    </div>
  );
}
