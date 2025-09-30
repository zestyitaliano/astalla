import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      role?: string;
      orgId?: string;
      propertyScopes?: { id: string; propertyCode: string }[];
    };
  }
}
