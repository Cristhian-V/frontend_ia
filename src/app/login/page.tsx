"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-faro-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white">
              <path d="M8 9h8" />
              <path d="M10 13h4" />
              <path d="M12 22v-9" />
              <path d="m9 22 2-9h2l2 9" />
              <path d="M11 5.5a1.5 1.5 0 0 1 2 0 1.5 1.5 0 0 1-2 0Z" />
              <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1h20v1Z" />
              <path d="M18 16V9a6 6 0 0 0-12 0v7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-cyan-400">F.A.R.O.</h1>
          <p className="text-[10px] text-faro-text uppercase tracking-wider mt-1">
            Framework de Asistencia, Respuesta y Operaciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-faro-surface border border-faro-border p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-faro-textlight">Iniciar sesion</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-faro-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-faro-text">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-colors"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="mt-4 text-center text-sm text-faro-text">
            No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-cyan-400 hover:text-cyan-300">
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
