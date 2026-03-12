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
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  FrontmatterValue,
  updateFrontmatterValue,
} from "../../utils/frontmatter";
import { useTagStore } from "../../stores/tagStore";

interface PropertyPanelProps {
  frontmatter: Record<string, FrontmatterValue>;
  onChange: (data: Record<string, FrontmatterValue>) => void;
  className?: string;
}

type PropertyType = FrontmatterValue["type"];

const TYPE_ICONS: Record<PropertyType, React.ReactNode> = {
  string:  <Type className="h-3 w-3" />,
  number:  <Hash className="h-3 w-3" />,
  boolean: <ToggleLeft className="h-3 w-3" />,
  date:    <Calendar className="h-3 w-3" />,
  array:   <List className="h-3 w-3" />,
  object:  <Tag className="h-3 w-3" />,
};

const TYPE_COLORS: Record<PropertyType, string> = {
  string:  "hsl(248 75% 68%)",
  number:  "hsl(142 65% 52%)",
  boolean: "hsl(38 90% 60%)",
  date:    "hsl(190 80% 52%)",
  array:   "hsl(300 65% 62%)",
  object:  "hsl(18 80% 58%)",
};

function formatDateValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 16);
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 16);
  }
  return "";
}

function parseDateInput(input: string): Date | null {
  if (!input) return null;
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "5px 10px",
  fontSize: "12px",
  background: "hsl(var(--input))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...INPUT_STYLE,
        ...(focused
          ? {
              borderColor: "hsl(var(--primary) / 0.5)",
              boxShadow: "0 0 0 3px hsl(var(--primary) / 0.1)",
            }
          : {}),
        ...props.style,
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
}

