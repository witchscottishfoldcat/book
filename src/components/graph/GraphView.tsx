import React, { useRef, useEffect, useCallback, useState } from "react";
import { useGraphStore } from "../../stores/graphStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { GraphNode } from "../../services/graphService";
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";

interface GraphViewProps {
  onClose?: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, isLoading, loadGraph, selectedNodeId, setSelectedNode, zoom, setZoom, panX, panY, setPan, resetView } = useGraphStore();
  const { workspace, addOpenNote } = useWorkspaceStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (workspace?.rootPath) {
      loadGraph(workspace.rootPath);
    }
  }, [workspace?.rootPath, loadGraph]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const transformPoint = useCallback((x: number, y: number) => {
    return {
      x: x * zoom + panX,
      y: y * zoom + panY,
    };
  }, [zoom, panX, panY]);

  const inverseTransformPoint = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - panX) / zoom,
      y: (screenY - panY) / zoom,
    };
  }, [zoom, panX, panY]);

  const getNodeAtPosition = useCallback((screenX: number, screenY: number): GraphNode | null => {
    const { x, y } = inverseTransformPoint(screenX, screenY);
    const nodeRadius = 20;

    for (const node of nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= nodeRadius) {
        return node;
      }
    }
    return null;
  }, [nodes, inverseTransformPoint]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 1;

    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const start = transformPoint(sourceNode.x, sourceNode.y);
      const end = transformPoint(targetNode.x, targetNode.y);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    for (const node of nodes) {
      const pos = transformPoint(node.x, node.y);
      const isSelected = node.id === selectedNodeId;
      const isHovered = node === hoveredNode;
      const baseRadius = 15;
      const radius = baseRadius * zoom;

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      if (isSelected) {
        gradient.addColorStop(0, "#a855f7");
        gradient.addColorStop(1, "#6366f1");
      } else if (isHovered) {
        gradient.addColorStop(0, "#8b5cf6");
        gradient.addColorStop(1, "#6366f1");
      } else {
        gradient.addColorStop(0, "#6366f1");
        gradient.addColorStop(1, "#4f46e5");
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = "#a5b4fc";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (zoom >= 0.6) {
        ctx.fillStyle = "#e0e7ff";
        ctx.font = `${Math.max(10, 12 * zoom)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        const maxLabelWidth = radius * 2.5;
        let label = node.name;
        if (ctx.measureText(label).width > maxLabelWidth) {
          while (ctx.measureText(label + "...").width > maxLabelWidth && label.length > 1) {
            label = label.slice(0, -1);
          }
          label += "...";
        }
        
        ctx.fillText(label, pos.x, pos.y + radius + 4);
      }
    }

    if (isLoading) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "16px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("正在构建图谱...", canvasSize.width / 2, canvasSize.height / 2);
    }
  }, [nodes, edges, selectedNodeId, hoveredNode, zoom, panX, panY, transformPoint, canvasSize, isLoading]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      setSelectedNode(node.id);
    } else {
      setIsDragging(true);
      setDragStart({ x: x - panX, y: y - panY });
      setSelectedNode(null);
    }
  }, [getNodeAtPosition, panX, panY, setSelectedNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setPan(x - dragStart.x, y - dragStart.y);
    } else {
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node);
      canvasRef.current!.style.cursor = node ? "pointer" : "grab";
    }
  }, [isDragging, dragStart, getNodeAtPosition, setPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredNode(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newZoom = Math.max(0.2, Math.min(3, zoom * delta));
    const scale = newZoom / zoom;

    setPan(mouseX - (mouseX - panX) * scale, mouseY - (mouseY - panY) * scale);
    setZoom(newZoom);
  }, [zoom, panX, panY, setZoom, setPan]);

  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: node.name,
      path: node.path,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addOpenNote(note);
    onClose?.();
  }, [addOpenNote, onClose]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      handleNodeDoubleClick(node);
    }
  }, [getNodeAtPosition, handleNodeDoubleClick]);

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleRefresh = () => {
    if (workspace?.rootPath) {
      loadGraph(workspace.rootPath);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-100">知识图谱</h2>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
            {nodes.length} 个节点 / {edges.length} 条链接
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="刷新图谱"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="放大"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={resetView}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="重置视图"
          >
            <Maximize2 size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors ml-2"
              title="关闭"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="absolute inset-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        />

        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium text-slate-100">{hoveredNode.name}</div>
            <div className="text-xs text-slate-400 mt-1">
              {hoveredNode.linkCount} 个出链
            </div>
            <div className="text-xs text-slate-500 mt-1">
              双击打开笔记
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
          缩放: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
};
