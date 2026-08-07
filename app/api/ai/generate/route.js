import {
  buildCandidates,
  makeClient,
  coolingDownMs,
  startCooldown,
  cooldownSnapshot,
  REQUEST_TIMEOUT_MS,
  TOTAL_BUDGET_MS,
} from '@/lib/aiProviders';

export const runtime = 'nodejs';
export const maxDuration = 120; // must exceed TOTAL_BUDGET_MS

const SYSTEM_PROMPT = `You are an expert LaTeX generator.

CRITICAL RULES:
- Output ONLY LaTeX code. No markdown fences, no commentary, no explanations.
- The output must compile with **pdfLaTeX**.
- NEVER use fontspec, setmainfont, or any system-font / xelatex-only package.
- Use ONLY pdfLaTeX-compatible packages from texlive-latex-recommended:
  geometry, fontenc, inputenc, lmodern, amsmath, amssymb, graphicx,
  hyperref, xcolor, enumitem, booktabs, listings.
- fontawesome5 IS installed, so \\usepackage{fontawesome5} is allowed for
  contact lines in a resume or CV. It is an older release, so use ONLY these
  verified icon macros — any other \\fa... macro fails to compile:
  \\faEnvelope \\faPhone \\faGithub \\faLinkedin \\faGlobe \\faMapMarker \\faUser \\faLink
  In particular \\faMapMarkerAlt and \\faLocationDot do NOT exist; use \\faMapMarker.
  No package outside the list above is allowed.
- EVERY macro you use must come from a package you actually \\usepackage'd.
  Always start from the full default preamble below and keep amsmath+amssymb
  even if unused — symbols like \\blacksquare, \\square and \\checkmark need
  amssymb, and omitting it is the single most common compile failure. If you
  use any \\fa... icon you must also \\usepackage{fontawesome5}.
- NEVER invent macros. Use only standard LaTeX commands. For text styling that
  means exactly: \\textbf \\textit \\texttt \\underline \\emph and the size
  commands \\tiny \\scriptsize \\footnotesize \\small \\normalsize \\large
  \\Large \\LARGE \\huge. There is no \\medium, \\mediumseries or \\semibold.
  If you need a custom command, define it with \\newcommand in the preamble.
- Math-mode-only macros (\\cdot \\bullet \\times \\pm \\le \\ge \\sim and Greek
  letters) MUST be inside $...$. Never write a bare \\cdot in normal text — for
  a separator between contact details use \\textbullet, |, or --.
- Always return a FULL compilable document. Start with \\documentclass and end with \\end{document}.
- Escape LaTeX special characters in user-supplied text: % $ & # _ { } ~ ^ \\.

Default preamble to start from when generating a fresh document:

\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{hyperref}
`;

