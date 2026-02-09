"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");

  const handleLogin = async () => {
    setError("");

    const res = await fetch("/api/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if(!res.ok){
      setError(data.message);
      return;
    }

    router.push("/");
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-xl w-80">
        <h1 className="text-white text-xl mb-4">Login</h1>

        <input
          placeholder="Username"
          className="w-full mb-2 p-2 rounded bg-gray-700 text-white"
          onChange={e=>setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-2 p-2 rounded bg-gray-700 text-white"
          onChange={e=>setPassword(e.target.value)}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleLogin}
          className="bg-blue-600 w-full mt-3 p-2 rounded text-white"
        >
          Login
        </button>

        <p className="text-gray-400 text-sm mt-3">
          No account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}

