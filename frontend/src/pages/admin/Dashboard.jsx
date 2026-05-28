import { useState, useEffect } from 'react';
import { classes, users, schedules } from '../../api';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0 });
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    Promise.all([
      classes.list({ limit: 1 }),
      users.list({ role: 'teacher', limit: 1 }),
      users.list({ role: 'student', limit: 1 }),
      schedules.list({ from: new Date().toISOString(), limit: 5 }),
    ]).then(([cls, teachers, students, sched]) => {
      setStats({ classes: cls.data.total || 0, teachers: teachers.data.total || 0, students: students.data.total || 0 });
      setUpcoming(sched.data.slice(0, 5));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your classes and users</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Classes" value={stats.classes} link="/classes" color="brand" />
        <StatCard label="Teachers" value={stats.teachers} link="/users?role=teacher" color="green" />
        <StatCard label="Students" value={stats.students} link="/users?role=student" color="orange" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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
                <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">{format(new Date(s.start_time), 'd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.class_name}</p>
                    <p className="text-xs text-gray-500">{format(new Date(s.start_time), 'MMM d, h:mm a')}</p>
                    {s.zoom_join_url && (
                      <span className="badge bg-purple-50 text-purple-600 mt-0.5">Zoom</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/classes" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center font-bold">+</span>
              Create new class
            </Link>
            <Link to="/schedules" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-bold">📅</span>
              Schedule a session
            </Link>
            <Link to="/users" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold">👤</span>
              Add teacher or student
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, link, color }) {
  const colors = {
    brand: 'text-brand-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
  };
  return (
    <Link to={link} className="card p-4 hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
    </Link>
  );
}
