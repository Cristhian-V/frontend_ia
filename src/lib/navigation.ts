import type { LucideIcon } from "lucide-react";
import {
  Bot,
  MessageSquare,
  FileText,
  History,
  Pin,
  CheckSquare,
  ScanText,
  Calculator,
  DollarSign,
  Package,
  Tag,
  FolderTree,
  FileSearch,
  Settings,
  Users,
} from "lucide-react";
import { TOOL_KEYS, TOOL_LABELS, ROLES } from "./tools";
import type { User } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const allSections: NavSection[] = [
  {
    key: TOOL_KEYS[0],
    label: TOOL_LABELS[TOOL_KEYS[0]],
    icon: Bot,
    items: [
      { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { label: "Documentos", href: "/dashboard/documentos", icon: FileText },
      { label: "Historial", href: "/dashboard/historial", icon: History },
      { label: "Pendientes", href: "/dashboard/pendientes", icon: Pin },
      { label: "Checklist", href: "/dashboard/checklist", icon: CheckSquare },
      { label: "OCR Extractor", href: "/dashboard/ocr-extractor", icon: ScanText },
    ],
  },
  {
    key: TOOL_KEYS[1],
    label: TOOL_LABELS[TOOL_KEYS[1]],
    icon: Calculator,
    items: [
      { label: "Tipo de Cambio", href: "/dashboard/liquidador/tipo-cambio", icon: DollarSign },
    ],
  },
  {
    key: TOOL_KEYS[2],
    label: TOOL_LABELS[TOOL_KEYS[2]],
    icon: Package,
    items: [
      { label: "Clasificador Arancelario", href: "/dashboard/transbel/clasificador", icon: Tag },
    ],
  },
  {
    key: TOOL_KEYS[3],
    label: TOOL_LABELS[TOOL_KEYS[3]],
    icon: FolderTree,
    items: [
      { label: "Operaciones XML", href: "/dashboard/fnning/operaciones-xml", icon: FileSearch },
    ],
  },
];

export function buildNavSections(user: User | null): NavSection[] {
  if (!user) return [];

  const isAdmin = user.is_admin;
  const userToolKeys = new Set(user.tools.map((t) => t.tool_key));

  const sections: NavSection[] = allSections
    .filter((s) => isAdmin || userToolKeys.has(s.key))
    .map((s) => {
      const cloned = { ...s, items: [...s.items] };

      if (!isAdmin && s.key === TOOL_KEYS[0]) {
        const agenteTool = user.tools.find((t) => t.tool_key === TOOL_KEYS[0]);
        if (agenteTool?.role === ROLES[0]) {
          cloned.items = cloned.items.filter((i) =>
            ["Chat", "Historial"].includes(i.label)
          );
        }
      }

      return cloned;
    });

  if (isAdmin) {
    sections.push({
      key: "admin",
      label: "Configuraciones",
      icon: Settings,
      items: [
        { label: "Usuarios", href: "/dashboard/configuraciones", icon: Users },
      ],
    });
  }

  return sections;
}

export function getFirstAccessibleRoute(user: User | null): string {
  const sections = buildNavSections(user);
  for (const section of sections) {
    if (section.items.length > 0) {
      return section.items[0].href;
    }
  }
  return "/dashboard/chat";
}
