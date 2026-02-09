'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
  fetch("/api/me")
    .then(res => res.json())
    .then(user => {
      if (!user) window.location.href = "/login";
    });
}, []);

  const router = useRouter();
  
  // TEMPORARY: Hardcoded test projectId
  // Later you'll fetch this from your database (user's projects list)
  const testProjectId = "64f3a1e2b7c8d9f123456789";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-7xl font-bold text-white mb-4 drop-shadow-lg">
            📝 DocuFlow
          </h1>
          <p className="text-gray-300 text-2xl mb-2">
            Collaborative LaTeX Editor
          </p>
          <p className="text-gray-500 text-sm">
            Built with Next.js, MongoDB & Real-time Collaboration
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-4">
          <Link 
            href={`/project/${testProjectId}`}
            className="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all hover:scale-105 shadow-lg"
          >
            🚀 Open Test Project
          </Link>
          
          <button
            onClick={() => alert('Dashboard coming in Phase 2!')}
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            📊 My Projects (Coming Soon)
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-gray-800 bg-opacity-50 border border-gray-700 rounded-lg p-6 text-left">
          <h3 className="text-white font-bold mb-3">✨ Current Features:</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li>✅ Create files and folders</li>
            <li>✅ Nested folder structure</li>
            <li>✅ MongoDB persistence</li>
            <li>🚧 Code editor (Next Phase)</li>
            <li>🚧 Real-time collaboration (Next Phase)</li>
            <li>🚧 AI LaTeX generation (Next Phase)</li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs mt-8">
          Built by [Your Name] | 2026
        </p>
      </div>
    </div>
  );
}

