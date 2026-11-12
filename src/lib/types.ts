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
  motivos?: string[];
  procesable?: boolean;
  record: TransbelRecord;
}

export type TransbelIncompleto = TransbelSincPendiente;

export interface TransbelExcepcion {
  operacionId: number;
  cliente: string;
  patron: string;
  nroDui: string;
  nroEmbarque: string;
  imagen: string;
  recinto: string;
  referenciaCliente: string;
  tipoTransporteId: string;
  transporte: string;
  fechaPaseSalida: string | null;
  fechaValidacion: string | null;
  pagoTributos: string | null;
  fechaLevante: string | null;
  diferencia: number | null;
  excepcionId: string | null;
  causaGlobal: string;
  causaPuntual: string;
  responsable: string;
  ajustable: string;
  requiereEx: string;
  usuario: string;
  asignadoId: number;
  asignado: string | null;
  fechaSync: string | null;
  fechaReg: string | null;
}

export interface TransbelExcepcionCatalogo {
  excepcionId: string;
  causaGlobal: string;
  causaPuntual: string;
  responsable: string;
  ajustable: string;
}

export interface TransbelProcesarResult {
  procesadas: number;
  ok: number;
  fallidas: number;
  noProcesables: { operacionId: number; motivo: string }[];
  results: {
    operacionId: number;
    ok: boolean;
    nroRegistro?: string;
    error?: string;
    completo: boolean;
    motivo: string;
  }[];
}

export interface TransbelProcesarPendienteResult {
  operacionId: number;
  enviados: number;
  yaEnviado: boolean;
  estadoId: string;
  finalizado: boolean;
  yaFinalizado: boolean;
  esAnticipadaIMA?: boolean;
}

export interface TransbelReferenciaResult {
  operacionId: number;
  referenciaCliente: string;
  anterior: string | null;
}

export interface TransbelIgnorarResult {
  operacionId: number;
  ignorado: boolean;
}

