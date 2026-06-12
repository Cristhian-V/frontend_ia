const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
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
      request<{ id: number; email: string; full_name: string }>("/auth/me"),

    logout: () => setToken(null),
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
      request<any[]>("/documents/"),

    chunks: (id: string) =>
      request<{ id: string; chunk_index: number; text: string }[]>(
        `/documents/${id}/chunks`
      ),

    delete: (id: string) =>
      request<void>(`/documents/${id}`, { method: "DELETE" }),

    progress: (id: string) =>
      request<{
        status: string;
        stage: string;
        current: number;
        total: number;
        message: string;
        pages: number;
        chunks_found: number;
        error: string | null;
      }>(`/documents/${id}/progress`),
  },

  rag: {
    query: (body: { query: string; top_k?: number; response_mode?: string }) =>
      request<{ answer: string; chunks: any[]; model: string }>("/rag/query", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    history: () => request<any[]>("/rag/history"),

    historyItem: (id: string) => request<any>(`/rag/history/${id}`),
  },

  pending: {
    list: (sourceDocId?: string) =>
      request<any[]>(`/pending/${sourceDocId ? `?source_doc_id=${sourceDocId}` : ""}`),

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
          }[];
          ref_ids: string[];
        }[]
      >("/pending/grouped"),

    resolve: (refId: string, documentId: string | null) =>
      request<{ status: string }>(`/pending/${refId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ document_id: documentId }),
      }),
  },
};
