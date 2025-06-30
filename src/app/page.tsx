import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/graph");
  }
  return (
    <main className="flex min-h-screen items-center justify-center">
      <a
        href="/api/auth/signin?callbackUrl=/graph"
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Sign in with Spotify
      </a>
    </main>
  );
}
