export function getLaTeXBoilerplate(title = 'Document', author = 'Your Name') {
  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${title}}
\\author{${author}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here.
\\end{abstract}

\\section{Introduction}

Your introduction goes here.

\\section{Methods}

Describe your methods here.

\\section{Results}

Present your results here.

\\section{Conclusion}

Conclude your document here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`;
}

export function getResumeTemplate(name = 'Your Name') {
  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{${name}}}\\\\[0.5em]
Email: your.email@example.com | Phone: +1-234-567-8900\\\\
LinkedIn: linkedin.com/in/yourprofile | GitHub: github.com/yourusername
\\end{center}

\\section*{Education}
\\textbf{University Name} \\hfill City, Country\\\\
Bachelor of Science in Computer Science \\hfill Month Year - Month Year
\\begin{itemize}[leftmargin=*]
  \\item GPA: 3.8/4.0
  \\item Relevant Coursework: Algorithms, Data Structures, Machine Learning
\\end{itemize}

\\section*{Experience}
\\textbf{Software Engineer} \\hfill Company Name, City\\\\
\\textit{Month Year - Present}
\\begin{itemize}[leftmargin=*]
  \\item Developed and maintained web applications using React and Node.js
  \\item Collaborated with cross-functional teams to deliver features
  \\item Improved application performance by 40\\%
\\end{itemize}

\\section*{Projects}
\\textbf{Project Name} \\hfill \\href{https://github.com/user/project}{GitHub Link}
\\begin{itemize}[leftmargin=*]
  \\item Built a full-stack application using Next.js and MongoDB
  \\item Implemented real-time features using WebSockets
\\end{itemize}

\\section*{Skills}
\\textbf{Languages:} JavaScript, Python, Java, C++\\\\
\\textbf{Technologies:} React, Node.js, MongoDB, Docker, AWS

\\end{document}
`;
}

export function getPresentationTemplate() {
  return `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}

\\title{Your Presentation Title}
\\author{Your Name}
\\institute{Your Institution}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}
\\frametitle{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}
\\begin{frame}
\\frametitle{Introduction}
\\begin{itemize}
  \\item First point
  \\item Second point
  \\item Third point
\\end{itemize}
\\end{frame}

\\section{Main Content}
\\begin{frame}
\\frametitle{Main Content}
Your main content goes here.
\\end{frame}

\\section{Conclusion}
\\begin{frame}
\\frametitle{Conclusion}
\\begin{itemize}
  \\item Summary point 1
  \\item Summary point 2
\\end{itemize}
\\end{frame}

\\end{document}
`;
}
