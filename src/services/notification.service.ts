import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

export const notificationService = {
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  },
  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw new Error(error.message);
  },
  // Backward-compatible aliases for legacy hooks/screens.
  async getAll(userId: string): Promise<AppNotification[]> {
    return this.getNotifications(userId);
  },
  async markRead(id: string): Promise<void> {
    return this.markAsRead(id);
  },
  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
  subscribe(userId: string, onInsert: (notification: AppNotification) => void): RealtimeChannel {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          onInsert(payload.new as AppNotification);
        }
      )
      .subscribe();
  },
};
