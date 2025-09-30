import { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedDomains = (process.env.ALLOWED_GOOGLE_OAUTH_DOMAINS ?? '').split(',').map((d) => d.trim()).filter(Boolean);

export const isMockMode = (process.env.MOCK_MODE ?? process.env.NEXT_PUBLIC_MOCK_MODE ?? 'true') === 'true';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ''
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async signIn({ user }) {
      if (allowedDomains.length === 0) return true;
      if (!user.email) return false;
      const domain = user.email.split('@')[1];
      return allowedDomains.includes(domain);
    },
    async jwt({ token }) {
      token.roles = token.roles ?? ['ORG_ADMIN'];
      token.propertyIds = token.propertyIds ?? [];
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = (token.roles as string[]) ?? ['ORG_ADMIN'];
        session.user.propertyIds = (token.propertyIds as string[]) ?? [];
      }
      return session;
    }
  }
};

export const mockUser = {
  id: 'mock-user',
  email: 'mock@astalla.com',
  name: 'Mock User',
  roles: ['ORG_ADMIN'],
  propertyIds: []
};
