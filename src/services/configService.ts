import { WorkspaceConfig } from "../types";

const STORAGE_KEY = "mdnotes-workspace";

export async function getWorkspaceConfig(): Promise<WorkspaceConfig | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择笔记存储目录",
    });

    if (selected && typeof selected === "string") {
      const config: WorkspaceConfig = {
        rootPath: selected,
        name: selected.split(/[/\\]/).pop() || "工作区",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return config;
    }

    return null;
  } catch (error) {
    console.error("获取工作区配置失败:", error);
    return null;
  }
}

export function saveWorkspaceConfig(config: WorkspaceConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearWorkspaceConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
