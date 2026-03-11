export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  extension?: string;
}

export interface NoteFile {
  id: string;
  name: string;
  path: string;
  content: string;
  frontmatter?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceConfig {
  rootPath: string;
  name: string;
}

export type ViewMode = "list" | "grid" | "table";

export interface EditorState {
  activeNoteId: string | null;
  isEditing: boolean;
}