function stripCodeFences(text) {
  if (!text) return text;
  return text
    .replace(/^\s*```(?:latex|tex)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

const DEFAULT_COOLDOWN_MS = 60_000;
const DEAD_CANDIDATE_COOLDOWN_MS = 10 * 60_000;

function retryAfterMs(err) {
  const h = err?.headers;
  if (typeof h?.get !== 'function') return 0;
  const ms = parseFloat(h.get('retry-after-ms'));
  if (!Number.isNaN(ms)) return ms;
  const secs = parseFloat(h.get('retry-after'));
  if (!Number.isNaN(secs)) return secs * 1000;
  return 0;
}

// The SDK produces "<status> status code (no body)" when the upstream error
// body is empty — which is exactly what Gemini returns for a depleted-prepay
// 429. Synthesize something readable instead of forwarding that.
function upstreamMessage(err, candidate) {
  const raw = err?.error?.message || err?.message || '';
  if (!raw || /status code \(no body\)/i.test(raw)) {
    return `${candidate.provider} returned HTTP ${err?.status ?? '???'} with an empty body for ${candidate.model}.`;
  }
  return raw;
}

// 'next'  – candidate is dead for now, move on
// 'retry' – transient, retry this same candidate once
// 'fatal' – our request is wrong, stop immediately
function classify(err) {
  const status = err?.status;
  if (status === 429 || status === 404 || status === 401 || status === 403) return 'next';
  if (status === 400) {
    // The shim sometimes reports an unknown model as 400 rather than 404.
    const m = (err?.error?.message || err?.message || '').toLowerCase();
    return /model|not found|unsupported|does not exist/.test(m) ? 'next' : 'fatal';
  }
  if (status === 408 || (status >= 500 && status <= 599)) return 'retry';
  if (status == null) {
    // Our own timeout: this candidate is simply too slow for this prompt, so
    // retrying it just burns the budget twice. Fall through to the next one.
    if (/timed? ?out/i.test(err?.message || '')) return 'next';
    return 'retry'; // genuine connection blip
  }
  return 'fatal';
}

function hintFor(status, candidate) {
  switch (status) {
    case 429:
      return `The key in ${candidate.keyName} is out of quota for ${candidate.model}. If that key's Google Cloud project is on paid prepay with a depleted balance, it does NOT fall back to the free tier — every model will 429 forever. Create a fresh free-tier key at https://aistudio.google.com/apikey and set it as GEMINI_API_KEY in .env.local.`;
    case 404:
      return `${candidate.model} is not available to the key in ${candidate.keyName}. Google closed the dated aliases (gemini-2.5-flash, gemini-2.0-flash) to projects created after mid-2025. Use gemini-flash-latest or gemini-flash-lite-latest.`;
    case 401:
    case 403:
      return `The key in ${candidate.keyName} was rejected. Confirm it is a Google AI Studio key (starts with AIza) and that the Generative Language API is enabled on its project: https://aistudio.google.com/apikey`;
    default:
      return `Upstream ${candidate.provider} error on ${candidate.model}. Usually transient — try again shortly.`;
  }
}

const describe = (c) => ({ provider: c.provider, keyName: c.keyName, model: c.model });

