/**
 * Markdown Renderer
 * Parses and renders markdown in AI messages
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MarkdownRendererProps {
  content: string;
  isRTL?: boolean;
}

interface ParseResult {
  type: 'text' | 'h1' | 'h2' | 'h3' | 'list' | 'bold' | 'italic' | 'code' | 'link';
  content: string;
  items?: string[];
}

export function MarkdownRenderer({ content, isRTL = false }: MarkdownRendererProps) {
  const parsed = useMemo(() => parseMarkdown(content), [content]);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {parsed.map((item, index) => (
        <RenderItem key={index} item={item} isRTL={isRTL} />
      ))}
    </View>
  );
}

function RenderItem({ item, isRTL }: { item: ParseResult; isRTL: boolean }) {
  switch (item.type) {
    case 'h1':
      return <Text style={styles.h1}>{item.content}</Text>;
    case 'h2':
      return <Text style={styles.h2}>{item.content}</Text>;
    case 'h3':
      return <Text style={styles.h3}>{item.content}</Text>;
    case 'list':
      return (
        <View style={[styles.list, isRTL && styles.listRTL]}>
          {item.items?.map((listItem, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listText}>{listItem}</Text>
            </View>
          ))}
        </View>
      );
    case 'bold':
      return <Text style={styles.bold}>{item.content}</Text>;
    case 'italic':
      return <Text style={styles.italic}>{item.content}</Text>;
    case 'code':
      return <Text style={styles.code}>{item.content}</Text>;
    default:
      return <Text style={[styles.text, isRTL && styles.textRTL]}>{item.content}</Text>;
  }
}

function parseMarkdown(text: string): ParseResult[] {
  if (!text) return [];

  const lines = text.split('\n');
  const results: ParseResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      results.push({ type: 'text', content: '' });
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      results.push({ type: 'h3', content: line.substring(4) });
    } else if (line.startsWith('## ')) {
      results.push({ type: 'h2', content: line.substring(3) });
    } else if (line.startsWith('# ')) {
      results.push({ type: 'h1', content: line.substring(2) });
    }
    // Lists
    else if (line.match(/^[-*]\s/)) {
      // Collect list items
      const items: string[] = [line.substring(2)];
      while (i + 1 < lines.length && lines[i + 1].trim().match(/^[-*]\s/)) {
        i++;
        items.push(lines[i].substring(2));
      }
      results.push({ type: 'list', content: '', items });
    }
    // Regular text with inline formatting
    else {
      const formatted = parseInline(line);
      results.push({ type: 'text', content: formatted });
    }
  }

  return results;
}

function parseInline(text: string): string {
  // Simple inline parsing - return as-is for now
  // Bold and italic would require more complex parsing
  return text;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
  },
  textRTL: {
    textAlign: 'right',
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginVertical: 8,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginVertical: 6,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginVertical: 4,
  },
  list: {
    marginVertical: 4,
  },
  listRTL: {
    alignItems: 'flex-end',
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
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
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});

export default MarkdownRenderer;