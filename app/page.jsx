'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const FEATURES = [
  {
    id: 'edit',
    label: 'Edit',
    icon: '✍️',
    headline: 'Write LaTeX, Markdown & code in one editor.',
    sub: 'A single canvas for academic papers, technical specs, and code-heavy docs. Live preview, smart shortcuts, no setup.',
    points: ['Monaco-powered editor', 'Live LaTeX → PDF preview', 'Syntax highlighting for 50+ languages'],
    accent: 'from-violet-500 via-fuchsia-500 to-pink-500',
  },
  {
    id: 'collab',
    label: 'Collaborate',
    icon: '🤝',
    headline: 'Real-time, shoulder-to-shoulder. From anywhere.',
    sub: 'See cursors. Edit together. Comment in the margin. Built on the same primitives as Figma & Notion.',
    points: ['Multi-cursor editing', 'Inline comments & @mentions', 'Presence avatars + activity feed'],
    accent: 'from-cyan-400 via-sky-500 to-violet-500',
  },
  {
    id: 'ai',
    label: 'AI',
    icon: '🤖',
    headline: 'Your co-author lives in the sidebar.',
    sub: 'Draft sections, fix LaTeX errors, summarize a 40-page PDF, generate citations — all without leaving the editor.',
    points: ['One-click rewrite & expand', 'Auto-fix compile errors', 'Citation lookup & BibTeX generation'],
    accent: 'from-emerald-400 via-cyan-400 to-blue-500',
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: '🚀',
    headline: 'Publish to PDF, web, or slides in one click.',
    sub: 'Export pixel-perfect PDFs, ship a hosted version, or render slides — same source, three outputs.',
    points: ['Crisp PDF rendering', 'One-click hosted preview links', 'Reveal.js slide export'],
    accent: 'from-amber-400 via-orange-500 to-pink-500',
  },
];

