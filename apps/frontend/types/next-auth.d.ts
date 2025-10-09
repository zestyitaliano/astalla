import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
    accessToken?: string;
  }

  interface Session {
    accessToken?: string;
    user?: DefaultSession["user"] & {
      id: string;
      email: string;
      role?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    user?: {
      id: string;
      email: string;
      name?: string | null;
      role?: string | null;
    };
  }
}
