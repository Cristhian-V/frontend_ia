const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ADMIN_API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? "http://localhost:4000";

import type { User, ToolEntry, Progress, Doc, Chunk, TipoCambio, OperacionXml, Entidad, TransbelSincPendiente, ControlOperacion, ControlResultadoRow, ControlImportSummary, ControlClicProgress } from "./types";
import type { VacFuncionario, VacCandidato, VacCronograma, VacPlanEstado, VacBloque, VacDiasTomados, VacGrupo, VacConflicto, VacFeriado, VacImportPreview, VacImportResult, VacAjuste, VacLicenciaOverrideResponse, VacCategoria, VacRecalculo, VacLicencia } from "./types";

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
      }, ADMIN_API_BASE),

    login: (body: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string; must_change_password: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }, ADMIN_API_BASE),

    me: () =>
      request<User>("/auth/me", {}, ADMIN_API_BASE),

    changePassword: (oldPassword: string, newPassword: string) =>
      request<{ status: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      }, ADMIN_API_BASE),
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
      usuario_integre?: number | null;
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
        usuario_integre?: number | null;
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
  liquidador: {
    tc: () =>
      request<TipoCambio | null>("/liquidador/tc", {}, ADMIN_API_BASE),
    tcHistorico: () =>
      request<TipoCambio[]>("/liquidador/tc/historico", {}, ADMIN_API_BASE),
  },
  transbel: {
    clasificar: (file: File) =>
      new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
        const formData = new FormData();
        formData.append("archivo", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${ADMIN_API_BASE}/transbel/clasificar`);
        if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);

        xhr.onload = () => {
          if (xhr.status === 200) {
            const blob = xhr.response as Blob;
            const disposition = xhr.getResponseHeader("Content-Disposition") || "";
            const match = disposition.match(/filename="?([^";]+)"?/);
            const filename = match ? match[1] : "procesado.xls";
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
      }),

    click: {
      pendientes: (limit = 100) =>
        request<{ total: number; operaciones: Record<string, unknown>[] }>(
          `/transbel/click/pendientes?limit=${limit}`,
          {},
          ADMIN_API_BASE
        ),
      backfill: (body: { limit?: number; dryRun?: boolean }) =>
        request<Record<string, unknown>>(
          "/transbel/click/backfill",
          { method: "POST", body: JSON.stringify(body) },
          ADMIN_API_BASE
        ),
    },

    sincronizacion: {
      pendientes: (limit = 200) =>
        request<{ total: number; completos: number; pendientes: TransbelSincPendiente[] }>(
          `/transbel/sincronizacion/pendientes?limit=${limit}`,
          {},
          ADMIN_API_BASE
        ),
      enviar: (operacionIds?: number[]) =>
        request<{ enviados: number; omitidos: number; operaciones: number[]; detalle?: string }>(
          "/transbel/sincronizacion/enviar",
          { method: "POST", body: JSON.stringify({ operacionIds }) },
          ADMIN_API_BASE
        ),
    },
  },
  fnning: {
    list: (page = 1, size = 30) =>
      request<{ data: OperacionXml[]; total: number; page: number; pages: number }>(
        `/fnning/operaciones?page=${page}&size=${size}`,
        {},
        ADMIN_API_BASE
      ),
    detail: (id: number) =>
      request<OperacionXml>(`/fnning/operaciones/${id}`, {}, ADMIN_API_BASE),
    full: (id: number) =>
      request<{ operacion: Record<string, unknown>; items: Record<string, unknown>[] }>(
        `/fnning/operaciones/${id}/full`,
        {},
        ADMIN_API_BASE
      ),
    delete: (id: number) =>
      request<{ detail: string }>(`/fnning/operaciones/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    xml: (id: number) =>
      fetch(`${ADMIN_API_BASE}/fnning/operaciones/${id}/xml`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }).then(async (r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || "Error") });
        const blob = await r.blob();
        const disposition = r.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/);
        const filename = match ? match[1] : `export_${id}.xml`;
        return { blob, filename };
      }),
    excel: (id: number) =>
      fetch(`${ADMIN_API_BASE}/fnning/operaciones/${id}/excel`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || "Error") });
        return r.blob();
      }),
    update: (id: number, body: Record<string, unknown>) =>
      request<{ detail: string }>(`/fnning/operaciones/${id}`, { method: "PUT", body: JSON.stringify(body) }, ADMIN_API_BASE),
    create: (body: Record<string, unknown>) =>
      request<{ OperacionId: number; detail: string }>("/fnning/operaciones", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
    recalcular: (operacion: Record<string, unknown>, items: Record<string, unknown>[]) =>
      request<{ operacion: Record<string, unknown>; items: Record<string, unknown>[]; calc: Record<string, number> }>(
        "/fnning/operaciones/recalcular",
        { method: "POST", body: JSON.stringify({ operacion, items }) },
        ADMIN_API_BASE
      ),
    parseExcel: (file: File) => {
      const formData = new FormData();
      formData.append("excel", file);
      return fetch(`${ADMIN_API_BASE}/fnning/operaciones/parse-excel`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || "Error al parsear") });
        return r.json() as Promise<{ operacion: Record<string, unknown>; items: Record<string, unknown>[] }>;
      });
    },
    entidades: {
      list: () => request<Entidad[]>("/fnning/entidades", {}, ADMIN_API_BASE),
      create: (body: Partial<Entidad>) =>
        request<{ EntidadId: number; detail: string }>("/fnning/entidades", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      update: (id: number, body: Partial<Entidad>) =>
        request<{ detail: string }>(`/fnning/entidades/${id}`, { method: "PUT", body: JSON.stringify(body) }, ADMIN_API_BASE),
      delete: (id: number) =>
        request<{ detail: string }>(`/fnning/entidades/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    },
  },
  adminFinning: {
    estado: () =>
      request<{ total: number; vacia: boolean }>("/admin-finning/estado", {}, ADMIN_API_BASE),
    cargarExcel: (file: File) => {
      const formData = new FormData();
      formData.append("excel", file);
      return fetch(`${ADMIN_API_BASE}/admin-finning/cargar-excel`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || "Error al cargar"); });
        return r.json() as Promise<{ insertados: number }>;
      });
    },
    validacion: () =>
      request<{ codigo_sap: string; codigo_mod: string; n: number; partidas: { codigo: string; descripcion: string }[] }[]>(
        "/admin-finning/validacion",
        {},
        ADMIN_API_BASE
      ),
    items: (codigoSap: string) =>
      request<Record<string, unknown>[]>(
        `/admin-finning/items?codigo_sap=${encodeURIComponent(codigoSap)}`,
        {},
        ADMIN_API_BASE
      ),
    resolver: (codigoSap: string, partidaArancel: string) =>
      request<{ status: string; actualizados: number }>(
        "/admin-finning/resolver",
        { method: "POST", body: JSON.stringify({ codigo_sap: codigoSap, partida_arancel: partidaArancel }) },
        ADMIN_API_BASE
      ),
  },
  control: {
    suma: {
      importar: (file: File) => {
        const formData = new FormData();
        formData.append("archivo", file);
        return fetch(`${ADMIN_API_BASE}/control/suma/import`, {
          method: "POST",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formData,
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.detail || "Error al importar");
          return data as ControlImportSummary;
        });
      },
    },
    operaciones: {
      list: (params: {
        page?: number;
        size?: number;
        fecha_desde?: string;
        fecha_hasta?: string;
        cliente?: string;
        regimen?: string;
        canal?: string;
      } = {}) =>
        request<{ data: ControlOperacion[]; total: number; page: number; pages: number }>(
          `/control/operaciones?${buildQs(params)}`,
          {},
          ADMIN_API_BASE
        ),
      update: (id: number, body: Partial<ControlOperacion>) =>
        request<ControlOperacion>(
          `/control/operaciones/${id}`,
          { method: "PATCH", body: JSON.stringify(body) },
          ADMIN_API_BASE
        ),
      refreshIntegre: (id: number) =>
        request<{ actualizado: boolean; detalle?: string; operacion?: ControlOperacion }>(
          `/control/operaciones/${id}/refresh-integre`,
          { method: "POST" },
          ADMIN_API_BASE
        ),
    },
    resultado: (params: {
      fecha_desde?: string;
      fecha_hasta?: string;
      cliente?: string;
      regimen?: string;
      canal?: string;
      estado?: string[];
      limit?: number;
    } = {}) =>
      request<{ total: number; data: ControlResultadoRow[] }>(
        `/control/resultado?${buildQs(params)}`,
        {},
        ADMIN_API_BASE
      ),
    clientes: () =>
      request<{ nit: string; nombre: string }[]>("/control/clientes", {}, ADMIN_API_BASE),
    filtros: () =>
      request<{
        regimenes: string[];
        canales: string[];
        clientes: { nit: string; nombre: string }[];
        estados: string[];
      }>("/control/filtros", {}, ADMIN_API_BASE),
    clic: {
      sync: (body: { dryRun?: boolean; limit?: number } = {}) =>
        request<{
          dryRun?: boolean;
          pendientes?: number;
          procesadas?: number;
          actualizadas?: number;
          sin_canal?: number;
          errores?: number;
        }>("/control/clic/sync", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      syncStart: (body: { limit?: number } = {}) =>
        request<{ started: boolean; reason?: string }>(
          "/control/clic/sync/start",
          { method: "POST", body: JSON.stringify(body) },
          ADMIN_API_BASE
        ),
      progress: () => request<ControlClicProgress>("/control/clic/progress", {}, ADMIN_API_BASE),
      estado: () =>
        request<{ sin_canal: number; ultima_sync: string | null }>(
          "/control/clic/estado",
          {},
          ADMIN_API_BASE
        ),
    },
  },
  vacaciones: {
    funcionarios: (gestion: number) =>
      request<VacFuncionario[]>(`/vacaciones/funcionarios?gestion=${gestion}`, {}, ADMIN_API_BASE),
    candidatos: () =>
      request<VacCandidato[]>("/vacaciones/candidatos", {}, ADMIN_API_BASE),
    updateFuncionario: (usuarioId: number, body: Record<string, unknown>) =>
      request<{ usuarioId: number }>(`/vacaciones/funcionarios/${usuarioId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }, ADMIN_API_BASE),
    recalcular: (usuarioId: number, gestion: number) =>
      request<VacRecalculo>(`/vacaciones/funcionarios/${usuarioId}/recalcular`, {
        method: "POST",
        body: JSON.stringify({ gestion }),
      }, ADMIN_API_BASE),
    recalcularTodos: (gestion: number) =>
      request<{ actualizados: number; sinFecha: number[]; gestiones: number[] }>(
        "/vacaciones/funcionarios/recalcular-todos",
        { method: "POST", body: JSON.stringify({ gestion }) },
        ADMIN_API_BASE
      ),
    saldosIniciales: (items: unknown[]) =>
      request<{ guardados: number }>("/vacaciones/saldos-iniciales", {
        method: "POST",
        body: JSON.stringify({ items }),
      }, ADMIN_API_BASE),
    ajustes: {
      list: (usuarioId?: number, gestion?: number) => {
        const qs = new URLSearchParams();
        if (usuarioId) qs.set("usuarioId", String(usuarioId));
        if (gestion) qs.set("gestion", String(gestion));
        return request<VacAjuste[]>(`/vacaciones/ajustes?${qs.toString()}`, {}, ADMIN_API_BASE);
      },
      create: (body: Record<string, unknown>) =>
        request<VacAjuste>("/vacaciones/ajustes", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      update: (id: number, body: Record<string, unknown>) =>
        request<VacAjuste>(`/vacaciones/ajustes/${id}`, { method: "PATCH", body: JSON.stringify(body) }, ADMIN_API_BASE),
      delete: (id: number) =>
        request<{ ok: boolean }>(`/vacaciones/ajustes/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    },
    cronograma: (gestion: number) =>
      request<VacCronograma>(`/vacaciones/cronograma?gestion=${gestion}`, {}, ADMIN_API_BASE),
    planEstado: (gestion: number) =>
      request<VacPlanEstado>(`/vacaciones/cronograma/estado?gestion=${gestion}`, {}, ADMIN_API_BASE),
    generar: (gestion: number, confirmar = false) =>
      request<{ gestion: number; generados: number; reemplazados: number; conflictos: VacConflicto[] }>(
        "/vacaciones/cronograma/generar",
        { method: "POST", body: JSON.stringify({ gestion, confirmar }) },
        ADMIN_API_BASE
      ),
    crearBloque: (body: Record<string, unknown>) =>
      request<VacBloque>("/vacaciones/planes", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
    editarBloque: (id: number, body: Record<string, unknown>) =>
      request<VacBloque>(`/vacaciones/planes/${id}`, { method: "PATCH", body: JSON.stringify(body) }, ADMIN_API_BASE),
    eliminarBloque: (id: number) =>
      request<{ ok: boolean }>(`/vacaciones/planes/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    bloquear: (gestion: number) =>
      request<VacPlanEstado>("/vacaciones/cronograma/bloquear", { method: "POST", body: JSON.stringify({ gestion }) }, ADMIN_API_BASE),
    desbloquear: (gestion: number) =>
      request<VacPlanEstado>("/vacaciones/cronograma/desbloquear", { method: "POST", body: JSON.stringify({ gestion }) }, ADMIN_API_BASE),
    diasTomados: (gestion: number, incluirInactivas = false) =>
      request<VacDiasTomados>(
        `/vacaciones/dias-tomados?gestion=${gestion}&incluirInactivas=${incluirInactivas}`,
        {},
        ADMIN_API_BASE
      ),
    agregarDiaTomado: (body: {
      usuarioId: number;
      fechaDesde: string;
      fechaHasta: string;
      comentarios?: string;
    }) =>
      request<VacLicencia>("/vacaciones/dias-tomados", {
        method: "POST",
        body: JSON.stringify(body),
      }, ADMIN_API_BASE),
    actualizarLicencia: (id: number, body: Record<string, unknown>) =>
      request<VacLicenciaOverrideResponse>(`/vacaciones/licencias/${id}`, { method: "PATCH", body: JSON.stringify(body) }, ADMIN_API_BASE),
    conflictos: (gestion: number) =>
      request<{ gestion: number; grupos: VacGrupo[]; conflictos: VacConflicto[] }>(
        `/vacaciones/conflictos?gestion=${gestion}`,
        {},
        ADMIN_API_BASE
      ),
    grupos: {
      list: () => request<VacGrupo[]>("/vacaciones/grupos", {}, ADMIN_API_BASE),
      create: (body: Record<string, unknown>) =>
        request<VacGrupo>("/vacaciones/grupos", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      update: (id: number, body: Record<string, unknown>) =>
        request<VacGrupo>(`/vacaciones/grupos/${id}`, { method: "PUT", body: JSON.stringify(body) }, ADMIN_API_BASE),
      delete: (id: number) =>
        request<{ ok: boolean }>(`/vacaciones/grupos/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    },
    categorias: {
      list: () => request<VacCategoria[]>("/vacaciones/categorias", {}, ADMIN_API_BASE),
      create: (body: Record<string, unknown>) =>
        request<VacCategoria>("/vacaciones/categorias", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      update: (id: number, body: Record<string, unknown>) =>
        request<VacCategoria>(`/vacaciones/categorias/${id}`, { method: "PATCH", body: JSON.stringify(body) }, ADMIN_API_BASE),
      delete: (id: number) =>
        request<{ ok: boolean }>(`/vacaciones/categorias/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    },
    feriados: {
      list: (gestion: number) =>
        request<VacFeriado[]>(`/vacaciones/feriados?gestion=${gestion}`, {}, ADMIN_API_BASE),
      create: (body: Record<string, unknown>) =>
        request<VacFeriado>("/vacaciones/feriados", { method: "POST", body: JSON.stringify(body) }, ADMIN_API_BASE),
      update: (id: number, body: Record<string, unknown>) =>
        request<VacFeriado>(`/vacaciones/feriados/${id}`, { method: "PATCH", body: JSON.stringify(body) }, ADMIN_API_BASE),
      delete: (id: number) =>
        request<{ ok: boolean }>(`/vacaciones/feriados/${id}`, { method: "DELETE" }, ADMIN_API_BASE),
    },
    importar: {
      preview: (file: File) => {
        const formData = new FormData();
        formData.append("archivo", file);
        return fetch(`${ADMIN_API_BASE}/vacaciones/importar/preview`, {
          method: "POST",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formData,
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.detail || "Error al leer el Excel");
          return data as VacImportPreview;
        });
      },
      apply: (body: unknown) =>
        request<VacImportResult>("/vacaciones/importar/apply", {
          method: "POST",
          body: JSON.stringify(body),
        }, ADMIN_API_BASE),
    },
  },
};

function buildQs(params: Record<string, string | number | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== null && v !== "") qs.append(key, String(v));
      }
    } else {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}
