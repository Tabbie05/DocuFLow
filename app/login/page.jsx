"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PUNCHY = [
  { icon: "✍️", title: "Write LaTeX", line: "Live preview, smart shortcuts, zero setup." },
  { icon: "🤝", title: "Co-edit live", line: "Cursors, comments, presence — built in." },
  { icon: "🤖", title: "AI co-author", line: "Draft, fix, summarize without leaving the editor." },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      const data = text ? (() => { try { return JSON.parse(text); } catch { return { message: text }; } })() : {};
      if (!res.ok) {
        setError(data.message || `Server error (${res.status}).`);
        setLoading(false);
        return;
      }
      router.push("/");
    } catch (err) {
      setError("Network error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="aurora-bg min-h-screen w-full allow-scroll grid lg:grid-cols-2">
      {/* LEFT — BRAND / PUNCHY LINES */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-base font-black">D</div>
          <span className="text-lg font-semibold tracking-tight">DocuFlow</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <span className="chip"><span className="chip-dot" /> Welcome back</span>
          <h2 className="mt-5 text-5xl font-black tracking-tight leading-[1.05]">
            <span className="text-gradient">Pick up where</span><br />
            <span className="text-gradient">you left off.</span>
          </h2>
          <p className="mt-5 text-white/65 text-lg">
            Your documents, your collaborators, your AI co-author — all waiting.
          </p>

          <div className="mt-10 space-y-3">
            {PUNCHY.map((p, i) => (
              <div key={p.title} className={`glass glass-hover p-4 flex items-start gap-3 animate-fade-up delay-${(i+1)*100}`}>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                  {p.icon}
                </div>
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-white/55">{p.line}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          Trusted by writers, researchers and engineers · 2026
        </p>
      </div>

      {/* RIGHT — FORM */}
      <div className="relative flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile-only brand */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center text-sm font-black">D</div>
            <span className="text-lg font-semibold">DocuFlow</span>
          </Link>

          <div className="glow-border p-8 md:p-10 animate-fade-up">
            <h1 className="text-3xl font-black tracking-tight">Log in</h1>
            <p className="mt-2 text-sm text-white/55">
              Don't have an account?{" "}
              <Link href="/register" className="text-violet-300 hover:text-violet-200 font-medium">Create one</Link>
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/55 mb-2">Username</label>
                <input
                  className="input-glass"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/55 mb-2">Password</label>
                <input
                  type="password"
                  className="input-glass"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-up">
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !username || !password}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Logging in…
                  </>
                ) : (
                  <>Log in <span>→</span></>
                )}
              </button>
            </div>

            <div className="mt-7 pt-6 border-t border-white/5 text-xs text-white/40 text-center">
              By logging in you agree to our terms · End-to-end encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
