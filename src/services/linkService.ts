import { invoke } from "@tauri-apps/api/core";
import { parseWikiLinks, normalizeLinkTarget } from "../utils/linkUtils";

export interface Backlink {
  path: string;
  title: string;
  snippet: string;
  linkCount: number;
}

async function readDirectoryRecursive(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(path: string): Promise<void> {
    try {
      const entries = await invoke<{ name: string; is_directory: boolean; path: string }[]>(
        "read_directory",
        { path }
      );
      
      for (const entry of entries) {
        if (entry.is_directory) {
          await scan(entry.path);
        } else if (entry.name.toLowerCase().endsWith(".md")) {
          files.push(entry.path);
        }
      }
    } catch (error) {
      console.error(`扫描目录失败: ${path}`, error);
    }
  }
  
  await scan(dirPath);
  return files;
}

export async function findBacklinks(
  currentNoteName: string,
  workspaceRoot: string,
  currentNotePath: string
): Promise<Backlink[]> {
  const backlinks: Backlink[] = [];
  const normalizedName = normalizeLinkTarget(currentNoteName).replace(/\.md$/i, "").toLowerCase();
  
  const allFiles = await readDirectoryRecursive(workspaceRoot);
  
  for (const filePath of allFiles) {
    if (filePath === currentNotePath) continue;
    
    try {
      const content = await invoke<string>("read_file", { path: filePath });
      const links = parseWikiLinks(content);
      
      const matchingLinks = links.filter((link) => {
        const linkTarget = link.target.replace(/\.md$/i, "").toLowerCase();
        return linkTarget === normalizedName;
      });
      
      if (matchingLinks.length > 0) {
        const fileName = filePath.split(/[/\\]/).pop() || filePath;
        const title = fileName.replace(/\.md$/i, "");
        
        const firstLink = matchingLinks[0];
        const start = Math.max(0, firstLink.startIndex - 50);
        const end = Math.min(content.length, firstLink.endIndex + 50);
        const snippet = content.substring(start, end);
        
        backlinks.push({
          path: filePath,
          title,
          snippet: snippet.length > 100 ? snippet.substring(0, 100) + "..." : snippet,
          linkCount: matchingLinks.length,
        });
      }
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error);
    }
  }
  
  return backlinks;
}

export function getOutgoingLinks(content: string): string[] {
  const links = parseWikiLinks(content);
  return [...new Set(links.map((link) => link.target))];
}
