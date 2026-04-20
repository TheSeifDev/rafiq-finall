import { supabase } from '../lib/supabase';

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
};
