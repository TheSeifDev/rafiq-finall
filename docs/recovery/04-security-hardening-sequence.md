# Security Hardening Sequence

## Immediate
1. Remove direct provider API key use from mobile client.
2. Route chat calls to server/edge proxy (`EXPO_PUBLIC_AI_PROXY_URL`).
3. Replace real values in `.env.example` with placeholders.

## Near-term
1. Audit all `console.log` statements for PII/token exposure.
2. Narrow Supabase selects to required columns only.
3. Verify RLS policies against expected user journeys.

## Mid-term
1. Evaluate secure token storage hardening strategy for health-data threat model.
2. Add request throttling and abuse controls at AI proxy.
3. Add centralized error classification (network/auth/permission/validation).
