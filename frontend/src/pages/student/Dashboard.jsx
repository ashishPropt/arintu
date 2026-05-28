import { useState, useEffect } from 'react';
import { classes, schedules } from '../../api';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function StudentDashboard() {
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
      <h1 className="text-xl font-bold text-gray-900 mb-1">My Learning</h1>
      <p className="text-sm text-gray-500 mb-6">Your enrolled classes and upcoming sessions</p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {myClasses.length}
          </div>
          <div>
            <p className="text-xs text-gray-500">Enrolled Classes</p>
            <Link to="/app/classes" className="text-sm font-semibold text-gray-900 hover:text-brand-600">View classes</Link>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold text-lg">
            {upcoming.length}
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
