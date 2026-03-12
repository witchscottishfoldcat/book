import { create } from "zustand";
import {
  searchNotes as searchNotesApi,
  SearchResult,
  getIndexStats,
  IndexStats,
} from "../services/searchService";

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  isOpen: boolean;
  stats: IndexStats | null;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  clearResults: () => void;
  loadStats: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],
  isSearching: false,
  error: null,
  isOpen: false,
  stats: null,

  setQuery: (query) => set({ query }),

  search: async (query) => {
    if (!query.trim()) {
      set({ results: [], error: null });
      return;
    }

    set({ isSearching: true, error: null });

    try {
      const results = await searchNotesApi(query, 50);
      set({ results, isSearching: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "搜索失败",
        isSearching: false,
        results: [],
      });
    }
  },

  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false }),
  toggleSearch: () => set((state) => ({ isOpen: !state.isOpen })),
  clearResults: () => set({ results: [], query: "", error: null }),

  loadStats: async () => {
    try {
      const stats = await getIndexStats();
      set({ stats });
    } catch {
      console.error("Failed to load index stats");
    }
  },
}));
