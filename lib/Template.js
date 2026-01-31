export function getLaTeXBoilerplate(title = 'Document', author = 'Your Name') {
  return `\\documentclass[12pt,a4paper]{article}

\\title{${title}}
\\author{${author}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here. This is a brief summary of your document.
\\end{abstract}

\\section{Introduction}

Your introduction goes here. You can write multiple paragraphs.

This is a second paragraph in the introduction section.

\\section{Methods}

Describe your methods here.

\\subsection{Subsection Example}

You can have subsections too.

\\section{Results}

Present your results here.

\\begin{itemize}
  \\item First point
  \\item Second point
  \\item Third point
\\end{itemize}

\\section{Conclusion}

Conclude your document here.

\\end{document}
`;
}

export function getResumeTemplate(name = 'Your Name') {
  return `\\documentclass[11pt,a4paper]{article}

\\title{Resume}
\\author{}
\\date{}

\\begin{document}

\\begin{center}
{\\Large \\textbf{${name}}}

\\vspace{0.5em}

Email: your.email@example.com | Phone: +1-234-567-8900

LinkedIn: linkedin.com/in/yourprofile | GitHub: github.com/yourusername
\\end{center}

\\section*{Education}

\\textbf{University Name} --- City, Country

Bachelor of Science in Computer Science --- 2020 - 2024

\\begin{itemize}
  \\item GPA: 3.8/4.0
  \\item Relevant Coursework: Algorithms, Data Structures, Machine Learning
\\end{itemize}

\\section*{Experience}

\\textbf{Software Engineer} --- Company Name, City

\\textit{January 2024 - Present}

\\begin{itemize}
  \\item Developed web applications using React and Node.js
  \\item Collaborated with cross-functional teams
  \\item Improved application performance by 40\\%
\\end{itemize}

\\textbf{Intern Software Developer} --- Another Company, City

\\textit{June 2023 - December 2023}

\\begin{itemize}
  \\item Built RESTful APIs using Express.js
  \\item Implemented authentication system
  \\item Wrote unit tests achieving 85\\% coverage
\\end{itemize}

\\section*{Projects}

\\textbf{DocuFlow - Collaborative LaTeX Editor}

\\begin{itemize}
  \\item Built full-stack application with Next.js and MongoDB
  \\item Implemented real-time collaboration using WebSockets
  \\item Integrated AI for document generation
\\end{itemize}

\\textbf{E-Commerce Platform}

\\begin{itemize}
  \\item Developed online store with payment integration
  \\item Used React for frontend and Node.js for backend
  \\item Deployed on AWS with CI/CD pipeline
\\end{itemize}

\\section*{Skills}

\\textbf{Languages:} JavaScript, Python, Java, C++

\\textbf{Frontend:} React, Next.js, HTML, CSS, TailwindCSS

\\textbf{Backend:} Node.js, Express, MongoDB, PostgreSQL

\\textbf{Tools:} Git, Docker, AWS, Vercel, VS Code

\\section*{Certifications}

\\begin{itemize}
  \\item AWS Certified Developer Associate
  \\item MongoDB Certified Developer
\\end{itemize}

\\end{document}
`;
}

export function getPresentationTemplate() {
  return `\\documentclass{article}

\\title{Presentation Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section*{Slide 1: Introduction}

Welcome to this presentation.

\\begin{itemize}
  \\item Point 1
  \\item Point 2
  \\item Point 3
\\end{itemize}

\\section*{Slide 2: Main Content}

Here is the main content of your presentation.

\\textbf{Key Points:}

\\begin{enumerate}
  \\item First important point
  \\item Second important point
  \\item Third important point
\\end{enumerate}

\\section*{Slide 3: Conclusion}

\\begin{center}
\\textbf{Thank You!}

Questions?
\\end{center}

\\end{document}
`;
}

export function getArticleTemplate() {
  return `\\documentclass[12pt]{article}

\\title{Article Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
This is the abstract of your article. It should briefly summarize 
the main points and findings of your work.
\\end{abstract}

\\section{Introduction}

The introduction provides background information and context for 
your article. State your main thesis or research question here.

\\section{Literature Review}

Discuss previous work and research related to your topic.

\\section{Methodology}

Explain your approach and methods used in this work.

\\subsection{Data Collection}

Describe how you collected your data.

\\subsection{Analysis}

Explain your analysis techniques.

\\section{Results}

Present your findings here.

\\section{Discussion}

Interpret your results and discuss their implications.

\\section{Conclusion}

Summarize your main points and findings.

\\end{document}
`;
}
