import { useState, useCallback, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Tag,
  Type,
  Hash,
  ToggleLeft,
  List,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  FrontmatterValue,
  updateFrontmatterValue,
} from "../../utils/frontmatter";

interface PropertyPanelProps {
  frontmatter: Record<string, FrontmatterValue>;
  onChange: (data: Record<string, FrontmatterValue>) => void;
  className?: string;
}

type PropertyType = FrontmatterValue["type"];

const TYPE_ICONS: Record<PropertyType, React.ReactNode> = {
  string: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  array: <List className="h-3.5 w-3.5" />,
  object: <Tag className="h-3.5 w-3.5" />,
};

const TYPE_LABELS: Record<PropertyType, string> = {
  string: "文本",
  number: "数字",
  boolean: "布尔值",
  date: "日期",
  array: "数组",
  object: "对象",
};

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 16);
    }
  }
  return "";
}

function parseDateInput(input: string): Date | null {
  if (!input) return null;
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

export function PropertyPanel({
  frontmatter,
  onChange,
  className,
}: PropertyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [showAddField, setShowAddField] = useState(false);

  const propertyCount = useMemo(
    () => Object.keys(frontmatter).length,
    [frontmatter]
  );

  const handleValueChange = useCallback(
    (key: string, value: unknown, type: PropertyType) => {
      const updated = updateFrontmatterValue(frontmatter, key, value);
      if (type === "date" && typeof value === "string") {
        const date = parseDateInput(value);
        if (date) {
          updated[key] = { type: "date", value: date };
        }
      }
      onChange(updated);
    },
    [frontmatter, onChange]
  );

  const handleDeleteKey = useCallback(
    (key: string) => {
      const updated = { ...frontmatter };
      delete updated[key];
      onChange(updated);
    },
    [frontmatter, onChange]
  );

  const handleAddField = useCallback(() => {
    if (!newKey.trim()) return;

    const key = newKey.trim();
    if (frontmatter[key]) {
      return;
    }

    const updated = {
      ...frontmatter,
      [key]: { type: "string" as const, value: "" },
    };
    onChange(updated);
    setNewKey("");
    setShowAddField(false);
  }, [newKey, frontmatter, onChange]);

  const renderValueEditor = (
    key: string,
    { type, value }: FrontmatterValue
  ) => {
    switch (type) {
      case "string":
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(key, e.target.value, type)}
            className="w-full px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={String(value)}
            onChange={(e) =>
              handleValueChange(
                key,
                e.target.value ? Number(e.target.value) : 0,
                type
              )
            }
            className="w-full px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );

      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleValueChange(key, e.target.checked, type)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              {Boolean(value) ? "是" : "否"}
            </span>
          </label>
        );

      case "date":
        return (
          <input
            type="datetime-local"
            value={formatDateValue(value)}
            onChange={(e) => handleValueChange(key, e.target.value, type)}
            className="w-full px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );

      case "array":
        const arrayValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {arrayValue.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded-full"
                >
                  {String(item)}
                  <button
                    onClick={() => {
                      const newArray = [...arrayValue];
                      newArray.splice(index, 1);
                      handleValueChange(key, newArray, type);
                    }}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="输入后按 Enter 添加"
              className="w-full px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = e.currentTarget;
                  const newValue = input.value.trim();
                  if (newValue) {
                    handleValueChange(key, [...arrayValue, newValue], type);
                    input.value = "";
                  }
                }
              }}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(key, e.target.value, "string")}
            className="w-full px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
        );
    }
  };

  return (
    <div className={cn("border-b border-border", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">属性</span>
          <span className="text-xs text-muted-foreground">
            ({propertyCount})
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAddField(!showAddField);
          }}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="添加属性"
        >
          <Plus className="h-4 w-4" />
        </button>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {showAddField && (
            <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="属性名称"
                className="flex-1 px-2 py-1 text-sm bg-input border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddField();
                  if (e.key === "Escape") {
                    setShowAddField(false);
                    setNewKey("");
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleAddField}
                disabled={!newKey.trim()}
                className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          )}

          {Object.entries(frontmatter).map(([key, fmValue]) => (
            <div key={key} className="group">
              <div className="flex items-center gap-2 py-1">
                <div
                  className="flex items-center gap-1.5 min-w-[100px] text-muted-foreground"
                  title={TYPE_LABELS[fmValue.type]}
                >
                  {TYPE_ICONS[fmValue.type]}
                  <span
                    className="text-sm cursor-pointer hover:text-foreground"
                    onClick={() => setEditingKey(editingKey === key ? null : key)}
                  >
                    {key}
                  </span>
                </div>

                <div className="flex-1">{renderValueEditor(key, fmValue)}</div>

                <button
                  onClick={() => handleDeleteKey(key)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                  title="删除属性"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {propertyCount === 0 && !showAddField && (
            <p className="text-sm text-muted-foreground text-center py-2">
              暂无属性，点击上方 + 添加
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default PropertyPanel;
