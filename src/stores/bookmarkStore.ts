import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Bookmark {
  id: string;
  path: string;
  name: string;
  isDirectory: boolean;
  addedAt: number;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  addBookmark: (path: string, name: string, isDirectory: boolean) => void;
  removeBookmark: (id: string) => void;
  removeBookmarkByPath: (path: string) => void;
  isBookmarked: (path: string) => boolean;
  getBookmark: (path: string) => Bookmark | undefined;
  clearBookmarks: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (path, name, isDirectory) => {
        const { bookmarks } = get();
        if (bookmarks.some((b) => b.path === path)) return;
        set({
          bookmarks: [
            ...bookmarks,
            {
              id: generateId(),
              path,
              name,
              isDirectory,
              addedAt: Date.now(),
            },
          ],
        });
      },

      removeBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      removeBookmarkByPath: (path) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.path !== path),
        }));
      },

      isBookmarked: (path) => {
        return get().bookmarks.some((b) => b.path === path);
      },

      getBookmark: (path) => {
        return get().bookmarks.find((b) => b.path === path);
      },

      clearBookmarks: () => {
        set({ bookmarks: [] });
      },
    }),
    {
      name: "mdnotes-bookmarks",
    }
  )
);
