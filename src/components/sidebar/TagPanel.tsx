import { useState } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { useTagStore } from "../../stores/tagStore";

interface TagPanelProps {
  noteTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClose?: () => void;
}

export function TagPanel({ noteTags, onTagsChange, onClose }: TagPanelProps) {
  const { tags, addTag, getTagColor } = useTagStore();
  const [newTagName, setNewTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const normalized = newTagName.toLowerCase().trim();
      addTag(normalized);
      if (!noteTags.includes(normalized)) {
        onTagsChange([...noteTags, normalized]);
      }
      setNewTagName("");
      setIsAdding(false);
    }
  };

  const handleToggleNoteTag = (tagName: string) => {
    const normalized = tagName.toLowerCase().trim();
    if (noteTags.includes(normalized)) {
      onTagsChange(noteTags.filter((t) => t !== normalized));
    } else {
      onTagsChange([...noteTags, normalized]);
    }
  };

  const handleRemoveFromNote = (tagName: string) => {
    onTagsChange(noteTags.filter((t) => t !== tagName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTagName("");
    }
  };

  const unusedTags = tags.filter((t) => !noteTags.includes(t.name));

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
          <span className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
            标签
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent/50 transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {noteTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {noteTags.map((tagName) => {
            const color = getTagColor(tagName);
            return (
              <span
                key={tagName}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: `${color}20`,
                  color: color,
                  border: `1px solid ${color}40`,
                }}
              >
                {tagName}
                <button
                  onClick={() => handleRemoveFromNote(tagName)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {unusedTags.length > 0 && (
        <div className="mb-3">
          <div className="text-xs mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            可用标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unusedTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleToggleNoteTag(tag.name)}
                className="px-2 py-0.5 rounded-full text-xs transition-all hover:scale-105"
                style={{
                  background: `${tag.color}15`,
                  color: tag.color,
                  border: `1px solid ${tag.color}30`,
                }}
              >
                + {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAdding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (newTagName.trim()) handleAddTag();
              else setIsAdding(false);
            }}
            placeholder="输入标签名..."
            className="flex-1 px-2 py-1 text-xs rounded border outline-none"
            style={{
              background: "hsl(var(--background))",
              borderColor: "hsl(var(--primary))",
              color: "hsl(var(--foreground))",
            }}
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors w-full justify-center"
          style={{
            color: "hsl(var(--muted-foreground))",
            border: "1px dashed hsl(var(--border))",
          }}
        >
          <Plus className="h-3 w-3" />
          新建标签
        </button>
      )}
    </div>
  );
}
