export type AppLanguage = 'ar' | 'en';

export const translations = {
  ar: {
    appName: 'رفيق',
    welcomeTitle: 'مرحبًا بك في رفيق',
    welcomeSubtitle: 'مرافقك الصحي اليومي',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    home: 'الرئيسية',
    vitals: 'المؤشرات',
    emergency: 'الطوارئ',
    chat: 'المحادثة',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    medications: 'الأدوية',
    noData: 'لا توجد بيانات حالياً',
    save: 'حفظ',
    logout: 'تسجيل الخروج',
    darkMode: 'الوضع الداكن',
    language: 'اللغة',
    connectWatch: 'ربط الساعة الذكية',
  },
  en: {
    appName: 'Rafiq',
    welcomeTitle: 'Welcome to Rafiq',
    welcomeSubtitle: 'Your trusted health companion',
    login: 'Login',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    home: 'Home',
    vitals: 'Vitals',
    emergency: 'Emergency',
    chat: 'Chat',
    profile: 'Profile',
    settings: 'Settings',
    medications: 'Medications',
    noData: 'No data available',
    save: 'Save',
    logout: 'Logout',
    darkMode: 'Dark mode',
    language: 'Language',
    connectWatch: 'Connect smartwatch',
  },
} as const;

const arabicIndicMap: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

export function toArabicIndic(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => arabicIndicMap[digit]);
}
