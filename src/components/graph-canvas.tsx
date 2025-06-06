"use client";

import React, { useEffect, useState } from "react";
import ReactFlow, { Background, Edge, Node, NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import PlaylistNode from "@/components/PlaylistNode";
import SongNode from "@/components/SongNode";

// Helper for random (x,y) — replace later with a real layout
function randomPosition() {
  return { x: Math.random() * 800, y: Math.random() * 800 };
}

export default function GraphCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Define which React component to render for each node type
  const nodeTypes: NodeTypes = {
    playlist: PlaylistNode,
    song: SongNode,
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
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
        setIsLoading(false);
      } catch (fetchError) {
        console.error("Error fetching /api/spotify/graph:", fetchError);
        setIsLoading(false);
      }
    })();
  }, []);
  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500" />
        <span className="ml-4 text-gray-700">Building your playlist graph…</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{ animated: false }}
      >
        <Background variant="dots" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
