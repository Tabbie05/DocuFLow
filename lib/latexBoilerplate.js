// LaTeX boilerplate templates

export function getLaTeXBoilerplate(title = 'My Document', author = 'Your Name') {
  return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${title}}
\\author{${author}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Your abstract goes here.
\\end{abstract}

\\section{Introduction}

Your introduction content goes here.

\\end{document}
`;
}

export function getDefaultLaTeXBoilerplate() {
  return getLaTeXBoilerplate();
}

export function getMarkdownBoilerplate(title = 'New Document') {
  return `# ${title}

Write your markdown content here.

## Section 1

Your content goes here.

## Section 2

More content...

`;
}
