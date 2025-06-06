// src/components/PlaylistNode.tsx
import { NodeProps, Handle, Position } from "reactflow";

export default function PlaylistNode({ data, style }: NodeProps) {
  return (
    <div
      className="flex flex-col items-center bg-white border border-gray-300 rounded-md shadow-md p-2"
      style={style}
    >
      {data.image ? (
        <img
          src={data.image}
          alt="Playlist cover"
          className="w-full aspect-square object-cover rounded-md"
        />
      ) : (
        <div className="w-full aspect-square bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
          No Image
        </div>
      )}
      <div className="mt-2 text-sm font-medium text-gray-800">{data.label}</div>
      {/* Source handle for edges from this playlist */}
      <Handle type="source" position={Position.Bottom} id="playlist-source" />
    </div>
  );
}
