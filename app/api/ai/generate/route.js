import OpenAI from "openai";

// Provider auto-selection: prefer Gemini (free + best at LaTeX), fall back to Groq.
// Both providers expose an OpenAI-compatible /chat/completions endpoint, so we
// only need a different baseURL + model name.
function buildClient() {
  if (process.env.GEMINI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      // gemini-2.5-flash currently has the most generous free-tier quota.
      // gemini-2.0-flash was moved off free tier (limit: 0) for new keys.
      model: "gemini-2.5-flash",
      provider: "gemini",
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: "llama-3.3-70b-versatile",
      provider: "groq",
    };
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert LaTeX generator.

CRITICAL RULES:
- Output ONLY LaTeX code. No markdown fences, no commentary, no explanations.
- The output must compile with **pdfLaTeX**.
- NEVER use fontspec, setmainfont, or any system-font / xelatex-only package.
- Use ONLY pdfLaTeX-compatible packages from texlive-latex-recommended:
  geometry, fontenc, inputenc, lmodern, amsmath, amssymb, graphicx,
  hyperref, xcolor, enumitem, booktabs, listings.
- Always return a FULL compilable document. Start with \\documentclass and end with \\end{document}.
- Escape LaTeX special characters in user-supplied text: % $ & # _ { } ~ ^ \\.

Default preamble to start from when generating a fresh document:

\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{hyperref}
`;

function stripCodeFences(text) {
  if (!text) return text;
  // Remove leading/trailing ```latex ... ``` or ``` ... ``` fences if the model added them.
  return text
    .replace(/^\s*```(?:latex|tex)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

export async function POST(req) {
  try {
    const { prompt, existingContent, mode } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    const cfg = buildClient();
    if (!cfg) {
      return Response.json(
        {
          error:
            "No AI provider configured. Set GEMINI_API_KEY (recommended) or GROQ_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    let userPrompt = prompt;
    if (mode === "modify" && existingContent) {
      userPrompt = `Here is the existing LaTeX:\n\n${existingContent}\n\nModify it based on this request:\n${prompt}`;
    }

    const completion = await cfg.client.chat.completions.create({
      model: cfg.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const latex = stripCodeFences(completion.choices[0].message.content);

    return Response.json({
      latex,
      provider: cfg.provider,
      model: cfg.model,
      usage: completion.usage,
    });
  } catch (err) {
    console.error("AI ROUTE ERROR:", err);
    return Response.json(
      { error: err?.message || "AI generation failed" },
      { status: 500 }
    );
  }
}