const STATS = [
  { num: '50ms', label: 'Live sync latency' },
  { num: '∞', label: 'Versions saved' },
  { num: 'AES-256', label: 'End-to-end encrypted' },
  { num: '99.9%', label: 'Uptime' },
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeFeature, setActiveFeature] = useState('edit');

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(u => { setUser(u && u.userId ? u : null); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const feature = FEATURES.find(f => f.id === activeFeature);

  return (
    <div className="aurora-bg min-h-screen w-full allow-scroll">
      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-sm font-black">D</div>
          <span className="text-lg font-semibold tracking-tight">DocuFlow</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#stats" className="hover:text-white transition-colors">Why us</a>
          <a href="#cta" className="hover:text-white transition-colors">Get started</a>
        </div>
        <div className="flex items-center gap-3">
          {authChecked && (user ? (
            <Link href="/project/64f3a1e2b7c8d9f123456789" className="btn-primary text-sm">Open editor →</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Log in</Link>
              <Link href="/register" className="btn-primary text-sm">Get started</Link>
            </>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 md:px-12 pt-12 md:pt-20 pb-20 md:pb-28 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="chip animate-fade-up">
            <span className="chip-dot" />
            <span>New · Real-time AI co-author is live</span>
          </div>

          <h1 className="mt-7 text-5xl md:text-7xl lg:text-8xl font-black leading-[1.02] tracking-tight animate-fade-up delay-100">
            <span className="text-gradient">Write. Compile.</span><br/>
            <span className="text-gradient">Ship. Together.</span>
          </h1>

          <p className="mt-7 text-lg md:text-xl text-white/65 max-w-2xl animate-fade-up delay-200">
            DocuFlow is the collaborative editor for technical writing.
            LaTeX, Markdown, code, and AI — in one premium canvas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-up delay-300">
            {authChecked && (user ? (
              <Link href="/project/64f3a1e2b7c8d9f123456789" className="btn-primary">
                Open your editor <span>→</span>
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary">Start writing free <span>→</span></Link>
                <Link href="/login" className="btn-ghost">I already have an account</Link>
              </>
            ))}
          </div>

          <p className="mt-5 text-xs text-white/40 animate-fade-up delay-400">
            No credit card. Free forever for personal projects.
          </p>
        </div>

        {/* HERO PREVIEW CARD */}
        <div className="relative mt-16 mx-auto max-w-5xl animate-fade-up delay-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/40 via-fuchsia-500/30 to-cyan-500/40 rounded-3xl blur-2xl opacity-60 animate-pulse-glow pointer-events-none" />
          <div className="glass-strong relative overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
              <span className="h-3 w-3 rounded-full bg-green-400/80" />
              <span className="ml-3 text-xs text-white/50 font-mono">docuflow / paper.tex</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/5">
              <pre className="p-5 text-[12px] leading-relaxed font-mono text-white/80 overflow-hidden">
                <span className="text-violet-300">\documentclass</span>{`{article}`}{'\n'}
                <span className="text-violet-300">\title</span>{`{Quantum Tunneling}`}{'\n'}
                <span className="text-violet-300">\author</span>{`{Tayba Shaikh}`}{'\n'}
                <span className="text-violet-300">\begin</span>{`{document}`}{'\n'}
                <span className="text-violet-300">\maketitle</span>{'\n\n'}
                <span className="text-cyan-300">% AI:</span> <span className="text-white/50">draft section on barriers</span>{'\n'}
                <span className="text-violet-300">\section</span>{`{Potential Barriers}`}{'\n'}
                When a particle of energy{` `}<span className="text-pink-300">$E$</span>{' '}
                {`encounters a barrier of\nheight `}<span className="text-pink-300">$V_0 &gt; E$\\dots$</span>
              </pre>
              <div className="p-5 bg-white text-gray-900 text-sm">
                <h3 className="text-2xl font-serif font-bold">Quantum Tunneling</h3>
                <p className="text-xs text-gray-500 mt-0.5">Tayba Shaikh</p>
                <h4 className="mt-4 font-semibold">1. Potential Barriers</h4>
                <p className="mt-1.5 leading-relaxed text-gray-700">
                  When a particle of energy <em>E</em> encounters a barrier of height V<sub>0</sub> &gt; E…
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live preview · synced
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE TOGGLE */}
      <section id="features" className="relative px-6 md:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="chip"><span className="chip-dot" /> Built for the way you actually write</span>
          <h2 className="mt-5 text-4xl md:text-5xl font-black tracking-tight">
            Four superpowers. <span className="text-gradient-accent">One editor.</span>
          </h2>
        </div>

        {/* TOGGLE TABS */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FEATURES.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFeature === f.id
                  ? 'text-white'
                  : 'text-white/55 hover:text-white/85'
              }`}
            >
              {activeFeature === f.id && (
                <span className={`absolute inset-0 rounded-full bg-gradient-to-r ${f.accent} opacity-90 shadow-lg shadow-violet-500/20`} />
              )}
              <span className="relative flex items-center gap-2">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* TOGGLE PANEL */}
        <div key={feature.id} className="glow-border p-8 md:p-12 animate-fade-up">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.accent} text-2xl shadow-2xl shadow-black/40`}>
                {feature.icon}
              </div>
              <h3 className="mt-5 text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {feature.headline}
              </h3>
              <p className="mt-4 text-white/65 text-base md:text-lg">{feature.sub}</p>
              <ul className="mt-6 space-y-3">
                {feature.points.map(p => (
                  <li key={p} className="flex items-start gap-3 text-white/80">
                    <span className={`mt-1 h-5 w-5 rounded-md bg-gradient-to-br ${feature.accent} flex items-center justify-center text-xs flex-shrink-0`}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DECORATIVE FEATURE VISUAL */}
            <div className="relative h-[300px] md:h-[360px]">
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.accent} opacity-15 blur-3xl`} />
              <div className="glass-strong relative h-full p-6 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-[#0a0a0e]" />
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 border-2 border-[#0a0a0e]" />
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-[#0a0a0e]" />
                  </div>
                  <span className="text-xs text-white/50">3 collaborators · live</span>
                </div>

                <div className="space-y-2.5">
                  <div className="h-2.5 w-3/4 rounded-full bg-white/10" />
                  <div className="h-2.5 w-5/6 rounded-full bg-white/10" />
                  <div className="h-2.5 w-1/2 rounded-full bg-gradient-to-r from-white/30 to-white/10" />
                  <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`chip bg-gradient-to-r ${feature.accent} bg-clip-text text-transparent border-white/15`}>
                    {feature.label} mode
                  </span>
                  <span className="text-xs font-mono text-white/40">⌘K</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative px-6 md:px-12 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={s.label} className={`glass glass-hover p-6 text-center animate-fade-up delay-${(i+1)*100}`}>
              <div className="text-3xl md:text-4xl font-black text-gradient-accent">{s.num}</div>
              <div className="mt-1.5 text-xs uppercase tracking-wider text-white/55">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="cta" className="relative px-6 md:px-12 py-24 max-w-5xl mx-auto">
        <div className="glow-border p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/30 blur-3xl pointer-events-none" />
          <h2 className="relative text-4xl md:text-6xl font-black tracking-tight">
            Stop juggling tools. <br/>
            <span className="text-gradient">Start shipping documents.</span>
          </h2>
          <p className="relative mt-5 text-white/65 max-w-xl mx-auto">
            Join writers, researchers, and engineers who switched to a single, beautiful, real-time editor.
          </p>
          <div className="relative mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            {authChecked && (user ? (
              <Link href="/project/64f3a1e2b7c8d9f123456789" className="btn-primary">Open your editor →</Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary">Create free account →</Link>
                <Link href="/login" className="btn-ghost">Log in</Link>
              </>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative px-6 md:px-12 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400" />
            <span>DocuFlow · 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Built with Next.js, MongoDB & love</span>
            <span className="hidden md:inline">·</span>
            <span>Tayba Shaikh</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
