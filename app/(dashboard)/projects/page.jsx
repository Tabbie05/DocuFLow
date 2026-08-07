'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProjectsDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((u) => {
        if (!u || !u.userId) router.push('/login');
        else loadProjects();
      });
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Untitled · ${new Date().toLocaleDateString()}` }),
      });
      if (!res.ok) throw new Error();
      const project = await res.json();
      router.push(`/project/${project._id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(null);
    try {
      await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      setProjects((p) => p.filter((x) => x._id !== id));
    } catch {}
  };

  const handleCopyLink = async (id) => {
    const url = `${window.location.origin}/project/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      flash('Link copied');
    } catch {
      flash('Could not copy', 'error');
    }
  };

  const flash = (msg, type = 'success') => {
    const el = document.createElement('div');
    el.className = `fixed top-5 right-5 px-5 py-3 rounded-xl shadow-2xl z-50 backdrop-blur-xl border text-sm font-medium ${
      type === 'success'
        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
        : 'bg-red-500/15 border-red-400/30 text-red-200'
    }`;
    el.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  };

  return (
    <div className="aurora-bg min-h-screen w-full allow-scroll">
      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 flex items-center justify-center text-sm font-black">
            D
          </div>
          <span className="text-lg font-semibold tracking-tight">DocuFlow</span>
        </Link>

        <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
          {creating ? 'Creating…' : '+ New project'}
        </button>
      </nav>

      <section className="relative px-6 md:px-12 pt-6 pb-20 max-w-6xl mx-auto">
        <div className="mb-8">
          <span className="chip"><span className="chip-dot" /> Your workspace</span>
          <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">
            <span className="text-gradient">Projects</span>
          </h1>
          <p className="mt-2 text-white/55 text-sm">
            Each project has its own URL — share it and collaborate live.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass p-5 h-32 animate-pulse">
                <div className="h-3 w-1/2 bg-white/10 rounded mb-3" />
                <div className="h-2.5 w-3/4 bg-white/5 rounded mb-2" />
                <div className="h-2.5 w-1/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glow-border p-10 text-center max-w-xl mx-auto animate-fade-up">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-2xl shadow-violet-500/40 flex items-center justify-center text-2xl mb-5">
              ✨
            </div>
            <h2 className="text-2xl font-black tracking-tight">
              <span className="text-gradient">No projects yet</span>
            </h2>
            <p className="mt-2 text-white/55 text-sm">
              Spin up your first one — every project gets a unique shareable link.
            </p>
            <button onClick={handleCreate} disabled={creating} className="btn-primary mt-6">
              {creating ? 'Creating…' : 'Create your first project →'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p._id}
                project={p}
                onOpen={() => router.push(`/project/${p._id}`)}
                onCopyLink={() => handleCopyLink(p._id)}
                onAskDelete={() => setDeleteId(p._id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass-strong p-6 max-w-sm w-full mx-4 rounded-2xl">
            <h3 className="text-lg font-bold">Delete project?</h3>
            <p className="mt-2 text-sm text-white/60">
              This permanently removes the project and its collaboration link. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="text-sm px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onOpen, onCopyLink, onAskDelete }) {
  const created = project.createdAt ? new Date(project.createdAt) : null;
  return (
    <div className="glass glass-hover p-5 group relative">
      <button onClick={onOpen} className="text-left w-full">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-md shadow-violet-500/30 flex items-center justify-center text-xs font-black">
            {(project.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{project.name || 'Untitled'}</p>
            <p className="text-[10px] font-mono text-white/35 truncate">id: {project._id}</p>
          </div>
        </div>
        {created && (
          <p className="text-[11px] text-white/45">
            Created {created.toLocaleDateString()} · {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </button>

      <div className="mt-4 flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onOpen}
          className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-400/30 text-violet-100 hover:bg-violet-500/30"
        >
          Open
        </button>
        <button
          onClick={onCopyLink}
          className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
        >
          Copy link
        </button>
        <button
          onClick={onAskDelete}
          title="Delete project"
          className="ml-auto text-[11px] font-medium px-2 py-1 rounded-md text-white/40 hover:text-red-300 hover:bg-red-500/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
