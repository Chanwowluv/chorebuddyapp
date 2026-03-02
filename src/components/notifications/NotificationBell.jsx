import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ClipboardCheck, UserPlus, AlertTriangle } from 'lucide-react';
import { useNotificationCenter } from '@/components/hooks/useNotificationCenter';

const NOTIFICATION_ICONS = {
  chore_assigned: { icon: ClipboardCheck, color: 'text-blue-500' },
  chore_completed: { icon: Check, color: 'text-green-500' },
  chore_overdue: { icon: AlertTriangle, color: 'text-amber-500' },
  member_joined: { icon: UserPlus, color: 'text-purple-500' },
};

function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotificationCenter();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/30 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 text-[#5E3B85]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center header-font">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl shadow-lg border-2 border-[#C3B1E1]/30 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <h3 className="header-font text-lg text-[#5E3B85]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs body-font text-[#2B59C3] hover:underline"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => { clearAll(); setIsOpen(false); }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="body-font-light text-sm text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notif => {
                const config = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.chore_assigned;
                const IconComponent = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`w-full text-left flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      !notif.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className={`mt-0.5 ${config.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!notif.read ? 'body-font text-gray-900' : 'body-font-light text-gray-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs body-font-light text-gray-500 truncate">{notif.body}</p>
                      <p className="text-xs body-font-light text-gray-400 mt-0.5">
                        {formatRelativeTime(notif.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
