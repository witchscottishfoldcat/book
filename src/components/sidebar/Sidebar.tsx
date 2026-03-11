import { useState } from "react";
import { FileTreeItem } from "./FileTreeItem";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { FileNode, NoteFile } from "../../types";
import {
  FolderPlus,
  FilePlus,
  RefreshCw,
  Settings,
  ChevronLeft,
  Search,
} from "lucide-react";
import { readFile, createFile, createFolder, parseFrontmatter } from "../../services/fileService";
import { cn } from "../../lib/utils";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function Sidebar() {
  const { fileTree, activeNote, addOpenNote, refreshFileTree, workspace } = useWorkspaceStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    if (e.key === "Enter") {
      handleCreateFile();
    } else if (e.key === "Escape") {
      setIsCreating(null);
      setNewItemName("");
    }
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;

    return nodes.reduce<FileNode[]>((acc, node) => {
      const nameMatch = node.name.toLowerCase().includes(query.toLowerCase());

      if (node.isDirectory && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0 || nameMatch) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else if (nameMatch) {
        acc.push(node);
      }

      return acc;
    }, []);
  };

  const filteredTree = filterTree(fileTree, searchQuery);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border transition-all duration-300",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold truncate">{workspace?.name || "工作区"}</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-accent transition-colors"
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")}
          />
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
            <button
              onClick={() => setIsCreating("file")}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="新建文件"
            >
              <FilePlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsCreating("folder")}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="新建文件夹"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <button
              onClick={refreshFileTree}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="flex-1" />
            <button
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="设置"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {isCreating && (
            <div className="px-3 py-2 border-b border-border">
              <input
                type="text"
                placeholder={isCreating === "file" ? "文件名（自动添加 .md）" : "文件夹名"}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (newItemName.trim()) {
                    handleCreateFile();
                  } else {
                    setIsCreating(null);
                  }
                }}
                className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">
            {filteredTree.length > 0 ? (
              filteredTree.map((node) => (
                <FileTreeItem
                  key={node.id}
                  node={node}
                  depth={0}
                  onSelect={handleSelectFile}
                  selectedId={activeNote?.id}
                />
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "未找到匹配文件" : "暂无文件"}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
