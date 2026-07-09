"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Settings, ShieldCheck, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@leadguardian/db";

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "GESTOR"] },
  { href: "/leads", label: "Leads", icon: ListChecks, roles: ["ADMIN", "GESTOR", "TRATADOR", "VENDEDOR"] },
  { href: "/vendedores", label: "Vendedores", icon: Users, roles: ["ADMIN", "GESTOR"] },
  { href: "/ranking", label: "Ranking", icon: Trophy, roles: ["ADMIN", "GESTOR"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-card p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <span className="font-semibold">LeadGuardianAI</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
