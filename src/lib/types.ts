export interface ToolEntry {
  tool_key: string;
  role: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  must_change_password: boolean;
  usuario_integre?: number | null;
  tools: ToolEntry[];
}

export interface Doc {
  id: string;
  filename: string;
  doc_number: string | null;
  doc_title: string | null;
  doc_type: string;
  page_count: number;
  chunks_count: number;
  status: string;
  created_at: string;
}

export interface Chunk {
  id: string;
  chunk_index: number;
  text: string;
  chapter_title?: string;
  page_start?: number;
  page_end?: number;
}

export interface Progress {
  status: string;
  stage: string;
  current: number;
  total: number;
  message: string;
  pages: number;
  chunks_found: number;
  error: string | null;
}

export interface TipoCambio {
  fecha: string;
  compra: number;
  venta: number;
}

export interface OperacionXml {
  OperacionId: number;
  NroRegistro: string;
  Patron: string;
  Recinto: string;
  FechaValidacion: string | null;
  FechaPago: string | null;
  FechaSalidadeMercancia: string | null;
  Canal: string | null;
  MonedaId: string | null;
  FOB: number | null;
  Flete: number | null;
  ValorCIF: number | null;
  UsuarioId: string | null;
  UsuarioNombre: string | null;
  FechaReg: string | null;
  FechaMod: string | null;
}

export interface Entidad {
  EntidadId: number;
  TipoEntidadId: string;
  TipoEntidadDesc: string;
  Nit: string;
  Nombre: string;
  Pais: string;
  Direccion: string;
  Ciudad: string;
  Estado: string;
  DireccionPostal: string;
  Telefono: string;
  UsuarioId: number;
  FechaReg: string;
  FechaModificacion: string;
  Activo: boolean;
}
