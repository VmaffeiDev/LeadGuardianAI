import type { Role } from "@leadguardian/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    tenantId: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string;
    role: Role;
  }
}
