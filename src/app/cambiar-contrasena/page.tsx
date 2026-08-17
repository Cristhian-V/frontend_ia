"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

export default function CambiarContrasenaPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.changePassword(oldPassword, newPassword);
      await refreshUser();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-faro-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto h-16" />
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl bg-faro-surface border border-faro-border p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-faro-textlight">Cambiar contrasena</h2>
          <p className="mb-4 text-xs text-faro-text">
            Es tu primer ingreso. Debes cambiar la contrasena para continuar.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-faro-text">Contrasena actual</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-faro-text">Nueva contrasena</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-faro-text">Confirmar nueva contrasena</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-sm text-faro-textlight focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-colors"
          >
            {submitting ? "Guardando..." : "Cambiar contrasena"}
          </button>
        </form>
      </div>
    </div>
  );
}
