import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req) {
  try {
    const { prompt, existingContent, mode } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    // 🧠 System prompt = your product brain
const systemPrompt = `
You are an expert LaTeX generator.

CRITICAL RULES:
- Output ONLY LaTeX code.
- Must compile with **pdfLaTeX**.
- NEVER use fontspec.
- NEVER use system fonts.
- NEVER use setmainfont.
- Use ONLY pdfLaTeX compatible packages.

Always start with this template:

\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{xcolor}
\\usepackage{hyperref}

Return a FULL compilable document.
Start with \\documentclass and end with \\end{document}.
`;



    let userPrompt = prompt;

    if (mode === "modify" && existingContent) {
      userPrompt = `
Here is existing LaTeX:
${existingContent}

Modify it based on request:
${prompt}
`;
    }

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    });

    const latex = completion.choices[0].message.content;

    return Response.json({
      latex,
      usage: completion.usage,
    });

  } catch (err) {
    console.error("AI ROUTE ERROR:", err);
    return Response.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}

