export function getLaTeXBoilerplate(title = 'My Document') {
  const safeTitle = String(title).replace(/[\\{}]/g, '');
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${safeTitle}}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Start writing here.

\\end{document}
`;
}

// If the user typed a name without an extension, default it to .tex.
// Anything else (e.g. "notes.md") is preserved as-is.
export function normalizeFileName(rawName) {
  const trimmed = String(rawName || '').trim();
  if (!trimmed) return '';
  if (/\.[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  return `${trimmed}.tex`;
}

// Returns starter content for a brand-new file. .tex files get the
// LaTeX boilerplate; other extensions stay empty.
export function getInitialContentFor(fileName) {
  if (!fileName) return '';
  if (fileName.toLowerCase().endsWith('.tex')) {
    return getLaTeXBoilerplate(fileName.replace(/\.tex$/i, ''));
  }
  return '';
}
