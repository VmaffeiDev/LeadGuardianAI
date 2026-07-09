import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe subset of the NextAuth config: no providers here, since
 * Credentials + Prisma + argon2 depend on Node APIs that don't run on the
 * Edge runtime middleware uses. `auth.ts` extends this with the real
 * provider for route handlers / server components (Node runtime).
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // next-auth's base User type still has `id?: string`; our authorize()
        // in auth.ts always returns one, so this is safe.
        token.id = user.id!;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      return session;
    },
  },
};
