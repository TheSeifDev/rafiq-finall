/**
 * Wearable Auth Service — OAuth Flow for Real Providers
 * Note: expo-web-browser is available in Expo SDK, import via require if needed
 */

import type { WearableProvider, ProviderAuthConfig } from '../../types/wearable';

class WearableAuthService {
  private authConfigs: Record<WearableProvider, ProviderAuthConfig> = {
    apple_health: {
      provider: 'apple_health',
      clientId: process.env.EXPO_PUBLIC_APPLE_HEALTH_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['heart_rate', 'oxygen_saturation', 'sleep', 'activity'],
    },
    health_connect: {
      provider: 'health_connect',
      clientId: '',
      redirectUri: 'rafiq://health-connect',
      scopes: [],
    },
    samsung_health: {
      provider: 'samsung_health',
      clientId: process.env.EXPO_PUBLIC_SAMSUNG_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['heart_rate', 'blood_pressure', 'sleep', 'activity'],
    },
    garmin: {
      provider: 'garmin',
      clientId: process.env.EXPO_PUBLIC_GARMIN_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['activity', 'sleep', 'health'],
    },
    fitbit: {
      provider: 'fitbit',
      clientId: process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['activity', 'heart_rate', 'sleep'],
    },
    oura: {
      provider: 'oura',
      clientId: process.env.EXPO_PUBLIC_OURA_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['daily', 'session'],
    },
    polar: {
      provider: 'polar',
      clientId: process.env.EXPO_PUBLIC_POLAR_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['accessibility.read', 'accessibility.write'],
    },
    suunto: {
      provider: 'suunto',
      clientId: process.env.EXPO_PUBLIC_SUUNTO_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['activity', 'sleep'],
    },
    strava: {
      provider: 'strava',
      clientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '',
      redirectUri: 'rafiq://oauth/callback',
      scopes: ['activity_read'],
    },
  };

  getAuthUrl(provider: WearableProvider): string {
    // Use RAFIQ backend as OAuth proxy (never expose secrets)
    return `${process.env.EXPO_PUBLIC_API_URL || ''}/api/wearable/auth/url?provider=${provider}`;
  }

  async startOAuthFlow(provider: WearableProvider): Promise<string | null> {
    const authUrl = this.getAuthUrl(provider);

    try {
      // Use dynamic require to avoid TypeScript issues with optional Expo module
      const WebBrowser = require('expo-web-browser');
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        this.authConfigs[provider].redirectUri
      );

      if (result.type === 'success') {
        return result.url;
      }

      return null;
    } catch (error) {
      console.error('[WearableAuth] OAuth flow failed:', error);
      return null;
    }
  }

  async handleOAuthCallback(url: string): Promise<{ code: string; state: string } | null> {
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');

      if (code && state) {
        return { code, state };
      }

      return null;
    } catch {
      return null;
    }
  }

  async exchangeCodeForTokens(
    provider: WearableProvider,
    code: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || ''}/api/wearable/auth/exchange`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          code,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
  }

  getScopes(provider: WearableProvider): string[] {
    return this.authConfigs[provider].scopes;
  }

  isProviderAvailable(provider: WearableProvider): boolean {
    // Health Connect requires Android API 34+
    if (provider === 'health_connect') {
      return typeof window !== 'undefined' && /android/i.test(navigator.userAgent);
    }

    // Apple Health requires iOS
    if (provider === 'apple_health') {
      return typeof window !== 'undefined' && /ios|iphone|ipad/i.test(navigator.userAgent);
    }

    return true;
  }
}

export const wearableAuthService = new WearableAuthService();