export type ChatMessage = { role: 'user' | 'assistant'; content: string };

const systemPrompt = 'You are Rafiq, a helpful health assistant. Provide general health information, remind users this is not medical advice, and suggest seeing a doctor for serious concerns.';

export async function sendChat(messages: ChatMessage[], vitalsSummary: string): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    return 'يرجى إعداد EXPO_PUBLIC_OPENAI_API_KEY لتفعيل المساعد الصحي.';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${systemPrompt}\nLatest vitals: ${vitalsSummary}` },
        ...messages,
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    return 'تعذر الوصول إلى خدمة الذكاء الاصطناعي حالياً.';
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? 'لا توجد استجابة حالياً.';
}
