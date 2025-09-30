import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { fetchBackendProfile } from './profile';

const mockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || process.env.MOCK_MODE === 'true';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? 'mock-google-client',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'mock-google-secret',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Mock login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      authorize: async (credentials) => {
        if (!mockMode) return null;
        const email = credentials?.email ?? 'demo@astalla.com';
        return { id: 'mock-user', email, name: 'Astalla Demo' };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        token.sub = user.id ?? token.sub ?? 'user';
        token.email = user.email ?? token.email;
      }

      if (mockMode) {
        token.role = 'ORG_ADMIN';
        token.orgId = 'org_demo';
        token.propertyScopes = [
          { id: 'prop_0', propertyCode: 'AST-NORTH' },
          { id: 'prop_1', propertyCode: 'AST-CENTRAL' },
        ];
        return token;
      }

      if (token.sub) {
        const profile = await fetchBackendProfile(token.sub);
        if (profile) {
          token.role = profile.role;
          token.orgId = profile.orgId;
          token.propertyScopes = profile.propertyScopes;
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          role: token.role,
          orgId: token.orgId,
          propertyScopes: token.propertyScopes ?? [],
        },
      };
    },
  },
};
