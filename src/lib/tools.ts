export const TOOL_KEYS = ["agente_aduanero_ia", "liquidador_ia"] as const;
export type ToolKey = (typeof TOOL_KEYS)[number];

export const ROLES = ["consultor", "gestor"] as const;
export type Role = (typeof ROLES)[number];

export const TOOL_LABELS: Record<string, string> = {
  agente_aduanero_ia: "Agente Aduanero IA",
  liquidador_ia: "Liquidador IA",
};

export const ROLE_LABELS: Record<string, string> = {
  gestor: "Gestor de documentos",
  consultor: "Consultor",
};

export const RELATION_LABELS: Record<string, string> = {
  deroga: "Deroga",
  modifica: "Modifica",
  referencia: "Referencia",
  complementa: "Complementa",
  base_legal: "Base legal",
};

export const TYPE_LABELS: Record<string, string> = {
  resolucion: "Resolucion",
  circular: "Circular",
  ley: "Ley",
  decreto: "Decreto",
  reglamento: "Reglamento",
  otro: "Otro",
};

export const CATEGORIA_LABELS: Record<string, string> = {
  LGA: "Ley General de Aduanas",
  RLGA: "Reglamento LGA",
  RD: "Resolucion de Directorio",
  Circular: "Circular",
  Instructivo: "Instructivo/Minuta",
  CTB: "Codigo Tributario Boliviano",
  Ley: "Ley",
  DS: "Decreto Supremo",
  Convenio: "Convenio Internacional",
  Otros: "Otros",
};
