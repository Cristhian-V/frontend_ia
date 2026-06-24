const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:4000";

import type { User, ToolEntry, Progress, Doc, Chunk } from "./types";

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  base: string = API_BASE,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Error en la solicitud");
  }

  return data as T;
}

// Auth
export const api = {
  auth: {
    register: (body: { email: string; password: string; full_name: string }) =>
      request<{ access_token: string; token_type: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    login: (body: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    me: () =>
      request<User>("/auth/me"),
  },

  documents: {
    upload: (file: File, extractReferences: boolean = true) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("extract_references", String(extractReferences));

      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      return fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers,
        body: formData,
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al subir");
        return data;
      });
    },

    list: () =>
      request<Doc[]>("/documents/"),

    chunks: (id: string) =>
      request<Chunk[]>(
        `/documents/${id}/chunks`
      ),

    delete: (id: string) =>
      request<void>(`/documents/${id}`, { method: "DELETE" }),

    progress: (id: string) =>
      request<Progress>(`/documents/${id}/progress`),
  },

  rag: {
    query: (body: { query: string; top_k?: number; response_mode?: string }) =>
      request<{ answer: string; chunks: any[]; model: string }>("/rag/query", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    history: () => request<any[]>("/rag/history"),

    historyAll: () => request<any[]>("/rag/history/all"),

    historyItem: (id: string) => request<any>(`/rag/history/${id}`),
  },

  pending: {
    grouped: () =>
      request<
        {
          ref_type: string;
          ref_number: string;
          ref_title: string;
          relation: string;
          resolved: boolean;
          refs: {
            ref_id: string;
            chapter_title: string;
            ref_article: string;
            source_filename: string;
            chunk_text: string;
            resolved: boolean;
          }[];
          ref_ids: string[];
        }[]
      >("/pending/grouped"),

    resolve: (refId: string, documentId: string | null, cascade: boolean = true) =>
      request<{ status: string }>(`/pending/${refId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ document_id: documentId, cascade }),
      }),

    delete: (refId: string) =>
      request<void>(`/pending/${refId}`, { method: "DELETE" }),
  },

  admin: {
    listUsers: () =>
      request<User[]>("/admin/users", {}, ADMIN_API_BASE),

    createUser: (body: {
      email: string;
      password: string;
      full_name: string;
      is_admin?: boolean;
      tools?: ToolEntry[];
    }) =>
      request<{ id: number }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
      }, ADMIN_API_BASE),

    updateUser: (
      id: number,
      body: {
        full_name?: string;
        password?: string;
        is_admin?: boolean;
        tools?: ToolEntry[];
      }
    ) =>
      request<{ status: string }>(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }, ADMIN_API_BASE),

    deleteUser: (id: number) =>
      request<void>(`/admin/users/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
  },

  checklist: {
    stats: () =>
      request<{
        total: number;
        subidos: number;
        porcentaje: number;
        categorias: { categoria: string; total: number; subidos: number }[];
      }>("/checklist/stats"),

    list: (params?: { categoria?: string; subido?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.categoria) qs.set("categoria", params.categoria);
      if (params?.subido !== undefined) qs.set("subido", String(params.subido));
      const q = qs.toString();
      return request<{ id: string; indice: string; categoria: string; codigo: string; subido: boolean }[]>(
        `/checklist/${q ? `?${q}` : ""}`
      );
    },
  },

  ocr: {
    extract: (file: File, onProgress?: (loaded: number, total: number) => void) => {
      const formData = new FormData();
      formData.append("file", file);

      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      return new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/ocr/extract`);
        if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(e.loaded, e.total);
          };
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition") || "";
            const match = disposition.match(/filename="?([^";]+)"?/);
            const filename = match ? match[1] : "documento.docx";
            resolve({ blob, filename });
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.detail || "Error al procesar"));
            } catch {
              reject(new Error("Error al procesar"));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Error de conexion"));
        xhr.responseType = "blob";
        xhr.send(formData);
      });
    },
  },
};
