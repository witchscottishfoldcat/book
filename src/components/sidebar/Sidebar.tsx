import { useState, useEffect, useRef } from "react";
import { FileTreeItem } from "./FileTreeItem";
import { ContextMenu } from "./ContextMenu";
import { BookmarkPanel } from "./BookmarkPanel";
import { SearchPanel } from "./SearchPanel";
import { BacklinkPanel } from "./BacklinkPanel";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useThemeStore, Theme } from "../../stores/themeStore";
import { useTagStore } from "../../stores/tagStore";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useSearchStore } from "../../stores/searchStore";
import { FileNode, NoteFile } from "../../types";
import { ViewMode } from "../../App";
import {
  FolderPlus,
  FilePlus,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Search,
  BookOpen,
  Sun,
  Moon,
  Monitor,
  Tag as TagIcon,
  GitBranch,
} from "lucide-react";
import { readFile, createFile, createFolder, parseFrontmatter, deleteFile } from "../../services/fileService";
import { removeNoteFromIndex } from "../../services/searchService";
import { cn } from "../../lib/utils";

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface SidebarProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Sidebar({ viewMode = "editor", onViewModeChange }: SidebarProps) {
  const { fileTree, activeNote, addOpenNote, setActiveNote, refreshFileTree, workspace } = useWorkspaceStore();
  const { theme, resolvedTheme, setTheme, initTheme } = useThemeStore();
  const { tags, selectedTags, toggleTag, clearSelection } = useTagStore();
  const { addBookmark, removeBookmarkByPath, isBookmarked } = useBookmarkStore();
  const { isOpen: isSearchOpen, toggleSearch } = useSearchStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleSelectFile = async (node: FileNode) => {
    if (node.isDirectory) return;
    try {
      const content = await readFile(node.path);
      const { frontmatter, body } = parseFrontmatter(content);
      const note: NoteFile = {
        id: generateId(),
        name: node.name,
        path: node.path,
        content: body,
        frontmatter: frontmatter || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addOpenNote(note);
    } catch (error) {
      console.error("打开文件失败:", error);
    }
  };

  const handleCreateFile = async () => {
    if (!newItemName.trim() || !workspace) return;
    try {
      const parentPath = workspace.rootPath;
      if (isCreating === "file") {
        const fileName = newItemName.endsWith(".md") ? newItemName : `${newItemName}.md`;
        await createFile(parentPath, fileName);
      } else {
        await createFolder(parentPath, newItemName);
      }
      await refreshFileTree();
    } catch (error) {
      console.error("创建失败:", error);
    } finally {
      setIsCreating(null);
      setNewItemName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreateFile();
    else if (e.key === "Escape") { setIsCreating(null); setNewItemName(""); }
  };

  const handleRename = async (node: FileNode, newName: string) => {
    try {
      const { renameFile: renameFileApi } = await import("../../services/fileService");
      const newPath = await renameFileApi(node.path, newName);
      if (activeNote?.path === node.path) {
        const updatedNote: NoteFile = {
          ...activeNote,
          name: newName,
          path: newPath,
          updatedAt: Date.now(),
        };
        setActiveNote(updatedNote);
      }
      await refreshFileTree();
    } catch (error) {
      console.error("重命名失败:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleDelete = async (node: FileNode) => {
    if (!confirm(`确定要删除 "${node.name}" 吗？`)) return;
    try {
      await deleteFile(node.path);
      removeBookmarkByPath(node.path);
      if (!node.isDirectory) {
        await removeNoteFromIndex(node.path);
      }
      await refreshFileTree();
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  const handleToggleBookmark = (node: FileNode) => {
    if (isBookmarked(node.path)) {
      removeBookmarkByPath(node.path);
    } else {
      addBookmark(node.path, node.name, node.isDirectory);
    }
    setContextMenu(null);
  };

  const handleCopyPath = async (node: FileNode) => {
    try {
      await navigator.clipboard.writeText(node.path);
    } catch (error) {
      console.error("复制路径失败:", error);
    }
  };

  const handleOpenInExplorer = async (node: FileNode) => {
    try {
      const { openInExplorer } = await import("../../services/fileService");
      await openInExplorer(node.path);
    } catch (error) {
      console.error("打开资源管理器失败:", error);
    }
  };

  const handleNewFileFromContext = async (parentPath: string) => {
    const fileName = prompt("请输入文件名:", "untitled.md");
    if (fileName) {
      try {
        const name = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
        await createFile(parentPath, name);
        await refreshFileTree();
      } catch (error) {
        console.error("创建文件失败:", error);
      }
    }
  };

  const handleNewFolderFromContext = async (parentPath: string) => {
    const folderName = prompt("请输入文件夹名:");
    if (folderName) {
      try {
        await createFolder(parentPath, folderName);
        await refreshFileTree();
      } catch (error) {
        console.error("创建文件夹失败:", error);
      }
    }
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    return nodes.reduce<FileNode[]>((acc, node) => {
      const nameMatch = node.name.toLowerCase().includes(query.toLowerCase());
      if (node.isDirectory && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0 || nameMatch) acc.push({ ...node, children: filteredChildren });
      } else if (nameMatch) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(fileTree, searchQuery);
  const fileCount = fileTree.filter(n => !n.isDirectory).length;

  if (isCollapsed) {
    return (
      <aside
        className="flex flex-col items-center py-3 gap-2 h-full border-r"
        style={{
          width: 48,
          background: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        {/* Logo */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-1"
          style={{
            background: "linear-gradient(135deg, hsl(248 82% 68% / 0.85), hsl(270 75% 62% / 0.85))",
          }}
        >
          <BookOpen className="w-4 h-4 text-white" />
        </div>

        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
          title="展开侧边栏"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex flex-col h-full border-r transition-all duration-300 animate-fade-in"
      style={{
        width: 260,
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* ─── 应用头部 ─── */}
      <div
        className="flex items-center justify-between px-3 py-3 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div className="flex items-center gap-2.5">
          {/* App logo */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(248 82% 68% / 0.85), hsl(270 75% 62% / 0.85))",
              boxShadow: "0 2px 8px hsl(248 82% 68% / 0.25)",
            }}
          >
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span
              className="text-sm font-semibold leading-none block"
              style={{
                background: "linear-gradient(90deg, hsl(248 82% 72%), hsl(270 75% 68%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MDNotes
            </span>
            <span className="text-[10px] leading-none mt-0.5 block" style={{ color: "hsl(var(--muted-foreground))" }}>
              {workspace?.name || "工作区"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-md transition-colors hover:bg-accent"
          style={{ color: "hsl(var(--muted-foreground))" }}
          title="收起侧边栏"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* ─── 搜索框 ─── */}
      <div className="px-3 pt-2.5 pb-2 space-y-2">
        <button
          onClick={toggleSearch}
          className="w-full relative group cursor-pointer"
        >
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
          />
          <div
            className="input-base pl-8 text-left text-xs"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            全文搜索...
          </div>
        </button>
        <div className="relative group">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
          />
          <input
            type="text"
            placeholder="过滤文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-8 text-xs"
          />
        </div>
      </div>

      {/* ─── 工具栏 ─── */}
      <div
        className="flex items-center gap-0.5 px-2 pb-2 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <ActionButton
          onClick={() => setIsCreating("file")}
          title="新建文件 (Markdown)"
          icon={<FilePlus className="h-3.5 w-3.5" />}
        />
        <ActionButton
          onClick={() => setIsCreating("folder")}
          title="新建文件夹"
          icon={<FolderPlus className="h-3.5 w-3.5" />}
        />
        <ActionButton
          onClick={refreshFileTree}
          title="刷新文件列表"
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        />
        <div className="flex-1" />
        <div className="relative">
          <ActionButton
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="切换主题"
            icon={
              resolvedTheme === "dark" 
                ? <Moon className="h-3.5 w-3.5" />
                : <Sun className="h-3.5 w-3.5" />
            }
          />
          {showThemeMenu && (
            <ThemeMenu
              theme={theme}
              onSelect={(t) => { setTheme(t); setShowThemeMenu(false); }}
              onClose={() => setShowThemeMenu(false)}
            />
          )}
        </div>
      </div>

      {/* ─── 新建输入框 ─── */}
      {isCreating && (
        <div
          className="mx-3 my-2 px-2.5 py-2 rounded-lg border animate-fade-in"
          style={{
            background: "hsl(var(--muted) / 0.5)",
            borderColor: "hsl(var(--primary) / 0.3)",
          }}
        >
          <p className="text-[10px] font-medium mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {isCreating === "file" ? "新建 Markdown 文件" : "新建文件夹"}
          </p>
          <input
            type="text"
            placeholder={isCreating === "file" ? "文件名（自动添加 .md）" : "文件夹名称"}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (newItemName.trim()) handleCreateFile();
              else setIsCreating(null);
            }}
            className="input-base text-xs"
            autoFocus
          />
        </div>
      )}

      {/* ─── 文件树 ─── */}
      <div className="flex-1 overflow-y-auto py-1.5">
        <BookmarkPanel onSelect={handleSelectFile} />
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              depth={0}
              onSelect={handleSelectFile}
              selectedId={activeNote?.id}
              onRename={handleRename}
              onContextMenu={handleContextMenu}
            />
          ))
        ) : (
          <EmptyState searchQuery={searchQuery} />
        )}
      </div>

      {/* ─── 标签过滤器 ─── */}
      {showTagFilter && tags.length > 0 && (
        <div
          className="mx-3 mb-2 p-2 rounded-lg border animate-fade-in"
          style={{
            background: "hsl(var(--muted) / 0.3)",
            borderColor: "hsl(var(--border))",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
              按标签筛选
            </span>
            {selectedTags.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-[10px] hover:underline"
                style={{ color: "hsl(var(--primary))" }}
              >
                清除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                  style={{
                    background: isSelected ? `${tag.color}30` : `${tag.color}15`,
                    color: tag.color,
                    border: `1px solid ${isSelected ? tag.color : `${tag.color}30`}`,
                    opacity: isSelected ? 1 : 0.7,
                  }}
                >
                  {tag.name}
                  {tag.count > 1 && (
                    <span className="opacity-60">({tag.count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 底部状态栏 ─── */}
      <div
        className="px-3 py-2 border-t flex items-center justify-between"
        style={{
          borderColor: "hsl(var(--border))",
          background: "hsl(var(--muted) / 0.3)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(142 70% 52%)" }} />
          <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {fileCount} 个文件
          </span>
          {tags.length > 0 && (
            <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              · {tags.length} 个标签
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewModeChange?.(viewMode === "graph" ? "editor" : "graph")}
            className={cn(
              "p-1 rounded transition-colors",
              viewMode === "graph" && "bg-primary/10"
            )}
            style={{ color: viewMode === "graph" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            title={viewMode === "graph" ? "返回编辑器" : "知识图谱"}
          >
            <GitBranch className="h-3.5 w-3.5" />
          </button>
          {tags.length > 0 && (
            <button
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={cn(
                "p-1 rounded transition-colors",
                showTagFilter && "bg-primary/10"
              )}
              style={{ color: showTagFilter ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              title="标签过滤"
            >
              <TagIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── 右键菜单 ─── */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onRename={(node) => {
            setContextMenu(null);
            const input = document.querySelector(`[data-path="${node.path}"]`) as HTMLElement;
            input?.click();
          }}
          onDelete={handleDelete}
          onNewFile={handleNewFileFromContext}
          onNewFolder={handleNewFolderFromContext}
          onCopyPath={handleCopyPath}
          onOpenInExplorer={handleOpenInExplorer}
          onToggleBookmark={handleToggleBookmark}
          isBookmarked={isBookmarked(contextMenu.node.path)}
        />
      )}

      {/* ─── 全文搜索面板 ─── */}
      {isSearchOpen && <SearchPanel />}
      
      {/* ─── 反向链接面板 ─── */}
      <BacklinkPanel />
    </aside>
  );
}

function ActionButton({
  onClick,
  title,
  icon,
}: {
  onClick?: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md transition-all duration-150 hover:bg-accent"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {icon}
    </button>
  );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Search className="h-8 w-8 opacity-20" style={{ color: "hsl(var(--muted-foreground))" }} />
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          未找到 "<span style={{ color: "hsl(var(--foreground))" }}>{searchQuery}</span>"
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
        style={{ background: "hsl(var(--muted))" }}
      >
        <FilePlus className="h-5 w-5 opacity-40" style={{ color: "hsl(var(--muted-foreground))" }} />
      </div>
      <p className="text-xs font-medium" style={{ color: "hsl(var(--foreground) / 0.6)" }}>暂无文件</p>
      <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
        点击上方 + 创建第一个笔记
      </p>
    </div>
  );
}

function ThemeMenu({
  theme,
  onSelect,
  onClose,
}: {
  theme: Theme;
  onSelect: (theme: Theme) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "亮色", icon: <Sun className="h-3.5 w-3.5" /> },
    { value: "dark", label: "暗色", icon: <Moon className="h-3.5 w-3.5" /> },
    { value: "system", label: "跟随系统", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border shadow-lg animate-fade-in"
      style={{
        background: "hsl(var(--popover))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors first:rounded-t-lg last:rounded-b-lg",
            theme === opt.value && "bg-primary/10 text-primary"
          )}
          style={{ color: theme === opt.value ? undefined : "hsl(var(--popover-foreground))" }}
        >
          {opt.icon}
          <span>{opt.label}</span>
          {theme === opt.value && (
            <span className="ml-auto text-[10px]" style={{ color: "hsl(var(--primary))" }}>✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
