import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      roles: string[];
      propertyIds: string[];
    };
  }

  interface User {
    roles?: string[];
    propertyIds?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roles?: string[];
    propertyIds?: string[];
  }
}
