// src/components/SongNode.tsx
import { NodeProps, Handle, Position } from "reactflow";

export default function SongNode({ data, style }: NodeProps) {
  return (
    <div
      className="flex items-center bg-white border border-gray-300 rounded-md shadow p-1"
      style={{ minWidth: 100, ...style }}
    >
      {data.image ? (
        <img src={data.image} alt="Album art" className="h-10 w-10 object-cover rounded-sm" />
      ) : (
        <div className="h-10 w-10 bg-gray-200 rounded-sm flex items-center justify-center text-gray-400">
          🎵
        </div>
      )}
      <div className="ml-2 text-xs font-normal text-gray-800">{data.label}</div>
      {/* Target handle for edges coming into this song */}
      <Handle type="target" position={Position.Top} id="song-target" />
    </div>
  );
}
