import { useState, useEffect } from 'react';
import Modal from './Modal';
import { applications, publicApi } from '../api';

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

// Shared apply modal — used on the public Landing page and the logged-in Classes page
export default function ApplyModal({ cls, countryCode, country, onClose, onApplied }) {
  const [feeInfo, setFeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [scholarshipRequested, setScholarshipRequested] = useState(false);
  const [scholarshipType, setScholarshipType] = useState('full');
  const [scholarshipReason, setScholarshipReason] = useState('');

  // Waiver blocked: student has a pending waiver request
  if (cls._waiverBlocked) {
    return (
      <Modal open title="Application Paused" onClose={onClose} size="sm">
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl">⏳</div>
          <p className="text-gray-800 font-semibold">Fee Waiver Pending Review</p>
          <p className="text-sm text-gray-500">
            You requested an application fee waiver. You cannot apply to classes until the super admin reviews your request.
          </p>
          <p className="text-sm text-gray-500">
            Check your <strong>Dashboard</strong> for updates. You'll be notified once a decision is made.
          </p>
          <button onClick={onClose} className="btn-secondary w-full mt-2">Close</button>
        </div>
      </Modal>
    );
  }

  useEffect(() => {
    publicApi.applicationFee(countryCode)
      .then((r) => setFeeInfo(r.data))
      .catch(() => setFeeInfo({ fee: 15, currency_symbol: country?.currency_symbol || '$' }))
      .finally(() => setLoading(false));
  }, [countryCode, country]);

  const submit = async () => {
    if (scholarshipRequested && !scholarshipReason.trim()) {
      setError('Please describe why you are requesting a scholarship.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await applications.apply(
        cls.id,
        countryCode,
        scholarshipRequested,
        scholarshipRequested ? scholarshipType : undefined,
        scholarshipRequested ? scholarshipReason.trim() : undefined,
      );
      const data = res.data;

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.stripeNotConfigured) {
        setSuccess('placeholder');
      } else {
        setSuccess('waived');
      }
      setTimeout(onApplied, 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally { setSubmitting(false); }
  };

  if (success === 'waived') {
    return (
      <Modal open title="Application Submitted!" onClose={onClose} size="sm">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-800 font-semibold text-base">Application received!</p>
          <p className="text-sm text-gray-500 mt-2">
            Your application for <strong>{cls.name}</strong> has been submitted — your application fee was waived.
            {scholarshipRequested && " Your scholarship request is included and will be reviewed by the super admin."}
          </p>
        </div>
      </Modal>
    );
  }

  if (success === 'placeholder') {
    return (
      <Modal open title="Application Received" onClose={onClose} size="sm">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-800 font-semibold text-base">Application submitted</p>
          <p className="text-sm text-gray-500 mt-2">
            Your application for <strong>{cls.name}</strong> has been received. Payment collection is being set up — our team will contact you about the application fee.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title={`Apply: ${cls.name}`} onClose={onClose} size="sm">
      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <Row label="Class" value={cls.name} />
            {cls.subject && <Row label="Subject" value={cls.subject} />}
            {cls.price != null && (
              <Row label="Class Fee" value={`${country?.currency_symbol || ''}${Number(cls.price).toLocaleString()} ${cls.currency_code}`} />
            )}
          </div>

          {/* Application fee */}
          <div className={`rounded-xl p-4 text-sm ${feeInfo?.fee_waived || Number(feeInfo?.fee) === 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className="font-medium text-gray-900 mb-1">Application Fee</p>
            {feeInfo?.fee_waived || Number(feeInfo?.fee) === 0 ? (
              <p className="text-green-700 text-xs">✅ Waived — your fee has been approved or you're already enrolled elsewhere.</p>
            ) : (
              <div>
                <p className="text-amber-700 font-semibold text-base">
                  {feeInfo?.currency_symbol || country?.currency_symbol || ''}{feeInfo?.fee}
                  <span className="text-xs font-normal ml-1">{feeInfo?.currency_code}</span>
                </p>
                <p className="text-amber-600 text-xs mt-0.5">One-time fee for your first class application.</p>
              </div>
            )}
          </div>

          {/* Scholarship request */}
          <div className="border border-gray-200 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={scholarshipRequested}
                onChange={(e) => setScholarshipRequested(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Request a scholarship</p>
                <p className="text-xs text-gray-500 mt-0.5">Up to 20% of class seats are reserved for scholarship recipients. The super admin makes the final decision.</p>
              </div>
            </label>

            {scholarshipRequested && (
              <div className="mt-3 ml-6 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Scholarship type preference:</p>
                  {[
                    { value: 'full',    label: 'Full scholarship', desc: 'Class fee fully covered' },
                    { value: 'partial', label: 'Partial scholarship', desc: 'Partial reduction in class fee' },
                  ].map(({ value, label, desc }) => (
                    <label key={value} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${scholarshipType === value ? 'border-brand-400 bg-brand-50' : 'border-gray-200'}`}>
                      <input type="radio" name="scholType" value={value}
                        checked={scholarshipType === value}
                        onChange={() => setScholarshipType(value)} />
                      <div>
                        <span className="font-medium text-gray-900">{label}</span>
                        <span className="text-gray-500 ml-1.5 text-xs">{desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reason for scholarship request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input text-sm w-full"
                    rows={3}
                    placeholder="Briefly describe why you need a scholarship — financial situation, family circumstances, etc."
                    value={scholarshipReason}
                    onChange={(e) => setScholarshipReason(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">The admin will see this when reviewing your request.</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment note */}
          {!(feeInfo?.fee_waived || Number(feeInfo?.fee) === 0) && (
            <div className="flex items-center gap-2 px-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              You'll be taken to Stripe's secure checkout page to complete payment.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? 'Processing…'
                : (feeInfo?.fee_waived || Number(feeInfo?.fee) === 0)
                  ? 'Submit Application'
                  : `Pay ${feeInfo?.currency_symbol || ''}${feeInfo?.fee} & Apply`
              }
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
