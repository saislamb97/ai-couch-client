// src/api/endpoints.ts
import { api } from "./client";
import type { Agent, AgentCreateRequest, PaginatedAgents } from "@/types";

export async function listAgents(limit = 20, cursor?: string) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", cursor);
  const { data } = await api.get<PaginatedAgents>(`/api/agent/list/?${qs.toString()}`);
  return data;
}

export async function createAgent(payload: AgentCreateRequest) {
  const { data } = await api.post<Agent>("/api/agent/create/", payload);
  return data;
}

export async function getAgent(botId: string) {
  const { data } = await api.get<Agent>(`/api/agent/${encodeURIComponent(botId)}/`);
  return data;
}

export async function updateAgent(botId: string, payload: AgentCreateRequest) {
  const { data } = await api.put<Agent>(`/api/agent/${encodeURIComponent(botId)}/`, payload);
  return data;
}

export async function deleteAgent(botId: string, cascadeChats = true) {
  const qs = new URLSearchParams();
  qs.set("bot_id", botId);
  qs.set("cascade_chats", String(cascadeChats));
  await api.delete(`/api/agent/delete/?${qs.toString()}`);
}
