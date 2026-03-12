import React, { useEffect, useState, useCallback } from "react";
import { Link2, FileText, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { findBacklinks, getOutgoingLinks, Backlink } from "../../services/linkService";
import { cn } from "../../lib/utils";

export const BacklinkPanel: React.FC = () => {
  const { activeNote, workspace, addOpenNote } = useWorkspaceStore();
  const workspaceRoot = workspace?.rootPath || "";
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [showOutgoing, setShowOutgoing] = useState(true);

  const loadLinks = useCallback(async () => {
    if (!activeNote || !workspaceRoot) return;
    
    setIsLoading(true);
    try {
      const noteName = activeNote.name.replace(/\.md$/i, "");
      const backlinkResults = await findBacklinks(noteName, workspaceRoot, activeNote.path);
      setBacklinks(backlinkResults);
      
      const outgoing = getOutgoingLinks(activeNote.content);
      setOutgoingLinks(outgoing);
    } catch (error) {
      console.error("加载链接失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeNote, workspaceRoot]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleBacklinkClick = async (backlink: Backlink) => {
    try {
      const { readFile, parseFrontmatter } = await import("../../services/fileService");
      const content = await readFile(backlink.path);
      const { frontmatter, body } = parseFrontmatter(content);
      
      const note = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: backlink.path.split(/[/\\]/).pop() || backlink.path,
        path: backlink.path,
        content: body,
        frontmatter: frontmatter || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      addOpenNote(note);
    } catch (error) {
      console.error("打开反向链接失败:", error);
    }
  };

  if (!activeNote) {
    return null;
  }

  return (
    <div
      className="border-t"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: "hsl(var(--muted) / 0.3)" }}
      >
        <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
          链接
        </span>
        <button
          onClick={loadLinks}
          disabled={isLoading}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="刷新"
        >
          <RefreshCw
            className={cn("h-3 w-3", isLoading && "animate-spin")}
            style={{ color: "hsl(var(--muted-foreground))" }}
          />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        <div className="px-2 py-1">
          <button
            onClick={() => setShowOutgoing(!showOutgoing)}
            className="flex items-center gap-1.5 w-full py-1.5 px-1 text-left hover:bg-white/5 rounded transition-colors"
          >
            {showOutgoing ? (
              <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
            ) : (
              <ChevronRight className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
            )}
            <Link2 className="h-3 w-3" style={{ color: "hsl(var(--primary))" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
              出链 ({outgoingLinks.length})
            </span>
          </button>
          
          {showOutgoing && outgoingLinks.length > 0 && (
            <div className="ml-6 space-y-0.5">
              {outgoingLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 py-1 px-2 text-xs rounded hover:bg-white/5 cursor-pointer transition-colors"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  <span className="truncate">[[{link}]]</span>
                </div>
              ))}
            </div>
          )}
          
          {showOutgoing && outgoingLinks.length === 0 && (
            <div className="ml-6 py-1 px-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              暂无出链
            </div>
          )}
        </div>

        <div className="px-2 py-1">
          <button
            onClick={() => setShowBacklinks(!showBacklinks)}
            className="flex items-center gap-1.5 w-full py-1.5 px-1 text-left hover:bg-white/5 rounded transition-colors"
          >
            {showBacklinks ? (
              <ChevronDown className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
            ) : (
              <ChevronRight className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
            )}
            <Link2 className="h-3 w-3 rotate-180" style={{ color: "hsl(var(--chart-2))" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
              反向链接 ({backlinks.length})
            </span>
          </button>
          
          {showBacklinks && backlinks.length > 0 && (
            <div className="ml-6 space-y-1">
              {backlinks.map((backlink, index) => (
                <button
                  key={index}
                  onClick={() => handleBacklinkClick(backlink)}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: "hsl(var(--foreground))" }}
                    >
                      {backlink.title}
                    </span>
                    {backlink.linkCount > 1 && (
                      <span
                        className="text-[10px] px-1 rounded"
                        style={{
                          backgroundColor: "hsl(var(--primary) / 0.2)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        ×{backlink.linkCount}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[10px] mt-0.5 line-clamp-2"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {backlink.snippet}
                  </p>
                </button>
              ))}
            </div>
          )}
          
          {showBacklinks && backlinks.length === 0 && (
            <div className="ml-6 py-1 px-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              暂无反向链接
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
