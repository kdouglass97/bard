import GraphCanvas from "@/components/graph-canvas";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";

export const metadata = { title: "Playlist Graph" };

export default async function GraphPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/graph");
  }
  return (
    <main className="flex flex-col items-center justify-center">
      <GraphCanvas />
    </main>
  );
}
