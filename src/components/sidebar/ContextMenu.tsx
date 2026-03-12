import { useEffect, useRef } from "react";
import { FileNode } from "../../types";
import { Pencil, Trash2, FolderPlus, FilePlus, Copy, ExternalLink, Star } from "lucide-react";
import { cn } from "../../lib/utils";

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onClose: () => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onNewFile?: (parentPath: string) => void;
  onNewFolder?: (parentPath: string) => void;
  onCopyPath?: (node: FileNode) => void;
  onOpenInExplorer?: (node: FileNode) => void;
  onToggleBookmark?: (node: FileNode) => void;
  isBookmarked?: boolean;
}

export function ContextMenu({
  x,
  y,
  node,
  onClose,
  onRename,
  onDelete,
  onNewFile,
  onNewFolder,
  onCopyPath,
  onOpenInExplorer,
  onToggleBookmark,
  isBookmarked = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    ...(node.isDirectory
      ? [
          { icon: FilePlus, label: "新建文件", onClick: () => onNewFile?.(node.path), divider: false },
          { icon: FolderPlus, label: "新建文件夹", onClick: () => onNewFolder?.(node.path), divider: true },
        ]
      : []),
    { icon: Pencil, label: "重命名", onClick: () => onRename(node), divider: false },
    ...(onToggleBookmark
      ? [{
          icon: Star,
          label: isBookmarked ? "取消收藏" : "添加收藏",
          onClick: () => onToggleBookmark?.(node),
          divider: false,
          active: isBookmarked,
        }]
      : []),
    { icon: Copy, label: "复制路径", onClick: () => onCopyPath?.(node), divider: false },
    ...(onOpenInExplorer
      ? [{ icon: ExternalLink, label: "在资源管理器中打开", onClick: () => onOpenInExplorer?.(node), divider: true }]
      : []),
    { icon: Trash2, label: "删除", onClick: () => onDelete(node), danger: true, divider: false },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[160px] rounded-lg border shadow-xl animate-fade-in"
      style={{
        left: x,
        top: y,
        background: "hsl(var(--popover))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {menuItems.map((item, idx) => (
        <div key={idx}>
          {item.divider && idx > 0 && (
            <div className="my-1 h-px" style={{ background: "hsl(var(--border))" }} />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors",
              idx === 0 && "first:rounded-t-lg",
              idx === menuItems.length - 1 && "last:rounded-b-lg",
              item.danger
                ? "hover:bg-red-500/10"
                : item.active
                  ? "bg-amber-500/10 hover:bg-amber-500/20"
                  : "hover:bg-accent/50"
            )}
            style={{
              color: item.danger
                ? "hsl(0 72% 51%)"
                : item.active
                  ? "hsl(38 90% 50%)"
                  : "hsl(var(--popover-foreground))",
            }}
          >
            <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
