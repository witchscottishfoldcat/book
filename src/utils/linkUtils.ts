export interface WikiLink {
  raw: string;
  target: string;
  displayText: string | null;
  startIndex: number;
  endIndex: number;
}

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function parseWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    links.push({
      raw: match[0],
      target: match[1].trim(),
      displayText: match[2]?.trim() || null,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return links;
}

export function extractLinkTargets(content: string): string[] {
  const links = parseWikiLinks(content);
  return [...new Set(links.map((link) => link.target))];
}

export function normalizeLinkTarget(target: string): string {
  let normalized = target.trim();
  if (!normalized.toLowerCase().endsWith(".md")) {
    normalized += ".md";
  }
  return normalized;
}

export interface LinkPaths {
  sameDir: string;
  root: string;
}

export function resolveLinkPath(target: string, currentNotePath: string, workspaceRoot: string): LinkPaths | null {
  const normalizedName = normalizeLinkTarget(target);
  const currentDir = currentNotePath.substring(0, currentNotePath.lastIndexOf(/[/\\]/.exec(currentNotePath)?.[0] || "/"));
  const sameDirPath = `${currentDir}/${normalizedName}`;
  const rootPath = `${workspaceRoot}/${normalizedName}`;
  
  return {
    sameDir: sameDirPath,
    root: rootPath,
  };
}

export function replaceWikiLinksWithHtml(content: string): string {
  return content.replace(WIKI_LINK_REGEX, (_match, target, displayText) => {
    const text = displayText || target;
    return `<a href="wiki://${encodeURIComponent(target)}" class="wiki-link" data-target="${target}">${text}</a>`;
  });
}

export function isWikiLinkElement(element: Element): boolean {
  return element.classList.contains("wiki-link") || element.hasAttribute("data-target");
}

export function getWikiLinkTarget(element: Element): string | null {
  return element.getAttribute("data-target");
}
