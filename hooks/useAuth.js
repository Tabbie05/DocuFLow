"use client";
import { useState } from "react";
import axios from "axios";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // LOGIN
  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/login", { username, password });
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/register", { username, email, password });
      setUser(response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const logout = () => setUser(null);

  return { user, loading, error, login, register, logout };
}
