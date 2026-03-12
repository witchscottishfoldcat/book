import { FileText, Folder, Star, X } from "lucide-react";
import { useBookmarkStore, Bookmark } from "../../stores/bookmarkStore";
import { FileNode } from "../../types";

interface BookmarkPanelProps {
  onSelect: (node: FileNode) => void;
}

function BookmarkItem({
  bookmark,
  onSelect,
  onRemove,
}: {
  bookmark: Bookmark;
  onSelect: (path: string, name: string, isDirectory: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const Icon = bookmark.isDirectory ? Folder : FileText;

  return (
    <div
      className="group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors"
      style={{ color: "hsl(var(--foreground))" }}
      onClick={() => onSelect(bookmark.path, bookmark.name, bookmark.isDirectory)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted) / 0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon
          className="h-3.5 w-3.5 flex-shrink-0"
          style={{
            color: bookmark.isDirectory
              ? "hsl(38 90% 55%)"
              : "hsl(var(--muted-foreground))",
          }}
        />
        <span className="text-xs truncate">{bookmark.name}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(bookmark.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function BookmarkPanel({ onSelect }: BookmarkPanelProps) {
  const { bookmarks, removeBookmark } = useBookmarkStore();

  const handleSelect = (path: string, name: string, isDirectory: boolean) => {
    onSelect({
      id: path,
      name,
      path,
      isDirectory,
    });
  };

  if (bookmarks.length === 0) {
    return null;
  }

  const sortedBookmarks = [...bookmarks].sort((a, b) => b.addedAt - a.addedAt);

  return (
    <div
      className="border-b"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "hsl(var(--muted) / 0.2)" }}
      >
        <Star
          className="h-3.5 w-3.5"
          style={{ color: "hsl(38 90% 55%)" }}
        />
        <span
          className="text-[11px] font-semibold"
          style={{ color: "hsl(var(--foreground) / 0.7)" }}
        >
          收藏夹
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto"
          style={{
            background: "hsl(38 90% 55% / 0.15)",
            color: "hsl(38 90% 55%)",
          }}
        >
          {bookmarks.length}
        </span>
      </div>
      <div className="py-1 max-h-48 overflow-y-auto">
        {sortedBookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            onSelect={handleSelect}
            onRemove={removeBookmark}
          />
        ))}
      </div>
    </div>
  );
}
