/**
 * AI Response Card
 * Modern premium card for AI responses with reasoning display
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AIResponseCardProps {
  content: string;
  reasoningDetails?: string;
  isStreaming?: boolean;
  isReasoning?: boolean;
  provider?: string;
  tokensPerSecond?: number;
  healthInsights?: any[];
  isRTL?: boolean;
}

export function AIResponseCard({
  content,
  reasoningDetails,
  isStreaming = false,
  isReasoning = false,
  provider = 'AI',
  tokensPerSecond = 0,
  healthInsights = [],
  isRTL = false,
}: AIResponseCardProps) {
  const parsedContent = useMemo(() => parseMessageContent(content), [content]);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Provider badge */}
      <View style={styles.providerBadge}>
        <View style={styles.providerDot} />
        <Text style={styles.providerText}>{provider}</Text>
        {tokensPerSecond > 0 && (
          <Text style={styles.speedText}>{tokensPerSecond} tok/s</Text>
        )}
      </View>

      {/* Reasoning display */}
      {(reasoningDetails || isReasoning) && (
        <View style={styles.reasoningContainer}>
          <View style={styles.reasoningHeader}>
            <Text style={styles.reasoningIcon}>🧠</Text>
            <Text style={[styles.reasoningTitle, isRTL && styles.textRTL]}>
              {isRTL ? 'التفكير' : 'Thinking...'}
            </Text>
          </View>
          {reasoningDetails && (
            <Text style={[styles.reasoningContent, isRTL && styles.textRTL]}>
              {truncateReasoning(reasoningDetails, 300)}
            </Text>
          )}
        </View>
      )}

      {/* Main content */}
      <View style={styles.contentCard}>
        <Text style={[styles.content, isRTL && styles.contentRTL]}>
          {parsedContent}
        </Text>

        {/* Streaming indicator */}
        {isStreaming && (
          <View style={styles.streamingIndicator}>
            <View style={styles.cursor} />
          </View>
        )}
      </View>

      {/* Health insights */}
      {healthInsights && healthInsights.length > 0 && (
        <View style={[styles.insightsContainer, isRTL && styles.insightsContainerRTL]}>
          {healthInsights.slice(0, 3).map((insight, index) => (
            <View
              key={index}
              style={[
                styles.insightChip,
                insight.priority === 'high' && styles.insightHigh,
                insight.priority === 'medium' && styles.insightMedium,
              ]}
            >
              <Text style={styles.insightIcon}>
                {insight.priority === 'high' ? '🚨' : insight.priority === 'medium' ? '⚠️' : 'ℹ️'}
              </Text>
              <Text style={styles.insightText} numberOfLines={1}>
                {insight.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Parse message content with markdown-like formatting
 */
function parseMessageContent(content: string): React.ReactNode {
  if (!content) return '';

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      elements.push(<Text key={`br-${index}`}>{'\n'}</Text>);
      return;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${index}`} style={styles.h3}>
          {line.substring(4)}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${index}`} style={styles.h2}>
          {line.substring(3)}
        </Text>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${index}`} style={styles.h1}>
          {line.substring(2)}
        </Text>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <View key={`li-${index}`} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{line.substring(2)}</Text>
        </View>
      );
    } else {
      elements.push(
        <Text key={`p-${index}`} style={styles.paragraph}>
          {formatInlineStyles(line)}
        </Text>
      );
    }
  });

  return elements;
}

function formatInlineStyles(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<Text key={`b-${key++}`} style={styles.bold}>{boldMatch[1]}</Text>);
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<Text key={`i-${key++}`} style={styles.italic}>{italicMatch[1]}</Text>);
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/\*\*/);
    if (nextSpecial === -1) {
      parts.push(<Text key={`t-${key++}`}>{remaining}</Text>);
      break;
    } else if (nextSpecial === 0) {
      parts.push(<Text key={`t-${key++}`}>{remaining[0]}</Text>);
      remaining = remaining.substring(1);
    } else {
      parts.push(<Text key={`t-${key++}`}>{remaining.substring(0, nextSpecial)}</Text>);
      remaining = remaining.substring(nextSpecial);
    }
  }

  return parts;
}

function truncateReasoning(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  containerRTL: {
    alignItems: 'flex-end',
  },

  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4a6fa5',
    marginRight: 6,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a6fa5',
  },
  speedText: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 8,
  },

  reasoningContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4a6fa5',
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reasoningIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  reasoningTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a6fa5',
  },
  reasoningContent: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    fontFamily: 'monospace',
  },

  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    color: '#1e293b',
  },
  contentRTL: {
    textAlign: 'right',
  },

  h1: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginVertical: 8,
  },
  h2: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginVertical: 6,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginVertical: 4,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bullet: {
    fontSize: 14,
    color: '#4a6fa5',
    marginRight: 8,
    width: 12,
  },
  listText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  textRTL: {
    textAlign: 'right',
  },

  streamingIndicator: {
    flexDirection: 'row',
    marginTop: 8,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: '#4a6fa5',
    borderRadius: 1,
  },

  insightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  insightsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  insightHigh: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  insightMedium: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  insightIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  insightText: {
    fontSize: 12,
    color: '#475569',
    maxWidth: 120,
  },
});

export default AIResponseCard;