import { create } from "zustand";
import { type FileNode, NoteFile, WorkspaceConfig } from "../types";

interface WorkspaceState {
  workspace: WorkspaceConfig | null;
  fileTree: FileNode[];
  activeNote: NoteFile | null;
  openNotes: NoteFile[];
  isLoading: boolean;
  error: string | null;

  setWorkspace: (config: WorkspaceConfig) => void;
  setFileTree: (tree: FileNode[]) => void;
  setActiveNote: (note: NoteFile | null) => void;
  addOpenNote: (note: NoteFile) => void;
  closeNote: (noteId: string) => void;
  updateNoteContent: (noteId: string, content: string) => void;
  initWorkspace: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspace: null,
  fileTree: [],
  activeNote: null,
  openNotes: [],
  isLoading: false,
  error: null,

  setWorkspace: (config: WorkspaceConfig) => set({ workspace: config }),

  setFileTree: (tree: FileNode[]) => set({ fileTree: tree }),

  setActiveNote: (note: NoteFile | null) => set({ activeNote: note }),

  addOpenNote: (note: NoteFile) => {
    const { openNotes } = get();
    if (!openNotes.find((n) => n.id === note.id)) {
      set({ openNotes: [...openNotes, note] });
    }
    set({ activeNote: note });
  },

  closeNote: (noteId: string) => {
    const { openNotes, activeNote } = get();
    const newOpenNotes = openNotes.filter((n) => n.id !== noteId);
    set({ openNotes: newOpenNotes });

    if (activeNote?.id === noteId) {
      const newActiveNote = newOpenNotes[newOpenNotes.length - 1] || null;
      set({ activeNote: newActiveNote });
    }
  },

  updateNoteContent: (noteId: string, content: string) => {
    const { openNotes, activeNote } = get();
    const updatedNotes = openNotes.map((n) =>
      n.id === noteId ? { ...n, content, updatedAt: Date.now() } : n
    );
    set({ openNotes: updatedNotes });

    if (activeNote?.id === noteId) {
      set({ activeNote: { ...activeNote, content, updatedAt: Date.now() } });
    }
  },

  initWorkspace: async () => {
    set({ isLoading: true, error: null });
    try {
      const { readFileTree } = await import("../services/fileService");
      const { getWorkspaceConfig } = await import("../services/configService");

      const config = await getWorkspaceConfig();
      if (config) {
        set({ workspace: config });
        const tree = await readFileTree(config.rootPath);
        set({ fileTree: tree });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "初始化工作区失败";
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshFileTree: async () => {
    const { workspace } = get();
    if (!workspace) return;

    try {
      const { readFileTree } = await import("../services/fileService");
      const tree = await readFileTree(workspace.rootPath);
      set({ fileTree: tree });
    } catch (err) {
      const message = err instanceof Error ? err.message : "刷新文件树失败";
      set({ error: message });
    }
  },
}));
