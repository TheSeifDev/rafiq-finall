/**
 * Chat Theme System
 * Premium semantic tokens for chat UI
 */

export interface ChatTheme {
  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;

  // Bubbles
  userBubble: string;
  userBubbleText: string;
  aiBubble: string;
  aiBubbleText: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  inputText: string;
  inputPlaceholder: string;

  // Primary
  primary: string;
  primarySoft: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Status
  online: string;
  thinking: string;

  // Borders
  border: string;
  borderLight: string;

  // Shadows
  shadowBubble: string;
  shadowInput: string;
}

export const lightTheme: ChatTheme = {
  // Backgrounds
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',

  // Bubbles
  userBubble: '#4a6fa5',
  userBubbleText: '#ffffff',
  aiBubble: '#ffffff',
  aiBubbleText: '#1e293b',

  // Input
  inputBackground: '#f1f5f9',
  inputBorder: '#e2e8f0',
  inputBorderFocused: '#4a6fa5',
  inputText: '#1e293b',
  inputPlaceholder: '#94a3b8',

  // Primary
  primary: '#4a6fa5',
  primarySoft: '#e8f4fd',

  // Text
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',

  // Status
  online: '#22c55e',
  thinking: '#4a6fa5',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Shadows
  shadowBubble: 'rgba(0, 0, 0, 0.06)',
  shadowInput: 'rgba(0, 0, 0, 0.08)',
};

export const darkTheme: ChatTheme = {
  // Backgrounds
  background: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#334155',

  // Bubbles
  userBubble: '#4a6fa5',
  userBubbleText: '#ffffff',
  aiBubble: '#1e293b',
  aiBubbleText: '#f1f5f9',

  // Input
  inputBackground: '#1e293b',
  inputBorder: '#334155',
  inputBorderFocused: '#4a6fa5',
  inputText: '#f1f5f9',
  inputPlaceholder: '#64748b',

  // Primary
  primary: '#60a5fa',
  primarySoft: '#1e3a5f',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',

  // Status
  online: '#22c55e',
  thinking: '#60a5fa',

  // Borders
  border: '#334155',
  borderLight: '#1e293b',

  // Shadows
  shadowBubble: 'rgba(0, 0, 0, 0.3)',
  shadowInput: 'rgba(0, 0, 0, 0.4)',
};

export function getChatTheme(isDark: boolean): ChatTheme {
  return isDark ? darkTheme : lightTheme;
}

export default { lightTheme, darkTheme, getChatTheme };