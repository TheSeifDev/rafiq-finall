// @ts-nocheck — Deno globals; works correctly on Supabase runtime

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppRole = "user" | "assistant";

interface IncomingMessage {
  role: AppRole;
  content: string;
}

interface RequestBody {
  messages?: IncomingMessage[];
  vitals?: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequestBody {
  system_instruction: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig: { temperature?: number; maxOutputTokens: number };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT =
  "أنت رفيق، مساعد صحي ذكي وودود. قدّم معلومات صحية عامة دقيقة، وذكّر دائماً بأن هذا ليس بديلاً عن الطبيب. إذا كانت الحالة خطيرة، اقترح مراجعة الطبيب فوراً. أجب دائماً بالعربية ما لم يسألك المستخدم بالإنجليزية.";

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

/**
 * ALWAYS returns HTTP 200 with a JSON body.
 *
 * Why: supabase.functions.invoke() throws FunctionsHttpError for any non-2xx
 * status. Returning 200 everywhere lets the frontend read the Arabic message
 * from data.reply whether it's a success or a handled error.
 */
function reply(text: string): Response {
  return new Response(JSON.stringify({ reply: text }), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// ─── Rate limiter (in-memory, 5 req / 10 s per IP) ───────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 5;
const RATE_WINDOW = 10_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_MAX) return true;
  entry.count += 1;
  return false;
}

// ─── Gemini helpers ───────────────────────────────────────────────────────────

function buildGeminiBody(
  messages: IncomingMessage[],
  vitals: string,
): GeminiRequestBody {
  // Trim to last 4 messages — reduces token usage and 429 risk
  const trimmed = messages.slice(-4);

  console.log("[chat-ai] Message count:", messages.length, "| Trimmed:", trimmed.length);

  // Inject system prompt + vitals as a single combined first user turn
  const contextTurn: GeminiContent = {
    role: "user",
    parts: [{
      text: `System: ${SYSTEM_PROMPT}\nVitals: ${vitals}`,
    }],
  };

  const history: GeminiContent[] = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [contextTurn, ...history],
    generationConfig: {
      maxOutputTokens: 180,
    },
  };
}

function extractText(data: GeminiResponse): string | null {
  if (data.error) return null;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return reply("طريقة الطلب غير مدعومة.");
  }

  // ── Auth header (Supabase validates JWT before reaching here) ────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    console.warn("[chat-ai] Missing Authorization header");
    return reply("غير مصرح بالوصول.");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const authType = authHeader.startsWith("Bearer ey") ? "JWT" : "anon-key";
  console.log(`[chat-ai] POST | ip: ${ip} | auth: ${authType}`);

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (isRateLimited(ip)) {
    console.warn(`[chat-ai] Rate limited: ${ip}`);
    return reply("تم تجاوز الحد المسموح به. انتظر قليلاً وحاول مجدداً.");
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
    console.log("[chat-ai] BODY:", JSON.stringify({
      messageCount: body.messages?.length ?? 0,
      vitalsPreview: (body.vitals ?? "").slice(0, 60),
    }));
  } catch (e) {
    console.error("[chat-ai] JSON parse error:", e);
    return reply("طلب غير صالح. تحقق من البيانات المرسلة.");
  }

  const { messages, vitals = "لا توجد بيانات" } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    console.warn("[chat-ai] Empty or missing messages array");
    return reply("لا توجد رسائل للمعالجة.");
  }

  // ── Validate API key ──────────────────────────────────────────────────────
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    console.error("[chat-ai] GOOGLE_API_KEY secret is not set");
    return reply("الخدمة غير مُهيأة. تواصل مع الدعم الفني.");
  }

  // ── Call Gemini with timeout ──────────────────────────────────────────────
  const geminiBody = buildGeminiBody(messages, vitals);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let geminiRes: Response;
  try {
    geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error("[chat-ai] Gemini fetch error:", err);
    return reply(
      isTimeout
        ? "انتهت مهلة الاتصال. حاول مجدداً."
        : "الخدمة غير متاحة حالياً.",
    );
  } finally {
    clearTimeout(timer);
  }

  // ── Parse Gemini response ─────────────────────────────────────────────────
  let data: GeminiResponse;
  try {
    data = (await geminiRes.json()) as GeminiResponse;
    console.log("[chat-ai] Gemini status:", geminiRes.status, JSON.stringify({
      finishReason: data.candidates?.[0]?.finishReason,
      hasText: !!data.candidates?.[0]?.content?.parts?.[0]?.text,
      apiError: data.error ?? null,
    }));
  } catch (e) {
    console.error("[chat-ai] Failed to parse Gemini JSON. HTTP:", geminiRes.status, e);
    return reply("حدث خطأ في الخادم. حاول مجدداً.");
  }

  // Handle Gemini-level errors — return proper HTTP status codes
  if (!geminiRes.ok) {
    console.error(`[chat-ai] Gemini HTTP ${geminiRes.status}:`, data.error?.message);

    if (geminiRes.status === 429) {
      const retryAfter = geminiRes.headers.get("retry-after");
      return new Response(
        JSON.stringify({
          reply: retryAfter
            ? `الخدمة مشغولة حالياً. حاول مرة أخرى بعد ${retryAfter} ثانية.`
            : "الخدمة مشغولة حالياً، حاول بعد قليل.",
        }),
        { status: 429, headers: CORS_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({ reply: `حدث خطأ في خدمة الذكاء الاصطناعي. (${geminiRes.status})` }),
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // ── Extract and return text ───────────────────────────────────────────────
  const text = extractText(data);
  if (!text) {
    console.warn("[chat-ai] Empty text from Gemini. data.error:", data.error);
    return reply("لا يوجد رد حالياً. حاول مجدداً.");
  }

  console.log(`[chat-ai] OK — ${text.length} chars`);
  return reply(text);
});
