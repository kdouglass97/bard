import GraphCanvas from "@/components/graph-canvas";

export const metadata = { title: "Playlist Graph" };

export default function GraphPage() {
  return (
    <main className="flex flex-col items-center justify-center">
      <GraphCanvas />
    </main>
  );
}
