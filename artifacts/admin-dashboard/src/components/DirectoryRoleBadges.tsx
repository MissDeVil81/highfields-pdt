import React from "react";
import { Badge } from "@/components/ui/badge";
import { getRoleLabels, ROLE_LABELS } from "@/lib/userRoles";

const ROLE_VARIANTS = {
  employee: "secondary",
  manager: "default",
  director: "outline",
  admin: "destructive",
  ld: "secondary",
} as const;

export function DirectoryRoleBadges({ roles }: { roles: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {getRoleLabels(roles, ROLE_LABELS).map(({ role, label }, index) => (
        <Badge key={`${role}-${index}`} variant={ROLE_VARIANTS[role as keyof typeof ROLE_VARIANTS] ?? "secondary"} className="uppercase text-[10px] px-1.5 h-5">
          {label}
        </Badge>
      ))}
    </div>
  );
}