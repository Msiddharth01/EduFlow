'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  HelpCircle,
  GraduationCap,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { notificationApi, AppNotification } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.list();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 20 seconds for real-time updates
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Continue navigation even if mark as read fails
      }
    }
    setIsOpen(false);
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'MATERIAL_UPLOADED':
        return <FileText className="w-4 h-4 text-[var(--primary)]" />;
      case 'QUIZ_PUBLISHED':
        return <HelpCircle className="w-4 h-4 text-emerald-500" />;
      case 'QUIZ_RESULT':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'STUDENT_ENROLLED':
        return <Users className="w-4 h-4 text-[var(--primary)]" />;
      case 'ASSIGNMENT_SUBMISSION':
        return <GraduationCap className="w-4 h-4 text-[var(--primary)]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--primary)]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-muted)',
        }}
        className="p-2 rounded-full border hover:opacity-80 transition-all cursor-pointer relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            style={{ backgroundColor: 'var(--primary)' }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          }}
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div
            style={{
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-subtle)',
            }}
            className="px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-main)]">Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(53, 106, 230, 0.3)',
                  }}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-full"
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                style={{ color: 'var(--primary)' }}
                className="text-xs font-semibold hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-color)]">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div
                  style={{ backgroundColor: 'var(--bg-subtle)' }}
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-[var(--text-muted)] mb-3"
                >
                  <Bell className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-[var(--text-main)]">No notifications yet</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  You will receive updates when course materials, quizzes, or enrollments occur.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    backgroundColor: notif.isRead ? 'transparent' : 'var(--bg-subtle)',
                  }}
                  className={`p-3.5 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer flex gap-3 items-start relative group ${
                    !notif.isRead ? 'font-medium' : 'opacity-85'
                  }`}
                >
                  {/* Icon */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                    }}
                    className="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs"
                  >
                    {getIconForType(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-main)] line-clamp-1">
                        {notif.title}
                      </span>
                      {notif.course && (
                        <span
                          style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(53, 106, 230, 0.25)',
                          }}
                          className="text-[10px] px-1.5 py-0.2 rounded-md font-medium"
                        >
                          {notif.course.code}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-subtle)]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(notif.createdAt)}
                      </span>
                      {notif.linkUrl && (
                        <span
                          style={{ color: 'var(--primary)' }}
                          className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5"
                        >
                          View details <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / Status dot */}
                  <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        title="Mark as read"
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!notif.isRead && (
                      <span
                        style={{ backgroundColor: 'var(--primary)' }}
                        className="w-2 h-2 rounded-full shadow-xs"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
