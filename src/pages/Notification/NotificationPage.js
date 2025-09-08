
import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useDonation } from '../../contexts/DonationContext';
import { useAuth } from '../../contexts/AuthContext';

const NotificationPage = () => {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, getNotificationIcon, getNotificationColor, NOTIFICATION_TYPES } = useNotification();
  const { updateRequestStatus } = useDonation();
  const { userProfile } = useAuth();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const types = [
    { value: 'all', label: 'All' },
    ...Object.entries(NOTIFICATION_TYPES).map(([k, v]) => ({ value: v, label: k.replace(/_/g, ' ').toLowerCase() }))
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <button className="btn-primary px-4 py-2" onClick={markAllAsRead}>Mark all as read</button>
        </div>
        <div className="flex gap-2 mb-4">
          <label className="text-sm text-gray-600">Filter:</label>
          <select className="input-field" value={filter} onChange={e => setFilter(e.target.value)}>
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="text-gray-600">No notifications.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <div key={n.id} className={`p-4 border border-${getNotificationColor(n.type)}-200 rounded-lg flex items-center justify-between ${n.isRead ? '' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getNotificationIcon(n.type)}</span>
                  <div>
                    <div className="font-medium text-gray-900">{n.title}</div>
                    <div className="text-sm text-gray-600">{n.message}</div>
                    <div className="text-xs text-gray-400">{new Date(n.createdAt?.toDate?.() || n.createdAt || Date.now()).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Accept button for volunteers on Volunteer Needed notifications */}
                  {/* Accept button for volunteers removed: assignment now handled in Donations page only */}
                  {!n.isRead && <button className="text-blue-600" onClick={() => markAsRead(n.id)}>Mark as read</button>}
                  <button className="text-red-600" onClick={() => deleteNotification(n.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;