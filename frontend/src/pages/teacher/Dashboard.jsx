import { useState, useEffect, useRef } from 'react';
import { classes, schedules, teacherProfile as teacherProfileApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [myClasses, setMyClasses] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    Promise.all([
      classes.list({ limit: 5 }),
      schedules.list({ from: new Date().toISOString() }),
    ]).then(([cls, sched]) => {
      setMyClasses(cls.data.classes || []);
      setUpcoming((sched.data || []).slice(0, 5));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">My Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Your teaching overview</p>

      {/* Public profile card */}
      {user?.id && <TeacherProfileCard userId={user.id} />}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">My Classes</h2>
            <Link to="/app/classes" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {myClasses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No classes assigned yet</p>
          ) : (
            <div className="space-y-2">
              {myClasses.map((c) => (
                <Link key={c.id} to="/app/classes" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.enrolled_count} students · {c.subject}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Upcoming Sessions</h2>
            <Link to="/app/schedules" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No upcoming sessions</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s) => (
                <div key={s.id} className="p-2.5 rounded-lg hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{s.class_name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(s.start_time), 'EEE, MMM d · h:mm a')}</p>
                  {s.zoom_join_url && (
                    <a href={s.zoom_join_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs text-purple-600 hover:underline">
                      Join Zoom
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Teacher Public Profile Card ──────────────────────────────────────────────

function TeacherProfileCard({ userId }) {
  const [profile, setProfile]       = useState(null);
  const [editing, setEditing]       = useState(false);
  const [bio, setBio]               = useState('');
  const [linkedin, setLinkedin]     = useState('');
  const [showOnTeam, setShowOnTeam] = useState(true);
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [saved, setSaved]           = useState(false);
  const fileRef = useRef(null);

  const load = () => {
    teacherProfileApi.get(userId)
      .then((r) => {
        setProfile(r.data);
        setBio(r.data.bio || '');
        setLinkedin(r.data.linkedin_url || '');
        setShowOnTeam(r.data.show_on_team !== false);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [userId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await teacherProfileApi.update(userId, { bio, linkedin_url: linkedin, show_on_team: showOnTeam });
      if (photoFile) {
        await teacherProfileApi.uploadPhoto(userId, photoFile);
      }
      setSaved(true);
      setPhotoFile(null);
      setPhotoPreview(null);
      setEditing(false);
      load();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const cancel = () => {
    setBio(profile?.bio || '');
    setLinkedin(profile?.linkedin_url || '');
    setShowOnTeam(profile?.show_on_team !== false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setError('');
    setEditing(false);
  };

  const currentPhoto = photoPreview || profile?.photo_url || null;
  const initials = profile?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="card p-5 mb-6 border-2 border-brand-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">My Public Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Shown on the public <a href="/team" target="_blank" className="text-brand-600 hover:underline">Team page</a></p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5 px-3">
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      {saved  && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">✓ Profile saved successfully!</div>}

      {/* Photo + name row */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={profile?.name}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-brand-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-100 text-brand-700 font-bold text-xl flex items-center justify-center ring-2 ring-brand-200">
              {initials}
            </div>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center shadow hover:bg-brand-700 transition-colors"
              title="Change photo"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleFileChange} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{profile?.name}</p>
          <p className="text-xs text-brand-600 font-medium">Teacher</p>

          {!editing ? (
            <div className="mt-2 space-y-1">
              {profile?.bio ? (
                <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No bio yet — click Edit Profile to add one.</p>
              )}
              {profile?.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              )}
              <div className="mt-1">
                <span className={`badge ${profile?.show_on_team !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {profile?.show_on_team !== false ? '✓ Visible on team page' : '○ Hidden from team page'}
                </span>
              </div>
            </div>
          ) : (
            /* Edit form */
            <div className="mt-2 space-y-3">
              {photoFile && (
                <p className="text-xs text-brand-600">📷 New photo selected: {photoFile.name}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bio / Profile Message</label>
                <textarea
                  className="input text-sm"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell students and parents about yourself — your background, teaching style, interests…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
                <input
                  type="url"
                  className="input text-sm"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/yourname"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnTeam}
                  onChange={(e) => setShowOnTeam(e.target.checked)}
                  className="accent-brand-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Show my profile on the public Team page</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={cancel} className="btn-secondary text-xs">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary text-xs">
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