export interface TransbelRestaurarResult {
  operacionId: number;
  restaurado: boolean;
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


export type VacEstadoColor = "verde" | "ambar" | "rojo" | "gris";
export type VacCeldaEstado = "tomado" | "pagado" | "pendiente";

export interface VacAntiguedad {
  anios: number;
  meses: number;
  dias: number;
}

export interface VacSaldoInicial {
  gestion: number;
  diasCorresponden: number;
  diasPendientes: number;
  diasPagados: number;
  notas: string | null;
}

export interface VacCategoria {
  id: number;
  nombre: string;
  color: string;
  activo: boolean;
}

export interface VacRecalculo {
  usuarioId: number;
  gestion: number;
  diasCorresponden: number;
  antiguedad: VacAntiguedad | null;
}

export interface VacFuncionario {
  usuarioId: number;
  nombre: string;
  email: string | null;
  ci: string | null;
  sucursalId: number | null;
  estadoId: string | null;
  activo: boolean;
  categoria: string | null;
  categoriaColor: string;
  notas: string | null;
  fechaIngreso: string | null;
  antiguedad: VacAntiguedad | null;
  sinConfigurar: boolean;
  corresponden: number;
  arrastre: number;
  disponible: number;
  tomado: number;
  pagados: number;
  ajustes: number;
  planificado: number;
  porPlanificar: number;
  saldoCierre: number;
  estadoColor: VacEstadoColor;
  saldoInicial: VacSaldoInicial | null;
}

export interface VacBloque {
  id: number;
  usuarioId: number;
  nombre: string;
  gestion: number;
  fechaDesde: string;
  fechaHasta: string;
  diasPlanificados: number;
  origen: "auto" | "manual" | "importado";
  notas: string | null;
  estadoColor: VacEstadoColor;
  categoriaColor: string;
  conflicto: boolean;
  celdas: VacCeldaEstado[];
}

export interface VacPlanEstado {
  gestion: number;
  estado: "borrador" | "bloqueado";
  bloqueadoPor: number | null;
  bloqueadoAt: string | null;
}

export interface VacFeriado {
  id: number;
  fecha: string;
  descripcion: string;
  ambito: "nacional" | "departamental";
  descuenta: boolean;
}

export interface VacConflicto {
  grupoId: number;
  grupoNombre: string;
  usuarioA: number;
  usuarioB: number;
  nombreA: string;
  nombreB: string;
  desde: string;
  hasta: string;
  dias: number;
  origen: "plan" | "licencia" | "mixto";
}

export interface VacGrupoMiembro {
  usuarioId: number;
  nombre: string;
}

export interface VacGrupo {
  id: number;
  nombre: string;
  cliente: string | null;
  notas: string | null;
  miembros: VacGrupoMiembro[];
}

export interface VacCronograma {
  gestion: number;
  estado: VacPlanEstado;
  funcionarios: VacFuncionario[];
  bloques: VacBloque[];
  conflictos: VacConflicto[];
  categorias: VacCategoria[];
  feriados: VacFeriado[];
}

export interface VacLicencia {
  id: number;
  usuarioId: number;
  nombre: string;
  fechaDesde: string;
  fechaHasta: string;
  activo: boolean;
  comentarios: string | null;
  diasCalculados: number;
  diasComputados: number;
  override: {
    diasComputados: number | null;
    incluida: boolean;
    notas: string | null;
  } | null;
}

export interface VacDiasTomados {
  gestion: number;
  licencias: VacLicencia[];
  total: number;
  feriados: VacFeriado[];
}

export interface VacCandidato {
  usuarioId: number;
  nombre: string;
  email: string | null;
  ci: string | null;
  sucursalId: number | null;
  estadoId: string | null;
}

export interface VacImportOpcion {
  usuarioId: number;
  nombre: string;
  ci: string | null;
}

export interface VacImportRosterRow {
  fila: number;
  ci: string | null;
  nombre: string;
  nombreNorm: string;
  cargo: string | null;
  fechaIngreso: string | null;
  dias: number | null;
  usuarioId: number | null;
  nombreIntegre: string | null;
  categoria?: string | null;
  estado: "ok" | "duplicado" | "no_encontrado";
  opciones: VacImportOpcion[];
}

export interface VacImportPlanRow {
  gestion: number;
  nombreRaw: string;
  nombreNorm: string;
  fechaDesde: string;
  fechaHasta: string;
  dias: number;
  usuarioId: number | null;
  nombreIntegre: string | null;
  estado: "ok" | "duplicado" | "no_encontrado";
  opciones: VacImportOpcion[];
}

export interface VacImportPreview {
  archivoHash: string;
  roster: VacImportRosterRow[];
  planes: VacImportPlanRow[];
  resumen: {
    roster: { total: number; ok: number; duplicados: number; noEncontrados: number };
    planes: { total: number; ok: number; duplicados: number; noEncontrados: number };
  };
}

export interface VacImportResult {
  rosterCreados: number;
  rosterActualizados: number;
  planesCreados: number;
  planesOmitidos: number;
  errores: string[];
}


export interface VacAjuste {
  id: number;
  usuarioId: number;
  gestion: number;
  dias: number;
  tipo: string;
  motivo: string | null;
  createdAt?: string;
}

export interface VacLicenciaOverrideResponse {
  usuarioLicenciaId: number;
  diasComputados: number | null;
  incluida: boolean;
  notas: string | null;
}

export interface IvaExencionCore {
  id: number;
  decreto: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  observacion: string | null;
  activo: boolean;
}

export type IvaExencionEstado = "vigente" | "vencido" | "futuro" | "inactivo";

export interface IvaExencion extends IvaExencionCore {
  partidas: number;
  estado: IvaExencionEstado;
}

export interface IvaExencionPartida {
  partida_arancel: string;
  descripcion: string;
}

export interface IvaExencionDetalle extends IvaExencionCore {
  estado: IvaExencionEstado;
  partidas: IvaExencionPartida[];
}

export interface ArancelPartida {
  codigo: string;
  descripcion: string;
  ga_porcentaje: string | null;
  ga_reducido: string | null;
  iva: string | null;
}

export interface IvaExencionImportResult {
  leidas: number;
  agregadas: number;
  yaExistian: number;
  invalidas: number;
}
