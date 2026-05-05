export async function GET() {
  const serviceUrl = process.env.LATEX_SERVICE_URL;
  if (!serviceUrl) {
    return Response.json({ ok: false, error: 'LATEX_SERVICE_URL not configured' }, { status: 500 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const start = Date.now();
    const res = await fetch(serviceUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    return Response.json({
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    return Response.json({ ok: false, error: err.message }, { status: 200 });
  }
}
