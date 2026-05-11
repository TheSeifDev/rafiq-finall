import { useState, useEffect, useCallback } from 'react';
import { notificationService, type AppNotification } from '../services/notification.service';
import { useAuthStore } from '../store/auth.store';

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Fetches real notifications from Supabase.
 * Subscribes to real-time inserts so new notifications appear instantly.
 * Provides markRead and markAllRead actions.
 */
export function useNotifications(): UseNotificationsResult {
  const session = useAuthStore((s) => s.session);
  const user = session?.user ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await notificationService.getAll(user.id);
      setNotifications(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الإشعارات';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribe(user.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return unsubscribe;
  }, [user]);

  const markRead = useCallback(
    async (id: string) => {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await notificationService.markAllRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refresh: load,
  };
}
