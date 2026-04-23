export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const systemPrompt = 'You are Rafiq, a helpful health assistant. Provide general health information, remind users this is not medical advice, and suggest seeing a doctor for serious concerns.';

export async function sendChat(messages: ChatMessage[], vitalsSummary: string): Promise<string> {
  const aiProxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL;
  if (!aiProxyUrl) {
    return 'يرجى إعداد EXPO_PUBLIC_AI_PROXY_URL لتفعيل المساعد الصحي.';
  }

  const response = await fetch(aiProxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: `${systemPrompt}\nLatest vitals: ${vitalsSummary}` },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    return 'تعذر الوصول إلى خدمة الذكاء الاصطناعي حالياً.';
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? 'لا توجد استجابة حالياً.';
}
