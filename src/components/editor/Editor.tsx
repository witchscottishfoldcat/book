import { useWorkspaceStore } from "../../stores/workspaceStore";
import { writeFile } from "../../services/fileService";
import { FileText, Save, Edit3, FileCode, Settings2, CheckCheck } from "lucide-react";
import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { cn } from "../../lib/utils";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { PropertyPanel } from "./PropertyPanel";
import {
  parseFrontmatterEnhanced,
  stringifyFrontmatterEnhanced,
  FrontmatterValue,
} from "../../utils/frontmatter";

const MilkdownEditor = lazy(() =>
  import("./MilkdownEditor").then((mod) => ({ default: mod.MilkdownEditor }))
);

type EditorMode = "wysiwyg" | "source";

function EditorLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3" style={{ color: "hsl(var(--muted-foreground))" }}>
        <div
          className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "hsl(var(--primary) / 0.3)", borderTopColor: "hsl(var(--primary))" }}
        />
        <span className="text-sm">加载编辑器...</span>
      </div>
    </div>
  );
}

function SourceEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    editorInstance.focus();
  }, []);

  const handleEditorChange = useCallback(
    (val: string | undefined) => { if (val !== undefined) onChange(val); },
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
        padding: { top: 20, bottom: 20 },
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        tabSize: 2,
        insertSpaces: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
        fontLigatures: true,
        cursorBlinking: "smooth",
        smoothScrolling: true,
        cursorSmoothCaretAnimation: "on",
      }}
    />
  );
}

/* 空状态 —— 未选择文件时 */
function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-background animate-fade-in">
      <div className="flex flex-col items-center gap-5 max-w-xs text-center">
        {/* 插图容器 */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(248 82% 68% / 0.12), hsl(270 75% 65% / 0.08))",
              border: "1px solid hsl(248 82% 68% / 0.2)",
            }}
          >
            <FileText
              className="h-9 w-9"
              style={{ color: "hsl(248 82% 68% / 0.6)" }}
            />
          </div>
          {/* 装饰点 */}
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "hsl(248 82% 68% / 0.2)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(248 82% 68%)" }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-base font-semibold" style={{ color: "hsl(var(--foreground) / 0.8)" }}>
            选择一个文件开始编辑
          </p>
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            从左侧文件树中选择或创建一个 Markdown 文件
          </p>
        </div>

        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{
            background: "hsl(var(--muted))",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <kbd className="font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="font-mono">S</kbd>
          <span className="ml-1">快速保存</span>
        </div>
      </div>
    </div>
  );
}

export function Editor() {
  const { activeNote, updateNoteContent } = useWorkspaceStore();
  const [localContent, setLocalContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("wysiwyg");
  const [showPropertyPanel, setShowPropertyPanel] = useState(true);
  const [frontmatterData, setFrontmatterData] = useState<Record<string, FrontmatterValue>>({});

  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content);
      setHasUnsavedChanges(false);
      const parsed = parseFrontmatterEnhanced(activeNote.content);
      setFrontmatterData(parsed.data);
    }
  }, [activeNote?.id, activeNote?.content]);

  const handleSave = useCallback(async () => {
    if (!activeNote || !hasUnsavedChanges) return;
    setIsSaving(true);
    try {
      const parsed = parseFrontmatterEnhanced(localContent);
      const mergedData = { ...parsed.data, ...frontmatterData };
      const content = stringifyFrontmatterEnhanced(mergedData, parsed.body);
      await writeFile(activeNote.path, content);
      updateNoteContent(activeNote.id, localContent);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setIsSaving(false);
    }
  }, [activeNote, localContent, hasUnsavedChanges, updateNoteContent, frontmatterData]);

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

  if (!activeNote) return <EmptyState />;

  const wordCount = localContent.replace(/\s+/g, "").length;
  const lineCount = localContent.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* ─── 顶部工具栏 ─── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        {/* 左侧：文件信息 */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(248 82% 68% / 0.15)" }}
          >
            <FileText className="h-3 w-3" style={{ color: "hsl(248 82% 68%)" }} />
          </div>
          <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
            {activeNote.name}
          </span>
          {hasUnsavedChanges && (
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "hsl(38 90% 60%)" }}
              title="有未保存的更改"
            />
          )}
          {justSaved && (
            <div className="flex items-center gap-1 animate-fade-in">
              <CheckCheck className="h-3.5 w-3.5" style={{ color: "hsl(142 65% 52%)" }} />
              <span className="text-xs" style={{ color: "hsl(142 65% 52%)" }}>已保存</span>
            </div>
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 属性面板切换 */}
          <ToolbarButton
            onClick={() => setShowPropertyPanel(!showPropertyPanel)}
            title="切换属性面板"
            active={showPropertyPanel}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>属性</span>
          </ToolbarButton>

          {/* 模式切换 */}
          <ToolbarButton
            onClick={toggleEditorMode}
            title={editorMode === "wysiwyg" ? "切换到源码模式" : "切换到预览模式"}
          >
            {editorMode === "wysiwyg" ? (
              <><FileCode className="h-3.5 w-3.5" /><span>源码</span></>
            ) : (
              <><Edit3 className="h-3.5 w-3.5" /><span>预览</span></>
            )}
          </ToolbarButton>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
              hasUnsavedChanges && !isSaving
                ? "text-white"
                : "cursor-not-allowed opacity-40"
            )}
            style={
              hasUnsavedChanges && !isSaving
                ? {
                    background: "linear-gradient(135deg, hsl(248 82% 62%), hsl(270 75% 60%))",
                    boxShadow: "0 2px 8px hsl(248 82% 62% / 0.35)",
                  }
                : {
                    background: "hsl(var(--muted))",
                    color: "hsl(var(--muted-foreground))",
                  }
            }
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* ─── 属性面板 ─── */}
      {showPropertyPanel && (
        <PropertyPanel
          frontmatter={frontmatterData}
          onChange={(data) => {
            setFrontmatterData(data);
            setHasUnsavedChanges(true);
          }}
        />
      )}

      {/* ─── 编辑器主体 ─── */}
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

      {/* ─── 底部状态栏 ─── */}
      <div
        className="flex items-center gap-3 px-4 py-1.5 border-t text-[11px]"
        style={{
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <StatusItem label="字符" value={wordCount} />
        <Divider />
        <StatusItem label="行" value={lineCount} />
        <Divider />
        <StatusItem label="模式" value={editorMode === "wysiwyg" ? "预览" : "源码"} />
        {hasUnsavedChanges && (
          <>
            <Divider />
            <span style={{ color: "hsl(38 90% 60%)" }}>● 未保存</span>
          </>
        )}
        <div className="flex-1" />
        <span>Markdown</span>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick?: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
      style={{
        background: active ? "hsl(248 82% 68% / 0.12)" : "hsl(var(--secondary))",
        color: active ? "hsl(248 82% 72%)" : "hsl(var(--secondary-foreground))",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent))";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--secondary))";
      }}
    >
      {children}
    </button>
  );
}

function StatusItem({ label, value }: { label: string; value: number | string }) {
  return (
    <span>
      {label}: <span style={{ color: "hsl(var(--foreground) / 0.6)" }}>{value}</span>
    </span>
  );
}

function Divider() {
  return <span style={{ color: "hsl(var(--border))" }}>·</span>;
}
