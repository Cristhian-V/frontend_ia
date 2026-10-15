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

export interface TransbelRecord {
  ENTREGA: string;
  FLIBER: string;
  FULTDOC: string;
  FNACIONAL: string;
  FETLAA: string;
  CODEXC_AA: string;
  FETL_TL: string;
  FENTCDP: string;
  CODEXC_TL: string;
}

export interface TransbelSincPendiente {
  operacionId: number;
  entrega: string;
  nroRegistro: string;
  gestion: number;
  recinto: number;
  nroDui: string;
  canal: string;
  completo: boolean;
  motivo: string;
  record: TransbelRecord;
}

export interface ControlOperacion {
  id: number;
  dim: string;
  gestion: number | null;
  aduana: number | null;
  dui: string | null;
  aduana_codigo: string | null;
  aduana_descripcion: string | null;
  fecha_aceptacion: string | null;
  estado: string | null;
  nit_declarante: string | null;
  razon_social_declarante: string | null;
  nro_referencia: string | null;
  destino_regimen_codigo: string | null;
  destino_regimen_descripcion: string | null;
  modalidad_regimen_codigo: string | null;
  modalidad_regimen_descripcion: string | null;
  modalidad_despacho: string | null;
  total_items: number | null;
  nit_importador: string | null;
  razon_social_importador: string | null;
  valor_cif: number | null;
  peso_bruto: number | null;
  tributos: number | null;
  rup_pago: string | null;
  fecha_pago: string | null;
  canal: string | null;
  fecha_asignacion_canal: string | null;
  fecha_levante: string | null;
  fecha_regularizacion: string | null;
  fecha_conclusion: string | null;
  regimen: string | null;
  dui_due: string | null;
  liquidador: string | null;
  planilla: number | null;
  planillado: number | null;
  planillador: string | null;
  observaciones: string | null;
  fecha_reporte_pago: string | null;
  archivo_origen: string | null;
  cliente_nombre: string | null;
}

export interface ControlResultadoRow extends ControlOperacion {
  mes: string;
  cat: string;
  dias: number | string;
  cancel_plazo: number | string;
  fecha_limite: string | null;
  semaforo: "verde" | "amarillo" | "rojo" | null;
}

export interface ControlClicProgress {
  running: boolean;
  phase: string;
  total: number;
  processed: number;
  updated: number;
  sin_canal: number;
  errores: number;
  currentDim: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

export interface ControlImportSummary {
  total: number;
  creados: number;
  actualizados: number;
  clientes: number;
  fecha_reporte_pago: string | null;
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
