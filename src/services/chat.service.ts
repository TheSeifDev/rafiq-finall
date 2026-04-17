import { supabase } from './supabase';
import type { ChatMessage, ChatMessageInsert } from '../types/database';

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat-ai`;

export const chatService = {
  /**
   * Load the full chat history for a user, oldest first (for list display).
   */
  async getHistory(userId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as ChatMessage[]) ?? [];
  },

  /**
   * Persist a message to the DB.
   */
  async saveMessage(
    message: ChatMessageInsert
  ): Promise<{ data: ChatMessage | null; error: string | null }> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([message])
      .select()
      .single();

    return {
      data: error ? null : (data as ChatMessage),
      error: error?.message ?? null,
    };
  },

  /**
   * Call the Edge Function to get an AI reply.
   * Passes the last 10 messages as conversation history.
   */
  async getAIReply(
    userMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<{ reply: string; source: 'gemini' | 'fallback' }> {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify({
        message: userMessage,
        history: history.slice(-10), // last 10 messages as context
      }),
    });

    if (!response.ok) {
      throw new Error(`Edge function error: ${response.status}`);
    }

    const json = await response.json();
    return {
      reply: json.reply ?? 'عذراً، حدث خطأ في الاتصال.',
      source: json.source ?? 'fallback',
    };
  },

  /**
   * Delete all chat messages for a user (clear conversation).
   */
  async clearHistory(userId: string): Promise<void> {
    await supabase.from('chat_messages').delete().eq('user_id', userId);
  },
};
