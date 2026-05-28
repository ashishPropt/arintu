import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { payments } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'pending' | 'error' | 'auth_required'
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus('auth_required');
      return;
    }

    if (!sessionId) {
      setStatus('error');
      setError('No payment session found in the URL.');
      return;
    }

    verify();
  }, [sessionId, user, authLoading]);

  const verify = async () => {
    setStatus('verifying');
    try {
      const res = await payments.verify(sessionId);
      if (res.data.paid) {
        setApplication(res.data.application);
        setStatus('success');
      } else {
        // Payment not yet confirmed — Stripe may be processing
        if (retries < 4) {
          setTimeout(() => {
            setRetries((r) => r + 1);
            verify();
          }, 2500);
        } else {
          setStatus('pending');
        }
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'STRIPE_NOT_CONFIGURED') {
        // Stripe not yet configured on the backend — treat as success placeholder
        setStatus('not_configured');
      } else {
        setError(err.response?.data?.error || 'Could not verify your payment. Please contact support.');
        setStatus('error');
      }
    }
  };

  if (authLoading || status === 'verifying') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (status === 'auth_required') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to confirm</h1>
        <p className="text-sm text-gray-500 mb-6">
          Please sign in to verify your payment and view your application.
        </p>
        <Link to="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-5">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Your application for{' '}
          <strong>{application?.class_name || 'the class'}</strong> has been submitted and
          your payment received. We'll review your application and notify you of the outcome.
        </p>

        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6 text-sm text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Class</span>
            <span className="font-medium text-gray-900">{application?.class_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Application fee</span>
            <span className="font-medium text-green-700">✓ Paid</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Application status</span>
            <span className="font-medium text-amber-700">Pending review</span>
          </div>
          {application?.scholarship_requested && (
            <div className="flex justify-between">
              <span className="text-gray-500">Scholarship request</span>
              <span className="font-medium text-purple-700">Included</span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-6">
          Your application fee is a one-time charge — it's waived for all future class applications.
        </p>

        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-secondary">Browse more classes</Link>
          <Link to="/app/dashboard" className="btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (status === 'not_configured') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-5">📋</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application received</h1>
        <p className="text-gray-600 mb-6">
          Your application has been submitted. Our team will be in touch about the application fee shortly.
        </p>
        <Link to="/app/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment is processing</h1>
        <p className="text-sm text-gray-500 mb-6">
          Your payment was received by Stripe but is still being confirmed on our end. This usually resolves within a minute.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setRetries(0); verify(); }} className="btn-primary">
            Check again
          </button>
          <Link to="/app/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          If this persists, email us at{' '}
          <a href="mailto:infoenfinitty@gmail.com" className="underline">infoenfinitty@gmail.com</a>
          {' '}with your payment reference.
        </p>
      </div>
    );
  }

  // error state
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-2">{error}</p>
      <p className="text-xs text-gray-400 mb-6">
        If you were charged, please contact us at{' '}
        <a href="mailto:infoenfinitty@gmail.com" className="text-brand-600 underline">infoenfinitty@gmail.com</a>
      </p>
      <Link to="/" className="btn-secondary">Back to classes</Link>
    </div>
  );
}
