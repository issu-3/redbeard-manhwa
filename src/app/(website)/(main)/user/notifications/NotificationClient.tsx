'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Info, MessageSquare, ShieldAlert, Zap, BookOpen, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@prisma/client';

export function NotificationClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    const result = await markNotificationAsRead(id);
    if (!result.success) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      toast.success('All notifications marked as read');
    } else {
      toast.error('Failed to mark all as read');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPLY': return <MessageSquare className="h-5 w-5 text-blue-400" />;
      case 'NEW_CHAPTER': return <BookOpen className="h-5 w-5 text-primary" />;
      case 'ACHIEVEMENT': return <Zap className="h-5 w-5 text-yellow-400" />;
      case 'WARNING': return <ShieldAlert className="h-5 w-5 text-red-400" />;
      default: return <Info className="h-5 w-5 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface rounded-2xl border border-border">
          <Bell className="mx-auto h-12 w-12 text-white/20 mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No notifications yet</h3>
          <p className="text-text-secondary">When you get replies or updates, they&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-all",
                  notification.isRead 
                    ? "bg-surface border-border opacity-70 hover:opacity-100" 
                    : "bg-surface-light border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                )}
              >
                <div className="mt-1 flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-text-secondary mt-1 break-words">
                        {notification.message}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-3">
                    {notification.link && (
                      <Link 
                        href={notification.link}
                        onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                        className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                      >
                        View details
                      </Link>
                    )}
                    
                    {!notification.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors ml-auto"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
