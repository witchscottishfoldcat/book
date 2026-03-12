import { invoke } from "@tauri-apps/api/core";
import { extractLinkTargets, normalizeLinkTarget } from "../utils/linkUtils";

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function buildGraphData(workspaceRoot: string): Promise<GraphData> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const allFiles = await readDirectoryRecursive(workspaceRoot);

  for (const filePath of allFiles) {
    if (!filePath.toLowerCase().endsWith(".md")) continue;

    const fileName = filePath.split(/[/\\]/).pop() || "";
    const nodeId = filePath;
    
    let content = "";
    try {
      content = await invoke<string>("read_file", { path: filePath });
    } catch {
      continue;
    }

    const linkTargets = extractLinkTargets(content);
    
    const node: GraphNode = {
      id: nodeId,
      name: fileName.replace(/\.md$/i, ""),
      path: filePath,
      linkCount: linkTargets.length,
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: 0,
      vy: 0,
    };
    
    nodes.push(node);
    nodeMap.set(nodeId, node);
  }

  for (const filePath of allFiles) {
    if (!filePath.toLowerCase().endsWith(".md")) continue;

    let content = "";
    try {
      content = await invoke<string>("read_file", { path: filePath });
    } catch {
      continue;
    }

    const linkTargets = extractLinkTargets(content);
    const currentDir = filePath.substring(0, filePath.lastIndexOf(/[/\\]/.exec(filePath)?.[0] || "/"));

    for (const target of linkTargets) {
      const normalizedName = normalizeLinkTarget(target);
      const sameDirPath = `${currentDir}/${normalizedName}`;
      const rootPath = `${workspaceRoot}/${normalizedName}`;

      let targetNodeId: string | null = null;
      if (nodeMap.has(sameDirPath)) {
        targetNodeId = sameDirPath;
      } else if (nodeMap.has(rootPath)) {
        targetNodeId = rootPath;
      }

      if (targetNodeId && targetNodeId !== filePath) {
        edges.push({
          source: filePath,
          target: targetNodeId,
        });
      }
    }
  }

  return { nodes, edges };
}

async function readDirectoryRecursive(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await invoke<{ name: string; is_dir: boolean }[]>("read_directory", { path: dirPath });
    
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;
      
      if (entry.is_dir) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        const subFiles = await readDirectoryRecursive(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Failed to read directory ${dirPath}:`, error);
  }
  
  return files;
}

export function applyForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  iterations: number = 100
): void {
  const width = 800;
  const height = 600;
  const k = Math.sqrt((width * height) / nodes.length) * 0.5;
  const gravity = 0.1;
  const damping = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    for (const node of nodes) {
      node.vx = 0;
      node.vy = 0;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        let dx = nodeB.x - nodeA.x;
        let dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = (k * k) / distance;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) continue;
      
      let dx = targetNode.x - sourceNode.x;
      let dy = targetNode.y - sourceNode.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = (distance - k) * 0.1;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      sourceNode.vx += fx;
      sourceNode.vy += fy;
      targetNode.vx -= fx;
      targetNode.vy -= fy;
    }

    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * gravity;
      node.vy += (height / 2 - node.y) * gravity;
      
      node.vx *= damping;
      node.vy *= damping;
      
      node.x += node.vx;
      node.y += node.vy;
      
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    }
  }
}
