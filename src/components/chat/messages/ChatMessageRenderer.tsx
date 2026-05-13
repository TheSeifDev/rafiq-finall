/**
 * Chat Message Renderer
 * Modern message bubbles with markdown rendering
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { QuickReply } from './QuickReply';
import { HealthTipCard } from './HealthTipCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestedReplies?: string[];
  healthContext?: {
    vitals?: {
      heartRate?: number;
      bloodPressure?: string;
      oxygenSaturation?: number;
    };
    medications?: string[];
  };
}

interface ChatMessageRendererProps {
  message: ChatMessage;
  isRTL?: boolean;
  onQuickReplyPress?: (reply: string) => void;
}

export function ChatMessageRenderer({ message, isRTL = false, onQuickReplyPress }: ChatMessageRendererProps) {
  const isUser = message.role === 'user';

  const renderedContent = useMemo(() => {
    return parseMarkdown(message.content);
  }, [message.content]);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <MessageBubble
        content={renderedContent}
        isUser={isUser}
        isRTL={isRTL}
        isStreaming={message.isStreaming}
      />

      {message.suggestedReplies && message.suggestedReplies.length > 0 && !isUser && (
        <View style={[styles.suggestionsContainer, isRTL && styles.suggestionsContainerRTL]}>
          {message.suggestedReplies.map((reply, index) => (
            <QuickReply
              key={`${message.id}-reply-${index}`}
              label={reply}
              onPress={() => onQuickReplyPress?.(reply)}
              isRTL={isRTL}
            />
          ))}
        </View>
      )}

      {message.healthContext && !isUser && (
        <HealthTipCard context={message.healthContext} isRTL={isRTL} />
      )}
    </View>
  );
}

/**
 * Simple markdown parser for chat messages
 */
function parseMarkdown(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    if (line.trim() === '') {
      parts.push(<Text key={`br-${lineIndex}`}>{'\n'}</Text>);
      return;
    }

    // Handle headers
    if (line.startsWith('### ')) {
      parts.push(
        <Text key={`h3-${lineIndex}`} style={styles.h3}>
          {line.substring(4)}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      parts.push(
        <Text key={`h2-${lineIndex}`} style={styles.h2}>
          {line.substring(3)}
        </Text>
      );
    } else if (line.startsWith('# ')) {
      parts.push(
        <Text key={`h1-${lineIndex}`} style={styles.h1}>
          {line.substring(2)}
        </Text>
      );
    }
    // Handle bullet lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      parts.push(
        <View key={`li-${lineIndex}`} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{line.substring(2)}</Text>
        </View>
      );
    }
    // Handle numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        parts.push(
          <View key={`ol-${lineIndex}`} style={styles.listItem}>
            <Text style={styles.number}>{match[1]}.</Text>
            <Text style={styles.listText}>{match[2]}</Text>
          </View>
        );
      }
    }
    // Handle bold/italic inline
    else {
      const inlineParts = parseInlineFormatting(line);
      if (inlineParts.length > 0) {
        parts.push(
          <Text key={`p-${lineIndex}`} style={styles.paragraph}>
            {inlineParts}
          </Text>
        );
      }
    }
  });

  return parts;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<Text key={`bold-${key++}`} style={styles.bold}>{boldMatch[1]}</Text>);
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Italic *text*
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<Text key={`italic-${key++}`} style={styles.italic}>{italicMatch[1]}</Text>);
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Inline code `code`
    const codeMatch = remaining.match(/^`(.+?)`/);
    if (codeMatch) {
      parts.push(<Text key={`code-${key++}`} style={styles.inlineCode}>{codeMatch[1]}</Text>);
      remaining = remaining.substring(codeMatch[0].length);
      continue;
    }

    // Regular text
    const nextSpecial = remaining.search(/\*\*|\*|`/);
    if (nextSpecial === -1) {
      parts.push(<Text key={`text-${key++}`}>{remaining}</Text>);
      break;
    } else if (nextSpecial === 0) {
      parts.push(<Text key={`text-${key++}`}>{remaining[0]}</Text>);
      remaining = remaining.substring(1);
    } else {
      parts.push(<Text key={`text-${key++}`}>{remaining.substring(0, nextSpecial)}</Text>);
      remaining = remaining.substring(nextSpecial);
    }
  }

  return parts;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  suggestionsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginVertical: 8,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginVertical: 6,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginVertical: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1a1a2e',
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#4a6fa5',
    marginRight: 8,
    width: 12,
  },
  number: {
    fontSize: 15,
    color: '#4a6fa5',
    marginRight: 8,
    width: 16,
  },
  listText: {
    fontSize: 15,
    color: '#1a1a2e',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 14,
  },
});

export default ChatMessageRenderer;