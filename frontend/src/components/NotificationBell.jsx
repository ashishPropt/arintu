import { useState, useEffect, useRef } from 'react';
import { notifications as notifApi } from '../api';
import { formatDistanceToNow } from 'date-fns';

const typeColor = {
  class: 'bg-blue-50 text-blue-600',
  schedule: 'bg-green-50 text-green-600',
  zoom: 'bg-purple-50 text-purple-600',
  payment: 'bg-yellow-50 text-yellow-600',
  system: 'bg-gray-50 text-gray-600',
  info: 'bg-gray-50 text-gray-600',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const ref = useRef(null);

  const load = async () => {
    try {
      const res = await notifApi.list({ limit: 10 });
      setData(res.data);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await notifApi.markRead(id);
    setData((d) => ({
      ...d,
      unreadCount: Math.max(0, d.unreadCount - 1),
      notifications: d.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    }));
  };

  const markAll = async () => {
    await notifApi.markAllRead();
    setData((d) => ({ ...d, unreadCount: 0, notifications: d.notifications.map((n) => ({ ...n, is_read: true })) }));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <BellIcon className="w-5 h-5 text-gray-600" />
        {data.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 card shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {data.unreadCount > 0 && (
              <button onClick={markAll} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {data.notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
            ) : (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`badge mt-0.5 shrink-0 ${typeColor[n.type]}`}>{n.type}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
    </svg>
  );
}
