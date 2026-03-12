import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GraphNode, GraphEdge, buildGraphData, applyForceLayout } from "../services/graphService";

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  zoom: number;
  panX: number;
  panY: number;

  loadGraph: (workspaceRoot: string) => Promise<void>;
  setSelectedNode: (nodeId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      isLoading: false,
      error: null,
      selectedNodeId: null,
      zoom: 1,
      panX: 0,
      panY: 0,

      loadGraph: async (workspaceRoot: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await buildGraphData(workspaceRoot);
          applyForceLayout(data.nodes, data.edges, 150);
          set({ nodes: data.nodes, edges: data.edges, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : "加载图谱失败";
          set({ error: message, isLoading: false });
        }
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

      setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(3, zoom)) }),

      setPan: (x, y) => set({ panX: x, panY: y }),

      resetView: () => set({ zoom: 1, panX: 0, panY: 0, selectedNodeId: null }),
    }),
    {
      name: "mdnotes-graph-state",
      partialize: (state) => ({
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
      }),
    }
  )
);
