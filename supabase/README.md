# Supabase Edge Function: `generate-insights`

This directory contains the secure server-side Edge Function that calls Google Gemini API to generate institution-specific environmental insights, hotspot analysis, and engineering recommendations for the CarbonTrack report generator.

## Security Architecture
- The Google Gemini API key is **never** exposed to client-side code, HTML, or GitHub.
- The API key is stored securely in **Supabase Secrets** under the key `GEMINI_API_KEY`.
- The frontend client sends the authoritative calculated carbon assessment payload to the Edge Function, which queries Gemini and returns structured JSON insights.
- If the Edge Function or Gemini API key is not configured, the CarbonTrack frontend automatically falls back to an integrated deterministic analytics engine, transparently labeling the output.

---

## Deployment Instructions

### 1. Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### 2. Login & Link Your Supabase Project
```bash
supabase login
supabase link --project-ref ifwnhzjfwluqjhsfykbw
```
*(Replace `ifwnhzjfwluqjhsfykbw` with your Supabase Project Ref if using a different instance)*

### 3. Set the Gemini API Key in Supabase Secrets
Get your Gemini API Key from [Google AI Studio](https://aistudio.google.com/):
```bash
supabase secrets set GEMINI_API_KEY="your-google-ai-studio-gemini-api-key"
```

### 4. Deploy the Function
```bash
supabase functions deploy generate-insights --no-verify-jwt
```
*(Or keep JWT verification enabled if passing the Anon Key / User Bearer token in the client headers)*

---

## Testing the Function
You can test the deployed function with curl:
```bash
curl -i --location --request POST 'https://ifwnhzjfwluqjhsfykbw.supabase.co/functions/v1/generate-insights' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"assessment": {"institution": {"name": "Test College"}, "scopes": {"scope1Kg": 100, "scope2Kg": 200, "scope3Kg": 50}, "grossEmissionsKg": 350, "totalOffsetsKg": 50, "netEmissionsKg": 300, "intensity": {}, "sources": [], "hotspots": []}}'
```
