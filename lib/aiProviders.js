import OpenAI from 'openai';

const GOOGLE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// One upstream call may take this long. Long documents (a full resume runs
// ~5k chars) regularly need more than 30s on gemini-flash-latest.
export const REQUEST_TIMEOUT_MS = 45_000;
// Ceiling for the whole failover loop, so the browser never waits longer.
export const TOTAL_BUDGET_MS = 110_000;

/**
 * Google AI Studio key slots, in preference order. Duplicate values are
 * dropped so the same key is never burned twice in one request.
 *
 *   GEMINI_API_KEY          – primary (the key with quota)
 *   GEMINI_API_KEY_FALLBACK – second key
 *   GEMINI_API_KEY_2        – alias, accepted for convenience
 *   GROQ_API_KEY            – legacy slot. This project historically stored a
 *                             *Google* key here. A real Groq key (gsk_…) is
 *                             detected by prefix and routed to Groq instead.
 */
const GOOGLE_KEY_SLOTS = [
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_FALLBACK',
  'GEMINI_API_KEY_2',
  'GROQ_API_KEY',
];

// Verified working on newly created AI Studio projects. The dated aliases
// (gemini-2.5-flash, gemini-2.0-flash) return 404 "no longer available to new
// users" or free-tier limit 0 — never put them first.
const GOOGLE_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const GROQ_MODELS = ['llama-3.3-70b-versatile'];

const isGoogleKey = (v) => /^AIza[0-9A-Za-z_-]{20,}$/.test(v);
const isGroqKey = (v) => /^gsk_[0-9A-Za-z]{20,}$/.test(v);

function collectKeys() {
  const google = [];
  const groq = [];
  const seen = new Set();

  for (const name of GOOGLE_KEY_SLOTS) {
    const value = (process.env[name] || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    if (isGroqKey(value)) groq.push({ name, value });
    else if (isGoogleKey(value)) google.push({ name, value });
    // Any other shape is not a key we know how to route — ignore it.
  }
  return { google, groq };
}

/**
 * Ordered candidates, model-major: when one key is out of quota we fall through
 * to the other key on the same (best) model before downgrading the model.
 */
export function buildCandidates() {
  const { google, groq } = collectKeys();
  const override = (process.env.GEMINI_MODEL || '').trim();
  const models = override
    ? [override, ...GOOGLE_MODELS.filter((m) => m !== override)]
    : GOOGLE_MODELS;

  const candidates = [];
  for (const model of models) {
    for (const key of google) {
      candidates.push({
        id: `google:${key.name}:${model}`,
        provider: 'google',
        keyName: key.name,
        apiKey: key.value,
        baseURL: GOOGLE_BASE_URL,
        model,
      });
    }
  }
  for (const model of GROQ_MODELS) {
    for (const key of groq) {
      candidates.push({
        id: `groq:${key.name}:${model}`,
        provider: 'groq',
        keyName: key.name,
        apiKey: key.value,
        baseURL: GROQ_BASE_URL,
        model,
      });
    }
  }
  return candidates;
}

export function makeClient(candidate) {
  return new OpenAI({
    apiKey: candidate.apiKey,
    baseURL: candidate.baseURL,
    // The SDK defaults to 2 retries and shouldRetry() retries on 429, turning
    // one click into three quota-burning calls. We do our own narrower retry
    // (5xx / connection only) in the route.
    maxRetries: 0,
    // SDK default is 10 minutes.
    timeout: REQUEST_TIMEOUT_MS,
  });
}

// ---- per-process cooldown: don't re-burn a candidate we know is limited ----
const cooldowns = new Map(); // candidate.id -> epoch ms

export function coolingDownMs(id) {
  const until = cooldowns.get(id);
  if (!until) return 0;
  if (until <= Date.now()) {
    cooldowns.delete(id);
    return 0;
  }
  return until - Date.now();
}

export function startCooldown(id, ms) {
  cooldowns.set(id, Date.now() + Math.max(1_000, ms));
}

export function cooldownSnapshot() {
  const now = Date.now();
  return Object.fromEntries(
    [...cooldowns.entries()]
      .filter(([, until]) => until > now)
      .map(([id, until]) => [id, Math.ceil((until - now) / 1000)])
  );
}
