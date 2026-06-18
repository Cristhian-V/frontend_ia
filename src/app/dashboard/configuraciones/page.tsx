"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TOOL_LABELS, ROLE_LABELS, TOOL_KEYS } from "@/lib/tools";
import type { ToolEntry } from "@/lib/types";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TextField } from "@/components/TextField";

interface UserRow {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  tools: ToolEntry[];
}

export default function ConfiguracionesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    is_admin: false,
    tools: [] as ToolEntry[],
  });
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      const data = await api.admin.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", full_name: "", is_admin: false, tools: [{ tool_key: TOOL_KEYS[0], role: "gestor" }] });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email,
      password: "",
      full_name: u.full_name,
      is_admin: u.is_admin,
      tools: u.tools.map(t => ({ tool_key: t.tool_key, role: t.role })),
    });
    setError("");
    setModalOpen(true);
  };

  const toggleTool = (toolKey: string) => {
    setForm((prev) => {
      const exists = prev.tools.find(t => t.tool_key === toolKey);
      if (exists) {
        return { ...prev, tools: prev.tools.filter(t => t.tool_key !== toolKey) };
      }
      const role = toolKey === TOOL_KEYS[0] ? "gestor" : null;
      return { ...prev, tools: [...prev.tools, { tool_key: toolKey, role }] };
    });
  };

  const setRole = (toolKey: string, role: string | null) => {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.map(t => t.tool_key === toolKey ? { ...t, role } : t),
    }));
  };

  const handleSave = async () => {
    setError("");
    try {
      if (editing) {
        const body: any = { full_name: form.full_name, is_admin: form.is_admin, tools: form.tools };
        if (form.password) body.password = form.password;
        await api.admin.updateUser(editing.id, body);
      } else {
        await api.admin.createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          is_admin: form.is_admin,
          tools: form.tools,
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Eliminar a ${u.full_name}?`)) return;
    try {
      await api.admin.deleteUser(u.id);
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user?.is_admin) {
    return (
      <EmptyState>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Acceso denegado</p>
      </EmptyState>
    );
  }

  return (
    <div>
      <PageHeader title="Configuraciones" subtitle="Gestion de usuarios y permisos">
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          Nuevo usuario
        </button>
      </PageHeader>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Herramientas</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">{u.full_name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_admin
                          ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {u.is_admin ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.tools.map((t) => (
                        <span
                          key={t.tool_key}
                          className="inline-block rounded bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                        >
                          {TOOL_LABELS[t.tool_key] || t.tool_key}
                          {t.role && ` (${ROLE_LABELS[t.role] || t.role})`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 mr-1"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xl border border-zinc-200 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {editing ? "Editar usuario" : "Nuevo usuario"}
            </h2>

            {error && (
              <ErrorBanner message={error} className="mb-3 px-3 py-2" />
            )}

            <div className="space-y-3">
              <TextField
                label="Nombre completo"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              {!editing && (
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
              <TextField
                label={`Contrasena ${editing ? "(dejar vacio para no cambiar)" : ""}`}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                  className="rounded border-zinc-300 dark:border-zinc-700"
                />
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Administrador</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Herramientas</label>
                <div className="space-y-2">
                  {Object.entries(TOOL_LABELS).map(([key, label]) => {
                    const entry = form.tools.find(t => t.tool_key === key);
                    const checked = !!entry;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTool(key)}
                            className="rounded border-zinc-300 dark:border-zinc-700"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                        </label>
                        {checked && key === TOOL_KEYS[0] && (
                          <select
                            value={entry?.role || ""}
                            onChange={(e) => setRole(key, e.target.value || null)}
                            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
                          >
                            {Object.entries(ROLE_LABELS).map(([rk, rl]) => (
                              <option key={rk} value={rk}>{rl}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                Cancelar
              </button>
              <button onClick={handleSave} className="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600">
                {editing ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
