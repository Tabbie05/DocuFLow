const COLD_START_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 4000;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function callLatexService(serviceUrl, content) {
  // 2-minute timeout per attempt for large documents
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    return await fetch(`${serviceUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf',
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// pdflatex prefixes each error with "!" and follows it with context, ending in
// "l.<n>" — the source line number. Pull those blocks out so the UI can lead
// with something actionable instead of hundreds of KB of font warnings.
function summarizeLatexLog(log) {
  if (!log) return '';
  const lines = log.split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length && blocks.length < 5; i++) {
    if (!lines[i].startsWith('!')) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      block.push(lines[j]);
      if (/^l\.\d+/.test(lines[j])) break;
    }
    blocks.push(block.join('\n'));
  }
  return blocks.join('\n\n');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return Response.json({ error: 'No LaTeX content provided' }, { status: 400 });
    }

    const serviceUrl = process.env.LATEX_SERVICE_URL;
    if (!serviceUrl) {
      return Response.json(
        { error: 'Service not configured', hint: 'Set LATEX_SERVICE_URL in .env.local' },
        { status: 500 }
      );
    }

    console.log(`📝 Compile request — ${content.length} chars`);

    let response;
    let lastError;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        response = await callLatexService(serviceUrl, content);
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') throw err;
        // Network error — retry if we have attempts left
        if (attempt < MAX_ATTEMPTS) {
          const backoff = BASE_BACKOFF_MS * attempt;
          console.warn(`⚠️ Network error (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}. Retrying in ${backoff}ms…`);
          await sleep(backoff);
          continue;
        }
        throw err;
      }

      if (response.ok) break;

      if (COLD_START_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
        const backoff = BASE_BACKOFF_MS * attempt;
        console.warn(`🥶 Upstream ${response.status} (attempt ${attempt}/${MAX_ATTEMPTS}) — likely cold start. Retrying in ${backoff}ms…`);
        await sleep(backoff);
        continue;
      }

      break;
    }

    if (!response) {
      return Response.json(
        { error: lastError?.message || 'Compilation service unreachable' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const text = await response.text();

      let error = 'Compilation failed';
      let details = '';

      try {
        const data = JSON.parse(text);
        // The service sends BOTH fields:
        //   { error: "LaTeX compilation failed", details: "<full pdflatex log>" }
        // The old `data.error || data.details` short-circuited on the truthy
        // `error` and threw the entire log away, which is why the UI only ever
        // showed a one-line message with no source line numbers.
        error = data.error || data.message || 'Compilation failed';
        details = data.details || data.log || data.stderr || data.stdout || '';
        if (!details && !data.error) details = text;
      } catch {
        details = text; // not JSON — the raw body IS the log
      }

      // pdflatex logs run to hundreds of KB. Keep the tail: that's where the
      // "! ..." lines and the l.<n> source references live.
      const MAX_LOG = 12_000;
      if (details.length > MAX_LOG) {
        details = `… [${details.length - MAX_LOG} earlier characters trimmed] …\n${details.slice(-MAX_LOG)}`;
      }

      return Response.json(
        { error, details, summary: summarizeLatexLog(details) },
        { status: response.status }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    if (pdfBuffer.byteLength === 0) {
      return Response.json({ error: 'Service returned empty PDF' }, { status: 500 });
    }

    console.log(`✅ PDF received — ${pdfBuffer.byteLength} bytes`);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return Response.json(
        {
          error: 'Compilation timeout after 2 minutes',
          hint: 'Document may be too complex. Try simplifying or removing packages.',
        },
        { status: 504 }
      );
    }
    console.error('❌ Compile route error:', error.message);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const serviceUrl = process.env.LATEX_SERVICE_URL;
  return Response.json({
    message: 'LaTeX Compilation API',
    serviceUrl: serviceUrl || 'Not configured',
    timeout: '120 seconds',
    retries: MAX_ATTEMPTS,
    configured: !!serviceUrl,
  });
}
