// app/api/latex/compile/route.js
import fetch from 'node-fetch';

export async function POST(request) {
  try {
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }), 
        { status: 400 }
      );
    }

    // Method 1: Try latexonline.cc
    try {
      const formData = new URLSearchParams();
      formData.append('text', content);
      formData.append('command', 'pdflatex');

      const response = await fetch('https://latexonline.cc/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (response.ok) {
        const pdfBuffer = await response.buffer();
        
        return new Response(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="document.pdf"',
          },
        });
      }
    } catch (error) {
      console.log('LaTeX Online failed, trying alternative...');
    }

    // Method 2: Try latex.ytotech.com
    try {
      const response = await fetch('https://latex.ytotech.com/builds/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compiler: 'pdflatex',
          resources: [{
            main: true,
            file: 'main.tex',
            content: content
          }]
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.result && result.result.pdf) {
          // Decode base64 PDF
          const pdfBuffer = Buffer.from(result.result.pdf, 'base64');
          
          return new Response(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'inline; filename="document.pdf"',
            },
          });
        }
      }
    } catch (error) {
      console.log('YToTech failed');
    }

    // If both methods fail
    return new Response(
      JSON.stringify({ 
        error: 'LaTeX compilation failed. Please check your syntax.',
        details: 'All compilation services are unavailable or returned errors.'
      }), 
      { status: 500 }
    );

  } catch (err) {
    console.error('Server error:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500 }
    );
  }
}