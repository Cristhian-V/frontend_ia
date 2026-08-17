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
  usuario_integre?: number | null;
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
    usuario_integre: "",
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
    setForm({ email: "", password: "", full_name: "", is_admin: false, usuario_integre: "", tools: [{ tool_key: TOOL_KEYS[0], role: "gestor" }] });
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
      usuario_integre: u.usuario_integre != null ? String(u.usuario_integre) : "",
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
        const body: any = { full_name: form.full_name, is_admin: form.is_admin, usuario_integre: form.usuario_integre ? Number(form.usuario_integre) : null, tools: form.tools };
        if (form.password) body.password = form.password;
        await api.admin.updateUser(editing.id, body);
      } else {
        await api.admin.createUser({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          is_admin: form.is_admin,
          usuario_integre: form.usuario_integre ? Number(form.usuario_integre) : null,
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
        <p className="text-sm text-faro-text">Acceso denegado</p>
      </EmptyState>
    );
  }

  return (
    <div>
      <PageHeader title="Configuraciones" subtitle="Gestion de usuarios y permisos">
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Nuevo usuario
        </button>
      </PageHeader>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="text-sm text-faro-text">Cargando...</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-faro-border bg-faro-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-faro-border bg-white/[0.04]">
                <th className="px-4 py-3 text-left font-medium text-faro-text">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-faro-text">Email</th>
                <th className="px-4 py-3 text-left font-medium text-faro-text">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-faro-text">Herramientas</th>
                <th className="px-4 py-3 text-right font-medium text-faro-text">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-faro-border last:border-0">
                  <td className="px-4 py-3 font-medium text-faro-textlight">{u.full_name}</td>
                  <td className="px-4 py-3 text-faro-text">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_admin
                          ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                          : "bg-white/[0.04] text-faro-text"
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
                      className="rounded px-2 py-1 text-xs font-medium text-faro-text hover:bg-white/[0.04] mr-1"
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
          <div className="w-full max-w-md rounded-xl bg-faro-surface p-6 shadow-xl border border-faro-border" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-faro-textlight">
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
              {!editing ? (
                <p className="rounded-lg border border-faro-border bg-faro-bg px-3 py-2 text-xs text-faro-text">
                  Contrasena inicial: <span className="font-semibold text-faro-textlight">123456</span>. El usuario debera cambiarla en su primer ingreso.
                </p>
              ) : (
                <TextField
                  label="Contrasena (dejar vacio para no cambiar)"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}
              <TextField
                label="ID Integgre"
                type="number"
                value={form.usuario_integre}
                onChange={(e) => setForm({ ...form, usuario_integre: e.target.value })}
                placeholder="UsuarioId de Integgre"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_admin}
                  onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                  className="rounded border-faro-border"
                />
                <label className="text-sm text-faro-textlight">Administrador</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-faro-text">Herramientas</label>
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
                            className="rounded border-faro-border"
                          />
                          <span className="text-sm text-faro-textlight">{label}</span>
                        </label>
                        {checked && key === TOOL_KEYS[0] && (
                          <select
                            value={entry?.role || ""}
                            onChange={(e) => setRole(key, e.target.value || null)}
                            className="rounded-lg border border-faro-border bg-faro-bg px-2 py-1 text-xs text-faro-textlight focus:border-blue-500 focus:outline-none"
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
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-faro-text hover:bg-white/[0.04]">
                Cancelar
              </button>
              <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                {editing ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
