export async function compileLaTeX(latexCode) {
  try {
    // OPTION 1: Using latex.js (pure JavaScript)
    // This works but has limitations
    const latex = await import('latex.js');
    const generator = latex.parse(latexCode, { generator: latex.HtmlGenerator });
    const { html, css } = await generator.generate();
    
    // Convert HTML to PDF using html2pdf or similar
    // For now, return HTML as blob
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
          <style>
            body {
              font-family: 'Computer Modern', serif;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              background: white;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;
    
    // TEMPORARY: Return HTML as PDF
    // In production, use proper PDF generation
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return Buffer.from(await blob.arrayBuffer());
    
  } catch (error) {
    console.error('Compilation error:', error);
    throw new Error('Failed to compile LaTeX');
  }
}

/**
 * PRODUCTION ALTERNATIVE:
 * Use external service like:
 * - LaTeX.Online API
 * - Overleaf API
 * - Docker container with TeX Live
 * - AWS Lambda with TeX Live layer
 */

export async function compileLaTeXProduction(latexCode) {
  // Example using external API
  const response = await fetch('https://latexonline.cc/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-tex' },
    body: latexCode
  });
  
  if (!response.ok) throw new Error('Compilation failed');
  
  return Buffer.from(await response.arrayBuffer());
}