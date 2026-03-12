import React, { useEffect, useRef } from "react";
import { Search, X, Loader2, FileText } from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { cn } from "../../lib/utils";
import { readFile, parseFrontmatter } from "../../services/fileService";
import { NoteFile } from "../../types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const SearchPanel: React.FC = () => {
  const {
    query,
    results,
    isSearching,
    error,
    setQuery,
    search,
    closeSearch,
    clearResults,
  } = useSearchStore();

  const { addOpenNote } = useWorkspaceStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const handleResultClick = async (path: string) => {
    try {
      const content = await readFile(path);
      const { frontmatter, body } = parseFrontmatter(content);
      const note: NoteFile = {
        id: generateId(),
        name: path.split(/[/\\]/).pop() || path,
        path,
        content: body,
        frontmatter: frontmatter || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addOpenNote(note);
      closeSearch();
    } catch (error) {
      console.error("打开搜索结果失败:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeSearch();
    }
  };

  const highlightSnippet = (snippet: string) => {
    return snippet
      .split(/<<HIGHLIGHT>>|<<\/HIGHLIGHT>>/)
      .map((part, index) => {
        if (index % 2 === 1) {
          return (
            <mark
              key={index}
              className="bg-yellow-200 dark:bg-yellow-600 text-inherit px-0.5 rounded"
            >
              {part}
            </mark>
          );
        }
        return part;
      });
  };

  return (
    <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索笔记..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg",
                "bg-gray-100 dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100",
                "placeholder-gray-400 dark:placeholder-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500"
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <button
            onClick={() => {
              clearResults();
              closeSearch();
            }}
            className={cn(
              "p-2 rounded-lg",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "text-gray-500 dark:text-gray-400"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="text-red-500 dark:text-red-400 text-center py-4">
            {error}
          </div>
        )}

        {!isSearching && query && results.length === 0 && !error && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            未找到匹配 "{query}" 的笔记
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={result.path}
                onClick={() => handleResultClick(result.path)}
                className={cn(
                  "w-full text-left p-3 rounded-lg",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  "transition-colors duration-150"
                )}
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.title || result.path.split(/[/\\]/).pop()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {highlightSnippet(result.snippet)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                      {result.path}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {result.score.toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {!query && (
          <div className="text-gray-400 dark:text-gray-500 text-center py-8">
            输入关键词开始搜索
          </div>
        )}
      </div>
    </div>
  );
};