export function PropertyPanel({ frontmatter, onChange, className }: PropertyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [showAddField, setShowAddField] = useState(false);
  const { getTagColor, addTag } = useTagStore();

  const propertyCount = useMemo(() => Object.keys(frontmatter).length, [frontmatter]);

  const handleValueChange = useCallback(
    (key: string, value: unknown, type: PropertyType) => {
      const updated = updateFrontmatterValue(frontmatter, key, value);
      if (type === "date" && typeof value === "string") {
        const date = parseDateInput(value);
        if (date) updated[key] = { type: "date", value: date };
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
    if (!newKey.trim() || frontmatter[newKey.trim()]) return;
    onChange({ ...frontmatter, [newKey.trim()]: { type: "string", value: "" } });
    setNewKey("");
    setShowAddField(false);
  }, [newKey, frontmatter, onChange]);

  const renderValueEditor = (key: string, { type, value }: FrontmatterValue) => {
    switch (type) {
      case "string":
        return (
          <StyledInput
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(key, e.target.value, type)}
            placeholder="输入文本..."
          />
        );

      case "number":
        return (
          <StyledInput
            type="number"
            value={String(value)}
            onChange={(e) => handleValueChange(key, e.target.value ? Number(e.target.value) : 0, type)}
            style={{ ...INPUT_STYLE, width: 120 }}
          />
        );

      case "boolean":
        const boolVal = Boolean(value);
        return (
          <button
            onClick={() => handleValueChange(key, !boolVal, type)}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full transition-all duration-150"
            style={{
              background: boolVal ? "hsl(142 65% 52% / 0.15)" : "hsl(var(--muted))",
              color: boolVal ? "hsl(142 65% 52%)" : "hsl(var(--muted-foreground))",
              border: `1px solid ${boolVal ? "hsl(142 65% 52% / 0.3)" : "hsl(var(--border))"}`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all"
              style={{ background: boolVal ? "hsl(142 65% 52%)" : "hsl(var(--muted-foreground) / 0.4)" }}
            />
            {boolVal ? "是" : "否"}
          </button>
        );

      case "date":
        return (
          <StyledInput
            type="datetime-local"
            value={formatDateValue(value)}
            onChange={(e) => handleValueChange(key, e.target.value, type)}
            style={{ ...INPUT_STYLE, colorScheme: "dark" }}
          />
        );

      case "array":
        const arrayValue = Array.isArray(value) ? value : [];
        const isTagsField = key.toLowerCase() === "tags";
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {arrayValue.map((item, index) => {
                const itemStr = String(item);
                const tagColor = isTagsField ? getTagColor(itemStr) : "hsl(var(--primary))";
                return (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full"
                    style={{
                      background: `${tagColor}18`,
                      color: tagColor,
                      border: `1px solid ${tagColor}30`,
                    }}
                  >
                    {itemStr}
                    <button
                      onClick={() => {
                        const newArray = [...arrayValue];
                        newArray.splice(index, 1);
                        handleValueChange(key, newArray, type);
                      }}
                      className="hover:opacity-60 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
            <StyledInput
              type="text"
              placeholder={isTagsField ? "输入后按 Enter 添加标签" : "输入后按 Enter 添加项"}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const input = e.currentTarget;
                  const newValue = input.value.trim();
                  if (newValue) {
                    if (isTagsField) addTag(newValue);
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
          <StyledInput
            type="text"
            value={String(value)}
            onChange={(e) => handleValueChange(key, e.target.value, "string")}
          />
        );
    }
  };

  return (
    <div
      className={cn("border-b", className)}
      style={{ borderColor: "hsl(var(--border))" }}
    >
      {/* 面板标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: "hsl(var(--muted) / 0.3)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted) / 0.5)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted) / 0.3)";
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "hsl(var(--muted-foreground))" }}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <span className="text-xs font-semibold" style={{ color: "hsl(var(--foreground) / 0.7)" }}>
            文档属性
          </span>
          {propertyCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}
            >
              {propertyCount}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAddField(!showAddField);
            if (!isExpanded) setIsExpanded(true);
          }}
          className="p-1 rounded transition-all duration-150"
          title="添加属性"
          style={{ color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent))";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--foreground))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1.5 space-y-1.5">
          {/* 添加字段输入框 */}
          {showAddField && (
            <div
              className="flex items-center gap-2 p-2.5 rounded-lg mb-2 animate-fade-in"
              style={{
                background: "hsl(var(--muted) / 0.4)",
                border: "1px solid hsl(var(--primary) / 0.2)",
              }}
            >
              <StyledInput
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="新属性名称"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddField();
                  if (e.key === "Escape") { setShowAddField(false); setNewKey(""); }
                }}
                autoFocus
              />
              <button
                onClick={handleAddField}
                disabled={!newKey.trim()}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap"
                style={{
                  background: newKey.trim() ? "hsl(var(--primary))" : "hsl(var(--muted))",
                  color: newKey.trim() ? "white" : "hsl(var(--muted-foreground))",
                  opacity: newKey.trim() ? 1 : 0.5,
                }}
              >
                添加
              </button>
            </div>
          )}

          {/* 属性列表 */}
          {Object.entries(frontmatter).map(([key, fmValue]) => (
            <div
              key={key}
              className="group flex items-start gap-2.5 p-2 rounded-lg transition-colors"
              style={{}}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted) / 0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "";
              }}
            >
              {/* 属性键名 + 类型图标 */}
              <div
                className="flex items-center gap-1.5 pt-1 min-w-[90px] max-w-[90px]"
                title={`类型: ${fmValue.type}`}
              >
                <span
                  className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                  style={{
                    background: `${TYPE_COLORS[fmValue.type]}18`,
                    color: TYPE_COLORS[fmValue.type],
                  }}
                >
                  {TYPE_ICONS[fmValue.type]}
                </span>
                <span
                  className="text-[11px] font-medium truncate"
                  style={{ color: "hsl(var(--foreground) / 0.7)" }}
                  title={key}
                >
                  {key}
                </span>
              </div>

              {/* 值编辑器 */}
              <div className="flex-1 min-w-0">
                {renderValueEditor(key, fmValue)}
              </div>

              {/* 删除按钮 */}
              <button
                onClick={() => handleDeleteKey(key)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all duration-150 mt-0.5 flex-shrink-0"
                title="删除属性"
                style={{ color: "hsl(var(--muted-foreground))" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(0 68% 52% / 0.12)";
                  (e.currentTarget as HTMLButtonElement).style.color = "hsl(0 68% 52%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* 空属性提示 */}
          {propertyCount === 0 && !showAddField && (
            <div className="flex flex-col items-center gap-1.5 py-4 text-center">
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                暂无属性
              </span>
              <button
                onClick={() => setShowAddField(true)}
                className="text-[11px] underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: "hsl(var(--primary))" }}
              >
                添加第一个属性
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PropertyPanel;
