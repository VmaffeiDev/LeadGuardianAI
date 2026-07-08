"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "@leadguardian/db";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  GESTOR: "Gestor",
  TRATADOR: "Tratador de Leads",
  VENDEDOR: "Vendedor",
};

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
