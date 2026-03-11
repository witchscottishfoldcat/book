import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";

interface MonacoCodeBlockProps {
  code: string;
  language?: string;
  onChange?: (code: string) => void;
  readOnly?: boolean;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "shell",
  bash: "shell",
  yml: "yaml",
  md: "markdown",
  "": "plaintext",
};

function normalizeLanguage(lang: string): string {
  const normalized = LANGUAGE_MAP[lang.toLowerCase()] || lang.toLowerCase();
  return normalized;
}

export function MonacoCodeBlock({
  code,
  language = "plaintext",
  onChange,
  readOnly = false,
  className = "",
  minHeight = 100,
  maxHeight = 600,
}: MonacoCodeBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedLang = normalizeLanguage(language);

  const handleEditorMount: OnMount = useCallback(
    (editorInstance) => {
      editorRef.current = editorInstance;

      const contentHeight = editorInstance.getContentHeight();
      const lineCount = editorInstance.getModel()?.getLineCount() || 1;

      if (lineCount <= 5) {
        const container = containerRef.current;
        if (container) {
          container.style.height = `${Math.max(minHeight, contentHeight + 20)}px`;
        }
      }
    },
    [minHeight]
  );

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined && onChange) {
        onChange(value);
      }
    },
    [onChange]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [code]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.style.maxHeight = isExpanded ? `${maxHeight}px` : `${Math.min(300, maxHeight)}px`;
    }
  }, [isExpanded, maxHeight]);

  return (
    <div
      className={cn(
        "monaco-code-block rounded-lg overflow-hidden border border-border",
        "bg-[#1e1e1e]",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] border-b border-border/50">
        <span className="text-xs text-gray-400 font-mono">{normalizedLang}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleExpand}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded transition-colors"
            title={isExpanded ? "收起" : "展开"}
          >
            {isExpanded ? "收起" : "展开"}
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded transition-colors"
            title="复制代码"
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="monaco-container"
        style={{
          height: Math.min(300, maxHeight),
          minHeight,
          maxHeight: isExpanded ? maxHeight : Math.min(300, maxHeight),
          overflow: "hidden",
          transition: "max-height 0.2s ease-in-out",
        }}
      >
        <Editor
          height="100%"
          language={normalizedLang}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            folding: true,
            foldingStrategy: "indentation",
            renderLineHighlight: "line",
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}

export default MonacoCodeBlock;