function exhaustedHint(attempts) {
  return [
    'Tried, in order:',
    ...attempts.map(
      (a) => `  • ${a.model} via ${a.keyName} -> ${a.status ?? 'no response'}: ${a.reason}`
    ),
    '',
    "A 429 on every model of one key means that key's project has no quota left. A depleted paid (prepay) project does NOT fall back to the free tier.",
    'Fix: create a free key at https://aistudio.google.com/apikey, set it as GEMINI_API_KEY in .env.local, and restart the dev server.',
  ].join('\n');
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: 'Request body must be JSON', code: 'BAD_REQUEST' },
      { status: 400 }
    );
  }

  const { prompt, existingContent, mode } = body || {};
  if (!prompt || !String(prompt).trim()) {
    return Response.json({ error: 'Prompt required', code: 'BAD_REQUEST' }, { status: 400 });
  }

  const candidates = buildCandidates();
  if (candidates.length === 0) {
    return Response.json(
      {
        error: 'No AI provider configured.',
        code: 'NO_PROVIDER_CONFIGURED',
        provider: null,
        model: null,
        hint: 'Set GEMINI_API_KEY in .env.local to a Google AI Studio key (starts with AIza). Free key: https://aistudio.google.com/apikey — then restart the dev server.',
      },
      { status: 500 }
    );
  }

  const userPrompt =
    mode === 'modify' && existingContent
      ? `Here is the existing LaTeX:\n\n${existingContent}\n\nModify it based on this request:\n${prompt}`
      : prompt;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const attempts = [];
  let lastErr = null;
  let lastCandidate = null;

  for (const candidate of candidates) {
    if (deadline - Date.now() < 3_000) {
      attempts.push({
        ...describe(candidate),
        status: null,
        reason: 'skipped: request budget exhausted',
      });
      continue;
    }

    const cooling = coolingDownMs(candidate.id);
    if (cooling) {
      attempts.push({
        ...describe(candidate),
        status: 429,
        reason: `skipped: known rate-limited, ${Math.ceil(cooling / 1000)}s left on local cooldown`,
      });
      continue;
    }

    const client = makeClient(candidate);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model: candidate.model,
          temperature: 0.3,
          messages,
        });

        const latex = stripCodeFences(completion?.choices?.[0]?.message?.content || '');
        if (!latex) throw new Error('Model returned an empty completion');

        return Response.json({
          latex,
          provider: candidate.provider,
          model: candidate.model,
          keyName: candidate.keyName,
          usage: completion.usage,
        });
      } catch (err) {
        lastErr = err;
        lastCandidate = candidate;

        const action = classify(err);
        const message = upstreamMessage(err, candidate);
        console.error(`AI candidate ${candidate.id} -> ${err?.status ?? 'no-status'}: ${message}`);

        // One retry, same candidate, only if a full second attempt still fits
        // in the budget. Stops a 30s timeout being retried into 60s.
        if (
          action === 'retry' &&
          attempt === 0 &&
          deadline - Date.now() > REQUEST_TIMEOUT_MS + 1_000
        ) {
          await new Promise((r) => setTimeout(r, 750));
          continue;
        }

        attempts.push({ ...describe(candidate), status: err?.status ?? null, reason: message });

        if (err?.status === 429) {
          startCooldown(candidate.id, retryAfterMs(err) || DEFAULT_COOLDOWN_MS);
        } else if (err?.status === 404 || err?.status === 401 || err?.status === 403) {
          // A missing model or rejected key won't fix itself in a minute.
          startCooldown(candidate.id, DEAD_CANDIDATE_COOLDOWN_MS);
        }

        if (action === 'fatal') {
          return Response.json(
            {
              error: message,
              code: 'BAD_REQUEST',
              provider: candidate.provider,
              model: candidate.model,
              hint: 'The upstream rejected the request itself, not the key. Shortening the prompt or the existing document usually fixes this.',
            },
            { status: 400 }
          );
        }
        break; // next candidate
      }
    }
  }

  // ---- every candidate failed ----
  const statuses = attempts.map((a) => a.status);
  const allRateLimited = statuses.length > 0 && statuses.every((s) => s === 429);
  const allRejected = statuses.length > 0 && statuses.every((s) => s === 401 || s === 403);
  const timedOut = lastErr?.status == null && /timed? ?out/i.test(lastErr?.message || '');

  const status = allRateLimited ? 429 : timedOut ? 504 : 502;
  const code = allRateLimited
    ? 'RATE_LIMITED'
    : allRejected
    ? 'PROVIDER_KEY_REJECTED'
    : timedOut
    ? 'PROVIDER_TIMEOUT'
    : 'ALL_PROVIDERS_FAILED';

  const waitSecs = Math.ceil((retryAfterMs(lastErr) || DEFAULT_COOLDOWN_MS) / 1000);

  const payload = {
    error: allRateLimited
      ? 'Every configured AI key is out of quota right now.'
      : allRejected
      ? 'Every configured AI key was rejected.'
      : timedOut
      ? 'The AI provider did not respond in time.'
      : 'No AI provider could complete the request.',
    code,
    provider: lastCandidate?.provider ?? null,
    model: lastCandidate?.model ?? null,
    hint:
      attempts.length === 1 && lastCandidate
        ? hintFor(lastErr?.status, lastCandidate)
        : exhaustedHint(attempts),
    attempts,
  };
  if (status === 429) payload.retryAfter = waitSecs;

  return Response.json(payload, {
    status,
    headers: status === 429 ? { 'Retry-After': String(waitSecs) } : undefined,
  });
}

// Diagnostics — env-var NAMES only, never values.
export async function GET() {
  const candidates = buildCandidates();
  return Response.json({
    message: 'AI generation API',
    configured: candidates.length > 0,
    candidates: candidates.map(describe),
    cooldowns: cooldownSnapshot(),
  });
}
