export interface FrontmatterValue {
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  value: unknown;
}

export interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>;
  body: string;
  raw: string | null;
  errors: string[];
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

function detectType(value: string): FrontmatterValue {
  const trimmed = value.trim();

  if (trimmed === "true" || trimmed === "false") {
    return { type: "boolean", value: trimmed === "true" };
  }

  if (trimmed === "null" || trimmed === "~") {
    return { type: "string", value: "" };
  }

  if (/^-?\d+$/.test(trimmed)) {
    return { type: "number", value: parseInt(trimmed, 10) };
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return { type: "number", value: parseFloat(trimmed) };
  }

  if (DATE_REGEX.test(trimmed) || ISO_DATE_REGEX.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { type: "date", value: date };
    }
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const arrayContent = trimmed.slice(1, -1).trim();
    if (!arrayContent) {
      return { type: "array", value: [] };
    }
    const items = parseInlineArray(arrayContent);
    return { type: "array", value: items };
  }

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return { type: "string", value: trimmed.slice(1, -1) };
  }

  return { type: "string", value: trimmed };
}

function parseInlineArray(content: string): unknown[] {
  const items: unknown[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      current += char;
    } else if (char === "," && !inQuotes) {
      items.push(detectType(current.trim()).value);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    items.push(detectType(current.trim()).value);
  }

  return items;
}

function parseMultilineArray(lines: string[], startIndex: number): {
  values: unknown[];
  endIndex: number;
} {
  const values: unknown[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("- ")) {
      const itemValue = line.slice(2).trim();
      values.push(detectType(itemValue).value);
      i++;
    } else if (line === "" || line.startsWith("#")) {
      i++;
    } else if (!line.startsWith(" ") && !line.startsWith("\t")) {
      break;
    } else {
      i++;
    }
  }

  return { values, endIndex: i };
}

export function parseFrontmatterEnhanced(content: string): ParsedFrontmatter {
  const errors: string[] = [];
  const frontmatterRegex = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      data: {},
      body: content,
      raw: null,
      errors: [],
    };
  }

  const rawFrontmatter = match[1];
  const body = content.slice(match[0].length);
  const data: Record<string, FrontmatterValue> = {};

  try {
    const lines = rawFrontmatter.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        i++;
        continue;
      }

      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) {
        i++;
        continue;
      }

      const key = trimmedLine.slice(0, colonIndex).trim();
      const valuePart = trimmedLine.slice(colonIndex + 1).trim();

      if (valuePart === "" || valuePart === "|") {
        const isMultiline = valuePart === "|";
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";

        if (nextLine.trim().startsWith("- ")) {
          const result = parseMultilineArray(lines, i + 1);
          data[key] = { type: "array", value: result.values };
          i = result.endIndex;
        } else if (isMultiline) {
          let multilineValue = "";
          i++;
          while (i < lines.length) {
            const mlLine = lines[i];
            if (mlLine.startsWith("  ") || mlLine.startsWith("\t")) {
              multilineValue += (multilineValue ? "\n" : "") + mlLine.trim();
              i++;
            } else {
              break;
            }
          }
          data[key] = { type: "string", value: multilineValue };
        } else {
          i++;
        }
      } else {
        data[key] = detectType(valuePart);
        i++;
      }
    }
  } catch (error) {
    errors.push(`解析错误: ${error instanceof Error ? error.message : "未知错误"}`);
  }

  return {
    data,
    body,
    raw: rawFrontmatter,
    errors,
  };
}

export function parseFrontmatterSimple(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const result = parseFrontmatterEnhanced(content);
  const frontmatter: Record<string, unknown> = {};

  for (const [key, fmValue] of Object.entries(result.data)) {
    frontmatter[key] = fmValue.value;
  }

  return { frontmatter, body: result.body };
}

export function stringifyFrontmatterEnhanced(
  data: Record<string, FrontmatterValue>,
  body: string
): string {
  const keys = Object.keys(data);
  if (keys.length === 0) return body;

  let yaml = "---\n";

  for (const key of keys) {
    const { type, value } = data[key];

    switch (type) {
      case "array":
        if (Array.isArray(value) && value.length > 0) {
          yaml += `${key}:\n`;
          for (const item of value) {
            yaml += `  - ${formatValue(item)}\n`;
          }
        } else {
          yaml += `${key}: []\n`;
        }
        break;

      case "date":
        if (value instanceof Date) {
          yaml += `${key}: ${value.toISOString()}\n`;
        } else {
          yaml += `${key}: ${value}\n`;
        }
        break;

      case "string":
        const strValue = String(value);
        if (strValue.includes("\n") || strValue.includes(":") || strValue.includes("#")) {
          yaml += `${key}: |\n`;
          for (const line of strValue.split("\n")) {
            yaml += `  ${line}\n`;
          }
        } else if (strValue === "" || /[^\w\-]/.test(strValue)) {
          yaml += `${key}: "${strValue}"\n`;
        } else {
          yaml += `${key}: ${strValue}\n`;
        }
        break;

      default:
        yaml += `${key}: ${formatValue(value)}\n`;
    }
  }

  yaml += "---\n";
  return yaml + body;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    if (value.includes(",") || value.includes('"') || value.includes("'")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

export function createDefaultFrontmatter(title?: string): Record<string, FrontmatterValue> {
  const now = new Date();

  return {
    title: { type: "string", value: title || "无标题" },
    created: { type: "date", value: now },
    updated: { type: "date", value: now },
    tags: { type: "array", value: [] },
    published: { type: "boolean", value: false },
  };
}

export function updateFrontmatterValue(
  data: Record<string, FrontmatterValue>,
  key: string,
  value: unknown
): Record<string, FrontmatterValue> {
  const type = detectTypeFromValue(value);
  return {
    ...data,
    [key]: { type, value },
  };
}

function detectTypeFromValue(value: unknown): FrontmatterValue["type"] {
  if (value === null || value === undefined) {
    return "string";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (value instanceof Date) {
    return "date";
  }

  const typeofValue = typeof value;

  switch (typeofValue) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      if (DATE_REGEX.test(value as string) || ISO_DATE_REGEX.test(value as string)) {
        const date = new Date(value as string);
        if (!isNaN(date.getTime())) {
          return "date";
        }
      }
      return "string";
    default:
      return "string";
  }
}

export function validateFrontmatter(data: Record<string, FrontmatterValue>): string[] {
  const errors: string[] = [];

  if (!data.title) {
    errors.push("缺少 title 字段");
  } else if (data.title.type !== "string") {
    errors.push("title 必须是字符串");
  }

  if (data.tags && data.tags.type !== "array") {
    errors.push("tags 必须是数组");
  }

  if (data.published && data.published.type !== "boolean") {
    errors.push("published 必须是布尔值");
  }

  return errors;
}
