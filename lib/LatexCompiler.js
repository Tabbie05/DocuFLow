async function compileLatex(code) {
  if (!code.trim()) {
    setHtmlPreview(null);
    return;
  }

  setIsCompiling(true);
  setError(null);

  try {
    const latex = await import('latex.js');
    const parse = latex.default?.parse || latex.parse;
    const HtmlGenerator = latex.HtmlGenerator;

    const safe = stripDocument(sanitizeLatex(code));

    const doc = parse(safe, {
      generator: new HtmlGenerator({ hyphenate: false }),
    });

    const { html, css } = await doc.htmlDocument();
    setHtmlPreview(buildHtml(html, css));
  } catch (e) {
    console.error(e);
    setError(e.message || 'LaTeX preview failed');
  } finally {
    setIsCompiling(false);
  }
}

