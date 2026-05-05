"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PUNCHY = [
  { num: "01", title: "Real-time co-writing", line: "Cursors, comments, live presence — like Figma for writers." },
  { num: "02", title: "AI that gets technical", line: "LaTeX, code, citations. Drafts and fixes in one click." },
  { num: "03", title: "Ship anywhere", line: "Export pixel-perfect PDFs, web pages, or slides." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const text = await res.text();
      const data = text ? (() => { try { return JSON.parse(text); } catch { return { message: text }; } })() : {};
      if (!res.ok) {
        setError(data.message || `Server error (${res.status}).`);
        setLoading(false);
        return;
      }
      router.push("/login");
    } catch (err) {
      setError("Network error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg min-h-screen w-full allow-scroll grid lg:grid-cols-2">
      {/* LEFT — FORM */}
      <div className="relative flex items-center justify-center p-6 lg:p-12 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center text-sm font-black">D</div>
            <span className="text-lg font-semibold">DocuFlow</span>
          </Link>

          <div className="glow-border p-8 md:p-10 animate-fade-up">
            <h1 className="text-3xl font-black tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-white/55">
              Already have one?{" "}
              <Link href="/login" className="text-violet-300 hover:text-violet-200 font-medium">Log in</Link>
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/55 mb-2">Username</label>
                <input
                  className="input-glass"
                  placeholder="pick_a_handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/55 mb-2">Email</label>
                <input
                  type="email"
                  className="input-glass"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/55 mb-2">Password</label>
                <input
                  type="password"
                  className="input-glass"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-up">
                  {error}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={loading || !username || !email || !password}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>Create account <span>→</span></>
                )}
              </button>
            </div>

            <div className="mt-7 pt-6 border-t border-white/5 text-xs text-white/40 text-center">
              Free forever for personal projects · No credit card needed
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — BRAND / PUNCHY LINES */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden order-1 lg:order-2">
        <Link href="/" className="flex items-center gap-2 self-end relative z-10">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-base font-black">D</div>
          <span className="text-lg font-semibold tracking-tight">DocuFlow</span>
        </Link>

        <div className="relative z-10 max-w-md self-end text-right">
          <span className="chip"><span className="chip-dot" /> Join 12,000+ writers</span>
          <h2 className="mt-5 text-5xl font-black tracking-tight leading-[1.05]">
            <span className="text-gradient">A new way to</span><br />
            <span className="text-gradient">write together.</span>
          </h2>
          <p className="mt-5 text-white/65 text-lg">
            Stop juggling Overleaf, Google Docs, ChatGPT, and Slack.
            DocuFlow puts the whole loop in one canvas.
          </p>

          <div className="mt-10 space-y-3">
            {PUNCHY.map((p, i) => (
              <div key={p.num} className={`glass glass-hover p-4 flex items-center gap-4 text-left animate-fade-up delay-${(i+1)*100}`}>
                <span className="text-2xl font-black text-gradient-accent flex-shrink-0">{p.num}</span>
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-white/55">{p.line}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40 self-end">
          End-to-end encrypted · GDPR-ready · 2026
        </p>
      </div>
    </div>
  );
}
