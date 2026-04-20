import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { spacing } from '../theme';
import { sendChat, type ChatMessage } from '../services/chat.service';

export function ChatScreen(): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);

  return (
    <Screen style={{ padding: spacing.md }}>
      <FlatList
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: item.role === 'user' ? '#0077C8' : '#E2E8F0', padding: spacing.sm, borderRadius: 12 }}>
            <AppText style={{ color: item.role === 'user' ? '#fff' : '#0F172A' }}>{item.content}</AppText>
          </View>
        )}
      />
      {typing ? <AppText>Rafiq is typing...</AppText> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppInput value={text} onChangeText={setText} placeholder="اكتب رسالتك" />
        </View>
        <AppButton
          title="إرسال"
          onPress={async () => {
            const userMessage: ChatMessage = { role: 'user', content: text.trim() };
            if (!userMessage.content) return;
            const nextMessages = [...messages, userMessage];
            setMessages(nextMessages);
            setText('');
            setTyping(true);
            const reply = await sendChat(nextMessages, 'No recent vitals available');
            setMessages((current) => [...current, { role: 'assistant', content: reply }]);
            setTyping(false);
          }}
        />
      </View>
    </Screen>
  );
}
