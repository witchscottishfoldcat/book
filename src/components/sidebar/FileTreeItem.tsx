import { useState } from "react";
import { FileNode } from "../../types";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  onSelect: (node: FileNode) => void;
  selectedId?: string;
}

export function FileTreeItem({ node, depth, onSelect, selectedId }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const isSelected = selectedId === node.id;

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(node);
    }
  };

  const getFileIcon = () => {
    if (node.isDirectory) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-amber-500" />
      ) : (
        <Folder className="h-4 w-4 text-amber-500" />
      );
    }

    const ext = node.extension;
    if (ext === "md" || ext === "markdown") {
      return <File className="h-4 w-4 text-blue-400" />;
    }
    if (ext === "ts" || ext === "tsx") {
      return <File className="h-4 w-4 text-blue-500" />;
    }
    if (ext === "js" || ext === "jsx") {
      return <File className="h-4 w-4 text-yellow-400" />;
    }
    if (ext === "json") {
      return <File className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer rounded-md transition-colors",
          "hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDirectory && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        )}
        {!node.isDirectory && <span className="w-3" />}
        {getFileIcon()}
        <span className="truncate text-sm">{node.name}</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
