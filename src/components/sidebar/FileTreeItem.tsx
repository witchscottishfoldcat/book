import { useState, useRef, useEffect } from "react";
import { FileNode } from "../../types";
import { ChevronRight, ChevronDown } from "lucide-react";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onSelect: (node: FileNode) => void;
  selectedId?: string;
  onRename?: (node: FileNode, newName: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
}

function FileIcon({ ext, isDirectory, isExpanded }: { ext?: string; isDirectory: boolean; isExpanded?: boolean }) {
  if (isDirectory) {
    return isExpanded ? (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2H7l1.5 2H13.5A1.5 1.5 0 0 1 15 5.5v7A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5z"
          fill="hsl(38 95% 64%)" fillOpacity="0.9" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2H7l1.5 2H13.5A1.5 1.5 0 0 1 15 5.5v7A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5z"
          fill="hsl(38 85% 55%)" fillOpacity="0.8" />
      </svg>
    );
  }

  const colorMap: Record<string, string> = {
    md:       "hsl(248 75% 68%)",
    markdown: "hsl(248 75% 68%)",
    ts:       "hsl(211 100% 60%)",
    tsx:      "hsl(211 100% 60%)",
    js:       "hsl(48 95% 55%)",
    jsx:      "hsl(48 95% 55%)",
    json:     "hsl(142 65% 52%)",
    css:      "hsl(190 90% 50%)",
    html:     "hsl(18 90% 58%)",
    py:       "hsl(210 90% 62%)",
    rs:       "hsl(20 80% 60%)",
  };

  const color = ext ? (colorMap[ext] || "hsl(var(--muted-foreground))") : "hsl(var(--muted-foreground))";

  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M9 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9A1.5 1.5 0 0 0 14 13.5V6z"
        fill={color}
        fillOpacity="0.85"
      />
      <path d="M9 1l5 5H9.5A.5.5 0 0 1 9 5.5z" fill={color} fillOpacity="0.4" />
    </svg>
  );
}

export function FileTreeItem({ node, depth, onSelect, selectedId, onRename, onContextMenu }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = selectedId === node.id;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      const extIndex = node.name.lastIndexOf(".");
      const selectEnd = extIndex > 0 ? extIndex : node.name.length;
      inputRef.current.setSelectionRange(0, selectEnd);
    }
  }, [isRenaming, node.name]);

  const handleClick = () => {
    if (isRenaming) return;
    if (node.isDirectory) setIsExpanded(!isExpanded);
    else onSelect(node);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(node.name);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name && onRename) {
      onRename(node, trimmed);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setRenameValue(node.name);
      setIsRenaming(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, node);
  };

  const indentPx = depth * 14 + 8;

  return (
    <div>
      <div
        className="group relative flex items-center gap-1.5 py-[5px] pr-2 cursor-pointer select-none transition-all duration-100"
        style={{
          paddingLeft: `${indentPx}px`,
          borderRadius: "6px",
          margin: "1px 4px",
          background: isSelected
            ? "linear-gradient(90deg, hsl(248 82% 68% / 0.18) 0%, hsl(248 82% 68% / 0.06) 100%)"
            : undefined,
          color: isSelected ? "hsl(248 82% 75%)" : "hsl(var(--foreground) / 0.82)",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--accent) / 0.6)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "";
        }}
      >
        {isSelected && (
          <div
            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
            style={{ background: "hsl(248 82% 68%)" }}
          />
        )}

        {node.isDirectory ? (
          <span className="flex-shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.7)", marginLeft: -2 }}>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        <span className="flex-shrink-0 flex items-center">
          <FileIcon ext={node.extension} isDirectory={node.isDirectory} isExpanded={isExpanded} />
        </span>

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 px-1.5 py-0.5 text-[13px] font-medium bg-transparent border rounded outline-none"
            style={{
              color: "hsl(var(--foreground))",
              borderColor: "hsl(var(--primary))",
              background: "hsl(var(--background))",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate text-[13px] font-medium">
            {node.name}
          </span>
        )}
      </div>

      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              onRename={onRename}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
