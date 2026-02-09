export async function POST(request) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return Response.json({ 
        error: 'No LaTeX content provided' 
      }, { status: 400 });
    }

    console.log('📝 Compilation request');
    console.log('📄 Content length:', content.length, 'characters');

    const serviceUrl = process.env.LATEX_SERVICE_URL;
    
    if (!serviceUrl) {
      console.error('❌ LATEX_SERVICE_URL not configured');
      return Response.json({ 
        error: 'Service not configured',
        hint: 'Set LATEX_SERVICE_URL in .env.local'
      }, { status: 500 });
    }

    console.log('🔗 Service URL:', serviceUrl);

    // 2-MINUTE TIMEOUT for large resumes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

    console.log('⏳ Calling LaTeX service (2 min timeout)...');

    const response = await fetch(`${serviceUrl}/compile`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/pdf'
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 Response status:', response.status);

   if (!response.ok) {
  let errorMessage = 'Compilation failed';

  const text = await response.text();

  try {
    const errorData = JSON.parse(text);
    errorMessage = errorData.error || errorData.details || text;
  } catch {
    errorMessage = text;
  }

  return Response.json({ error: errorMessage }, { status: response.status });
}

    const pdfBuffer = await response.arrayBuffer();
    
    if (pdfBuffer.byteLength === 0) {
      console.error('❌ Empty PDF received');
      return Response.json({ 
        error: 'Service returned empty PDF' 
      }, { status: 500 });
    }

    console.log('✅ PDF received:', pdfBuffer.byteLength, 'bytes');

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
      console.error('❌ Timeout after 2 minutes');
      return Response.json({ 
        error: 'Compilation timeout after 2 minutes',
        hint: 'Document may be too complex. Try simplifying or removing packages.'
      }, { status: 504 });
    }
    
    console.error('❌ Error:', error.message);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  const serviceUrl = process.env.LATEX_SERVICE_URL;
  
  return Response.json({ 
    message: 'LaTeX Compilation API',
    serviceUrl: serviceUrl || 'Not configured',
    timeout: '120 seconds',
    configured: !!serviceUrl
  });
}