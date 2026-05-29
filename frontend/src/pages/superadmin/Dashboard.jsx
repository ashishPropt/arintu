import { useState, useEffect } from 'react';
import { users, classes, pricing } from '../../api';
import { Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ admins: 0, teachers: 0, students: 0, classes: 0, tiers: 0 });

  useEffect(() => {
    Promise.all([
      users.list({ role: 'admin', limit: 1 }),
      users.list({ role: 'teacher', limit: 1 }),
      users.list({ role: 'student', limit: 1 }),
      classes.list({ limit: 1 }),
      pricing.list(),
    ]).then(([admins, teachers, students, cls, tiers]) => {
      setStats({
        admins:   admins.data.total   || 0,
        teachers: teachers.data.total || 0,
        students: students.data.total || 0,
        classes:  cls.data.total      || cls.data.classes?.length || 0,
        tiers:    tiers.data.length   || 0,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'Admins', value: stats.admins, color: 'text-blue-600 bg-blue-50', link: '/app/users?role=admin' },
    { label: 'Teachers', value: stats.teachers, color: 'text-green-600 bg-green-50', link: '/app/users?role=teacher' },
    { label: 'Students', value: stats.students, color: 'text-orange-600 bg-orange-50', link: '/app/users?role=student' },
    { label: 'Classes', value: stats.classes, color: 'text-purple-600 bg-purple-50', link: '/app/classes' },
    { label: 'Pricing Tiers', value: stats.tiers, color: 'text-pink-600 bg-pink-50', link: '/app/pricing' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Super Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Platform overview</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(({ label, value, color, link }) => (
          <Link key={label} to={link} className="card p-4 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/app/users" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">+</span>
              Add Admin / Teacher
            </Link>
            <Link to="/app/pricing" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center text-xs font-bold">$</span>
              Manage Pricing Tiers
            </Link>
            <Link to="/app/countries" className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
              <span className="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-xs font-bold">🌍</span>
              Countries &amp; Fees
            </Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-3">System Status</h2>
          <div className="space-y-2">
            <StatusRow label="API Server" status="online" />
            <StatusRow label="Database" status="online" />
            <StatusRow label="Zoom Integration" status="pending" note="Configure credentials" />
            <StatusRow label="Mathwave Integration" status="pending" note="Awaiting API docs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status, note }) {
  const color = status === 'online' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100';
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        {note && <span className="text-xs text-gray-400">{note}</span>}
        <span className={`badge ${color}`}>{status}</span>
      </div>
    </div>
  );
}
