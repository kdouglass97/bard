// src/auth.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { JWT } from "next-auth/jwt";

// Helper to refresh an expired Spotify token
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Spotify access token");
    }

    const refreshed = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("❌ Error refreshing Spotify token:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

// Export the configuration separately so it can be used by `getServerSession`
export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "user-read-email",
            "playlist-read-private",
            "playlist-read-collaborative",
            "user-library-read",
            "user-read-recently-played",
          ].join(" "),
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      // First sign-in: store tokens & expiry
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token!,
          expiresAt: (account.expires_at! as number) * 1000,
          user,
        };
      }
      // If token is still valid, return it
      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }
      // Otherwise, token expired → refresh
      console.log("🔄 Refreshing Spotify access token");
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Attach fresh data to session
      session.user = token.user as any;
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      return session;
    },
  },
};

// This is the handler that Next.js will call for any auth request
const handler = NextAuth(authOptions);

// Export the handler as both GET and POST so Next.js can route requests correctly
export { handler as GET, handler as POST };

// Also provide a default export in case you do `import auth from "@/auth"`
export default handler;
