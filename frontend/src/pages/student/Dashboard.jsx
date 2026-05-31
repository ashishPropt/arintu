import { useState, useEffect, useRef } from 'react';
import { classes, schedules, verification as verificationApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function StudentDashboard() {
  const { user, reload: reloadUser } = useAuth();
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [totalSchedules, setTotalSchedules] = useState(0);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    Promise.all([
      // enrolledOnly=true gives accurate count of actually enrolled classes
      classes.list({ enrolledOnly: true, limit: 200 }),
      // Fetch all upcoming — use count for badge, slice for display
      schedules.list({ from: new Date().toISOString() }),
    ]).then(([cls, sched]) => {
      const enrolled = cls.data.classes || [];
      const allUpcoming = sched.data || [];
      setEnrolledCount(enrolled.length);
      setTotalSchedules(allUpcoming.length);
      setUpcoming(allUpcoming.slice(0, 5));
    }).catch(() => {});
  }, []);

  const verificationStatus = user?.verification_status;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">My Learning</h1>
      <p className="text-sm text-gray-500 mb-6">Your enrolled classes and upcoming sessions</p>

      {/* ID Verification Card */}
      <VerificationCard status={verificationStatus} notes={user?.verification_notes} onUploaded={reloadUser} />

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {enrolledCount}
          </div>
          <div>
            <p className="text-xs text-gray-500">Enrolled Classes</p>
            <Link to="/app/classes" className="text-sm font-semibold text-gray-900 hover:text-brand-600">View classes</Link>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {totalSchedules}
          </div>
          <div>
            <p className="text-xs text-gray-500">Upcoming Sessions</p>
            <Link to="/app/schedules" className="text-sm font-semibold text-gray-900 hover:text-brand-600">View schedule</Link>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Next Sessions</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((s) => (
              <div key={s.id} className="py-3 flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold leading-none">{format(new Date(s.start_time), 'MMM')}</span>
                  <span className="text-base font-bold leading-none">{format(new Date(s.start_time), 'd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.class_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(s.start_time), 'h:mm a')} — {format(new Date(s.end_time), 'h:mm a')}</p>
                  {s.zoom_join_url && (
                    <a href={s.zoom_join_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-purple-50 text-purple-600 text-xs rounded-lg hover:bg-purple-100 transition-colors">
                      Join Zoom Meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function VerificationCard({ status, notes, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      await verificationApi.uploadId(file);
      onUploaded(); // reload user so verification_status updates
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (status === 'approved') {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-800">Identity Verified</p>
          <p className="text-xs text-green-700">Your ID has been verified. You are eligible to apply to classes.</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <span className="text-2xl">⏳</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">ID Verification Pending</p>
          <p className="text-xs text-amber-700">Your document is under review. You can apply once it is approved.</p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-sm font-semibold text-red-800">ID Verification Not Approved</p>
            <p className="text-xs text-red-700">
              {notes ? `Reason: ${notes}` : 'Your document could not be verified.'}
              {' '}Please upload a clear government-issued ID.
            </p>
          </div>
        </div>
        {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFile} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-red-600 underline hover:no-underline disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Re-upload ID document'}
        </button>
      </div>
    );
  }

  // Not yet uploaded
  return (
    <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🪪</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800">ID Verification Required</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Upload a government-issued ID (passport, driver license, or national ID) to apply to classes.
            Accepted: JPG, PNG, PDF · Max 5 MB.
          </p>
        </div>
      </div>
      {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload ID Document →'}
      </button>
    </div>
  );
}

