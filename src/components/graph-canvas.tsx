"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import ReactFlow, {
  Background,
  Edge,
  Node,
  NodeTypes,
  NodeMouseHandler,
  NodeDragHandler,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import PlaylistNode from "@/components/PlaylistNode";
import SongNode from "@/components/SongNode";

// Stable mapping for React Flow node types
const NODE_TYPES: NodeTypes = {
  playlist: PlaylistNode,
  song: SongNode,
};

// Helper for random (x,y) — replace later with a real layout
function randomPosition() {
  return { x: Math.random() * 800, y: Math.random() * 800 };
}

export default function GraphCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("");

  // Define which React component to render for each node type
  const nodeTypes = NODE_TYPES;

  const askListeningFeedback = async () => {
    try {
      const res = await fetch("/api/listening-feedback");
      const data = await res.json();
      if (data.text) setAiMessage(data.text);
    } catch (err) {
      console.error("/api/listening-feedback error", err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        console.time("🔄 fetch /api/spotify/graph");
        const res = await fetch("/api/spotify/graph", {
          credentials: "include",
        });
        console.timeEnd("🔄 fetch /api/spotify/graph");
  
        console.time("📦 parse JSON");
        const data = await res.json();
        console.timeEnd("📦 parse JSON");
  
        // If the server returned an error key, log it and bail out.
        if (data.error) {
          console.error("❌ /api/spotify/graph error:", data.error);
          setIsLoading(false);
          return;
        }
  
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          console.error("Unexpected /api/spotify/graph response:", data);
          setIsLoading(false);
          return;
        }

        // Map the plain JSON nodes/edges returned from the API into the shape
        // expected by React Flow and store them in state.
        const rfNodes: Node[] = data.nodes.map((n: any) => ({
          id: n.id,
          type: n.type,
          data: n.data,
          position: n.position ?? randomPosition(),
          style: n.style,
        }));

        const rfEdges: Edge[] = data.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        }));

        // Degree map for sizing and layout
        const degree = new Map<string, number>();
        rfEdges.forEach((e) => {
          degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
          degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
        });

        // Radial layout: sort by degree so hubs are near center
        const sorted = [...rfNodes].sort(
          (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
        );
        const radiusStep = 120;
        sorted.forEach((node, idx) => {
          const deg = degree.get(node.id) ?? 1;
          const radius = radiusStep * Math.log2(deg + 1);
          const angle = (idx / sorted.length) * Math.PI * 2;
          node.position = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
          const size = 60 + deg * 10;
          node.style = { ...node.style, width: size, height: size };
        });

        setNodes(rfNodes);
        setEdges(rfEdges);
        setIsLoading(false);
      } catch (fetchError) {
        console.error("Error fetching /api/spotify/graph:", fetchError);
        setIsLoading(false);
      }
    })();
  }, []);



  // Highlight logic for hover spotlight
  const displayNodes = useMemo(() => {
    if (!hoverId) return nodes;
    const connected = new Set<string>();
    edges.forEach((e) => {
      if (e.source === hoverId) connected.add(e.target);
      if (e.target === hoverId) connected.add(e.source);
    });
    return nodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity: n.id === hoverId || connected.has(n.id) ? 1 : 0.1,
      },
    }));
  }, [nodes, edges, hoverId]);

  const displayEdges = useMemo(() => {
    if (!hoverId) return edges;
    return edges.map((e) => ({
      ...e,
      style: {
        ...(e.style ?? {}),
        opacity: e.source === hoverId || e.target === hoverId ? 1 : 0.1,
      },
    }));
  }, [edges, hoverId]);

  const onNodeEnter: NodeMouseHandler = (_, n) => setHoverId(n.id);
  const onNodeLeave: NodeMouseHandler = () => setHoverId(null);

  const resolveCollision = (moving: Node, others: Node[]) => {
    const r1 = (moving.style?.width ?? 40) / 2 + 10;
    others.forEach((o) => {
      if (o.id === moving.id) return;
      const r2 = (o.style?.width ?? 40) / 2 + 10;
      const dx = moving.position.x - o.position.x;
      const dy = moving.position.y - o.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = r1 + r2;
      if (dist < minDist && dist > 0) {
        const angle = Math.atan2(dy, dx);
        const shift = (minDist - dist) / 2;
        o.position = {
          x: o.position.x - Math.cos(angle) * shift,
          y: o.position.y - Math.sin(angle) * shift,
        };
      }
    });
  };

  const onDrag: NodeDragHandler = (_, node) => {
    setNodes((nds) => {
      const updated = nds.map((n) => (n.id === node.id ? { ...n, position: node.position } : { ...n }));
      const moving = updated.find((n) => n.id === node.id)!;
      resolveCollision(moving, updated);
      return updated;
    });
  };

  const onInit = useCallback((inst: ReactFlowInstance) => {
    setRfInstance(inst);
    inst.fitView();
  }, []);

  useEffect(() => {
    rfInstance?.fitView();
  }, [rfInstance, nodes]);

  return (
    <div className="relative h-screen w-full">
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
        <button
          onClick={askListeningFeedback}
          className="bg-blue-500 text-white text-sm px-3 py-1 rounded"
        >
          Ask AI
        </button>
        {aiMessage && (
          <div className="bg-white dark:bg-gray-800 text-sm p-2 rounded shadow max-w-xs">
            {aiMessage}
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500" />
          <span className="ml-4 text-gray-700">Building your playlist graph…</span>
        </div>
      ) : (
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodeMouseEnter={onNodeEnter}
          onNodeMouseLeave={onNodeLeave}
          onNodeDrag={onDrag}
          onInit={onInit}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            animated: false,
            style: { stroke: "rgba(220,220,220,0.6)", strokeWidth: 1 },
          }}
          panOnDrag
          zoomOnScroll
        >
          <Background variant="dots" gap={16} size={1} />
        </ReactFlow>
      )}
    </div>
  );
}
