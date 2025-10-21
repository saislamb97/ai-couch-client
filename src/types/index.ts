// src/types/index.ts
export type Cursor = string | null;

export interface Agent {
  bot_id: string;
  name: string;
  voice_id?: string | null;
  prompt?: string;
  avatar?: string | null;
  created_at: string;
}

export interface PaginatedAgents {
  items: Agent[];
  next_cursor?: Cursor;
}

export interface Chat {
  session_id: string;
  query: string;
  response: string;
  created_at: string;
}

export interface PaginatedChats {
  items: Chat[];
  next_cursor?: Cursor;
}

export interface AgentCreateRequest {
  name: string;
  voice_id?: string | null;
  prompt?: string;
  avatar?: string | null;
}
