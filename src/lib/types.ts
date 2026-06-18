export interface ToolEntry {
  tool_key: string;
  role: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
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
