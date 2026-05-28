import { useState, useEffect } from 'react';
import { classes, schedules } from '../../api';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function TeacherDashboard() {
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">My Classes</h2>
            <Link to="/classes" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          {myClasses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No classes assigned yet</p>
          ) : (
            <div className="space-y-2">
              {myClasses.map((c) => (
                <Link key={c.id} to={`/classes/${c.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50">
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
            <Link to="/schedules" className="text-xs text-brand-600 hover:underline">View all</Link>
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
