/**
 * chat.service.ts
 *
 * Uses supabase.functions.invoke() instead of raw fetch.
 * This automatically attaches the correct Authorization header:
 *   - Bearer <session JWT>  when a user is signed in
 *   - Bearer <anon key>     when no session exists
 *
 * No manual header management needed. No 401 errors.
 */

import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type EdgeFunctionBody = {
  messages: ChatMessage[];
  vitals: string;
};

type EdgeFunctionResponse = {
  reply?: string;
  error?: string;
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function sendChat(
  messages: ChatMessage[],
  vitalsSummary: string,
): Promise<string> {
  if (__DEV__) {
    console.log("[chat.service] → invoking chat-ai", `(${messages.length} messages)`);
  }

  const body: EdgeFunctionBody = {
    messages,
    vitals: vitalsSummary,
  };

  // supabase.functions.invoke() handles:
  //  ✓ Authorization header (anon key or active user JWT)
  //  ✓ Content-Type: application/json
  //  ✓ Supabase project URL resolution
  const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>(
    "chat-ai",
    { body },
  );

  // ── Network / invocation error ───────────────────────────────────────────
  if (error) {
    if (__DEV__) {
      console.error("[chat.service] invoke error:", error.message, "status:", (error as { status?: number }).status);
    }

    const status = (error as { status?: number }).status;

    // Try to read the Arabic reply from the edge function body first.
    // FunctionsHttpError exposes the parsed body via .context on some versions.
    const bodyReply = (error as { context?: { reply?: string } }).context?.reply;
    if (bodyReply) return bodyReply;

    // Fallback to status-mapped Arabic strings
    if (status === 429) return "الخدمة مشغولة حالياً، حاول بعد قليل.";
    if (status === 401) return "غير مصرح بالوصول. تحقق من إعدادات التطبيق.";
    if (status === 500) return "حدث خطأ في الخادم. حاول مجدداً لاحقاً.";
    if (status === 503 || status === 504) return "انتهت مهلة الاتصال. تحقق من اتصالك.";

    if (data?.reply) return data.reply;

    return "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
  }

  if (__DEV__) {
    console.log("[chat.service] ← reply:", data?.reply?.slice(0, 80) ?? "(empty)");
  }

  return data?.reply?.trim() || "لم أتمكن من فهم الرد. حاول مجدداً.";
}
