import { useWorkspaceStore } from "../../stores/workspaceStore";
import { writeFile, stringifyFrontmatter } from "../../services/fileService";
import { FileText, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "../../lib/utils";

export function Editor() {
  const { activeNote, updateNoteContent } = useWorkspaceStore();
  const [localContent, setLocalContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content);
      setHasUnsavedChanges(false);
    }
  }, [activeNote?.id, activeNote?.content]);

  const handleSave = useCallback(async () => {
    if (!activeNote || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const content = stringifyFrontmatter(
        activeNote.frontmatter || {},
        localContent
      );
      await writeFile(activeNote.path, content);
      updateNoteContent(activeNote.id, localContent);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }, [activeNote, localContent, hasUnsavedChanges, updateNoteContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    setHasUnsavedChanges(value !== activeNote?.content);
  };

  if (!activeNote) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <FileText className="h-16 w-16 opacity-20" />
          <p className="text-lg">选择一个文件开始编辑</p>
          <p className="text-sm">或创建新文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{activeNote.name}</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="未保存" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
              hasUnsavedChanges
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <textarea
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          className="w-full h-full p-4 bg-background text-foreground resize-none focus:outline-none font-mono text-sm leading-relaxed"
          placeholder="开始输入..."
          spellCheck={false}
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <span>字数: {localContent.length}</span>
        <span>·</span>
        <span>行数: {localContent.split("\n").length}</span>
        {hasUnsavedChanges && <span>· 未保存</span>}
      </div>
    </div>
  );
}
