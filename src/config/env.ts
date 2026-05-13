/**
 * Environment Configuration Helper
 * Type-safe environment variable access for Expo
 */

// Get string env var with validation
function getEnvVar(name: string, required = false): string | undefined {
  const value = process.env[name];

  if (!value && required) {
    console.error(`[Env] Required environment variable missing: ${name}`);
    return undefined;
  }

  // Log presence (never the actual value)
  console.log(`[Env] ${name}:`, value ? 'present' : 'missing');

  return value;
}

// Get API key and validate format
function getAPIKey(name: string): string | undefined {
  const key = getEnvVar(name, false);

  if (!key) return undefined;

  // Clean key (remove quotes)
  const cleaned = key.trim().replace(/^["']|["']$/g, "");

  // Validate format
  if (!cleaned.startsWith("sk-or-v1-") && !cleaned.startsWith("gsk_")) {
    console.warn(`[Env] ${name} may be invalid format (expected sk-or-v1- or gsk_)`);
  }

  return cleaned;
}

// Environment exports
export const env = {
  // Supabase
  supabaseUrl: getEnvVar("EXPO_PUBLIC_SUPABASE_URL", true),
  supabaseAnonKey: getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY", true),

  // AI Providers
  openRouterApiKey: getAPIKey("EXPO_PUBLIC_OPENROUTER_API_KEY"),
  groqApiKey: getAPIKey("EXPO_PUBLIC_GROQ_KEY"),

  // Feature flags
  enableDebugLogs: getEnvVar("EXPO_PUBLIC_DEBUG") === "true",
};

// Validation check
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!env.supabaseUrl) {
    errors.push("EXPO_PUBLIC_SUPABASE_URL is required");
  }

  if (!env.supabaseAnonKey) {
    errors.push("EXPO_PUBLIC_SUPABASE_ANON_KEY is required");
  }

  if (!env.openRouterApiKey && !env.groqApiKey) {
    errors.push("At least one AI provider API key required (EXPO_PUBLIC_OPENROUTER_API_KEY or EXPO_PUBLIC_GROQ_KEY)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log environment status on startup
export function logEnvStatus(): void {
  console.log("═══ Environment Status ═══");
  console.log("Supabase:", env.supabaseUrl ? "✓" : "✗");
  console.log("OpenRouter:", env.openRouterApiKey ? "✓" : "✗");
  console.log("Groq:", env.groqApiKey ? "✓" : "✗");
  console.log("═══════════════════════════");

  const validation = validateEnv();
  if (!validation.valid) {
    console.error("[Env] Configuration errors:", validation.errors);
  }
}

export default env;