import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface IndexStats {
  total_notes: number;
}

export async function indexNote(
  path: string,
  title: string,
  content: string,
  tags: string[],
  modifiedAt: number
): Promise<void> {
  await invoke("index_note", {
    path,
    title,
    content,
    tags,
    modifiedAt,
  });
}

export async function removeNoteFromIndex(path: string): Promise<void> {
  await invoke("remove_note_from_index", { path });
}

export async function searchNotes(
  query: string,
  limit?: number
): Promise<SearchResult[]> {
  return await invoke<SearchResult[]>("search_notes", { query, limit });
}

export async function rebuildIndex(): Promise<void> {
  await invoke("rebuild_index");
}

export async function getIndexStats(): Promise<IndexStats> {
  return await invoke<IndexStats>("get_index_stats");
}
