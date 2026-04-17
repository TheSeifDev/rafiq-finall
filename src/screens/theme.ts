export interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  card: string;
  subText: string;
  navBorder: string; 
  navBg?: string;
}

export const lightTheme = {
  background: '#FFFFFF',
  card: '#F8FAFC',
  text: '#191D32',
  subText: '#64748B',
  primary: '#0077C8',
  navBorder: '#E2E8F0', 
};

export const darkTheme: ThemeColors = {
  background: '#121212',
  text: '#FFFFFF',
  primary: '#0077C8',
  card: '#1E1E1E',
  subText: '#AAAAAA',
  navBorder: '#334155',
};