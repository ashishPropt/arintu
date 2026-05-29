import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { payments } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'pending' | 'error' | 'auth_required' | 'not_configured'
  const [result, setResult] = useState(null);   // full API response
  const [error, setError] = useState('');
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setStatus('auth_required'); return; }
    if (!sessionId) { setError('No payment session found in the URL.'); setStatus('error'); return; }
    verify();
  }, [sessionId, user, authLoading]);

  const verify = async () => {
    setStatus('verifying');
    try {
      const res = await payments.verify(sessionId);
      if (res.data.paid) {
        setResult(res.data);
        setStatus('success');
      } else {
        if (retries < 4) {
          setTimeout(() => { setRetries((r) => r + 1); verify(); }, 2500);
        } else {
          setStatus('pending');
        }
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'STRIPE_NOT_CONFIGURED') {
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
    const { feeType, nextStep, enrolled, application } = result || {};
    const className = application?.class_name || 'the class';

    // ── Class fee paid → fully enrolled ──────────────────────────────────────
    if (feeType === 'class_fee' || enrolled) {
      return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-5">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're enrolled!</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your payment was confirmed and you are now fully enrolled in{' '}
            <strong>{className}</strong>. Check your dashboard for the class schedule.
          </p>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Class</span>
              <span className="font-medium text-gray-900">{className}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Class fee</span>
              <span className="font-medium text-green-700">✓ Paid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Enrolment status</span>
              <span className="font-medium text-green-700">✓ Enrolled</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link to="/" className="btn-secondary">Browse classes</Link>
            <Link to="/app/dashboard" className="btn-primary">Go to Dashboard</Link>
          </div>
        </div>
      );
    }

    // ── App fee paid, class fee still needed ──────────────────────────────────
    if (feeType === 'app_fee' && nextStep === 'class_fee') {
      return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-5">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application fee confirmed!</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your one-time application fee has been received. The next step is to pay the class fee
            for <strong>{className}</strong> to complete your enrolment.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Class</span>
              <span className="font-medium text-gray-900">{className}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Application fee</span>
              <span className="font-medium text-green-700">✓ Paid (one-time, waived in future)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Class fee</span>
              <span className="font-medium text-amber-700">⟳ Payment required</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Enrolment status</span>
              <span className="font-medium text-amber-700">Pending class fee</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            Go to your dashboard and click on the class to proceed with the class fee payment.
            You can also request a scholarship if applicable.
          </p>

          <div className="flex gap-3 justify-center">
            <Link to="/" className="btn-secondary">Browse classes</Link>
            <Link to="/app/dashboard" className="btn-primary">Go to Dashboard</Link>
          </div>
        </div>
      );
    }

    // ── Fallback success (free class auto-enrolled, or unknown feeType) ───────
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-5">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Your payment for <strong>{className}</strong> has been received.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-secondary">Browse classes</Link>
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
          Your application has been submitted. Our team will be in touch about next steps shortly.
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
          Your payment was received by Stripe but is still being confirmed on our end.
          This usually resolves within a minute.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setRetries(0); verify(); }} className="btn-primary">
            Check again
          </button>
          <Link to="/app/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          If this persists, email us at{' '}
          <a href="mailto:infoenfinitty@gmail.com" className="underline">infoenfinitty@gmail.com</a>{' '}
          with your payment reference.
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
        <a href="mailto:infoenfinitty@gmail.com" className="text-brand-600 underline">
          infoenfinitty@gmail.com
        </a>
      </p>
      <Link to="/" className="btn-secondary">Back to classes</Link>
    </div>
  );
}
