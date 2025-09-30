import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

const isMockMode =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || process.env.MOCK_MODE === "true";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret"
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  callbacks: {
    async session({ session }) {
      if (isMockMode && session.user) {
        session.user.name = session.user.name ?? "Mock User";
        session.user.email = session.user.email ?? "mock.user@example.com";
      }
      return session;
    }
  }
};
