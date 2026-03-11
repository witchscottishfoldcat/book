import { useWorkspaceStore } from "../../stores/workspaceStore";
import { writeFile, stringifyFrontmatter } from "../../services/fileService";
import { FileText, Save, Edit3, FileCode } from "lucide-react";
import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { cn } from "../../lib/utils";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

const MilkdownEditor = lazy(() =>
  import("./MilkdownEditor").then((mod) => ({ default: mod.MilkdownEditor }))
);

type EditorMode = "wysiwyg" | "source";

function EditorLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">加载编辑器...</span>
      </div>
    </div>
  );
}

function SourceEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.focus();
  }, []);

  const handleEditorChange = useCallback(
    (val: string | undefined) => {
      if (val !== undefined) {
        onChange(val);
      }
    },
    [onChange]
  );

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="markdown"
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: true, scale: 2 },
        fontSize: 14,
        lineNumbers: "on",
        wordWrap: "on",
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        folding: true,
        foldingStrategy: "indentation",
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        tabSize: 2,
        insertSpaces: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}

export function Editor() {
  const { activeNote, updateNoteContent } = useWorkspaceStore();
  const [localContent, setLocalContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("wysiwyg");

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

  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value);
    setHasUnsavedChanges(value !== activeNote?.content);
  }, [activeNote?.content]);

  const toggleEditorMode = useCallback(() => {
    setEditorMode((prev) => (prev === "wysiwyg" ? "source" : "wysiwyg"));
  }, []);

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
            onClick={toggleEditorMode}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
              "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            title={editorMode === "wysiwyg" ? "切换到源码模式" : "切换到所见即所得模式"}
          >
            {editorMode === "wysiwyg" ? (
              <>
                <FileCode className="h-3.5 w-3.5" />
                源码
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                编辑
              </>
            )}
          </button>
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
        {editorMode === "wysiwyg" ? (
          <Suspense fallback={<EditorLoading />}>
            <MilkdownEditor
              value={localContent}
              onChange={handleContentChange}
              className="h-full"
            />
          </Suspense>
        ) : (
          <SourceEditor value={localContent} onChange={handleContentChange} />
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <span>字数: {localContent.length}</span>
        <span>·</span>
        <span>行数: {localContent.split("\n").length}</span>
        {hasUnsavedChanges && <span>· 未保存</span>}
        <span>·</span>
        <span>
          模式: {editorMode === "wysiwyg" ? "所见即所得" : "源码"}
        </span>
      </div>
    </div>
  );
}
