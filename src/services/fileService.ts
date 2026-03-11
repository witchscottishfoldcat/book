import { invoke } from "@tauri-apps/api/core";
import { FileNode } from "../types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function readFileTree(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await invoke<{ name: string; path: string; isDirectory: boolean }[]>(
      "read_directory",
      { path: dirPath }
    );

    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const node: FileNode = {
        id: generateId(),
        name: entry.name,
        path: entry.path,
        isDirectory: entry.isDirectory,
        extension: entry.isDirectory
          ? undefined
          : entry.name.split(".").pop()?.toLowerCase(),
      };

      if (entry.isDirectory) {
        node.children = await readFileTree(entry.path);
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("读取目录失败:", error);
    return [];
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await invoke<string>("read_file", { path: filePath });
    return content;
  } catch (error) {
    console.error("读取文件失败:", error);
    throw error;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await invoke("write_file", { path: filePath, content });
  } catch (error) {
    console.error("写入文件失败:", error);
    throw error;
  }
}

export async function createFile(
  parentPath: string,
  fileName: string
): Promise<string | null> {
  try {
    const filePath = await invoke<string>("create_file", {
      parentPath,
      fileName,
    });
    return filePath;
  } catch (error) {
    console.error("创建文件失败:", error);
    throw error;
  }
}

export async function createFolder(
  parentPath: string,
  folderName: string
): Promise<string | null> {
  try {
    const folderPath = await invoke<string>("create_folder", {
      parentPath,
      folderName,
    });
    return folderPath;
  } catch (error) {
    console.error("创建文件夹失败:", error);
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await invoke("delete_file", { path: filePath });
  } catch (error) {
    console.error("删除文件失败:", error);
    throw error;
  }
}

export async function renameFile(
  oldPath: string,
  newName: string
): Promise<string> {
  try {
    const newPath = await invoke<string>("rename_file", {
      oldPath,
      newName,
    });
    return newPath;
  } catch (error) {
    console.error("重命名文件失败:", error);
    throw error;
  }
}

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown> | null;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const frontmatterStr = match[1];
  const body = content.slice(match[0].length);

  try {
    const lines = frontmatterStr.split("\n");
    const frontmatter: Record<string, unknown> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        if (typeof value === "string") {
          if (value.startsWith("[") && value.endsWith("]")) {
            value = value
              .slice(1, -1)
              .split(",")
              .map((s) => s.trim());
          } else if (value === "true") {
            value = true;
          } else if (value === "false") {
            value = false;
          } else if (/^\d+$/.test(value)) {
            value = parseInt(value, 10);
          }
        }

        frontmatter[key] = value;
      }
    }

    return { frontmatter, body };
  } catch {
    return { frontmatter: null, body };
  }
}

export function stringifyFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) return body;

  let yaml = "---\n";
  for (const key of keys) {
    const value = frontmatter[key];
    if (Array.isArray(value)) {
      yaml += `${key}: [${value.join(", ")}]\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  yaml += "---\n";

  return yaml + body;
}
