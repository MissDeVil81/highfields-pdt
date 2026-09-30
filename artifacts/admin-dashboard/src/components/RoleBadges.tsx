import React from "react";
import { Badge } from "@/components/ui/badge";

type Context = "team" | "hierarchy";
type Variant = "default" | "secondary" | "destructive" | "outline";

function variantFor(role: string, context: Context): Variant {
  if (context === "team") return "secondary";
  if (role === "admin") return "destructive";
  if (role === "manager") return "default";
  if (role === "director") return "outline";
  return "secondary";
}

export function RoleBadges({
  roles,
  context,
}: {
  roles?: readonly string[] | null;
  context: Context;
}) {
  const displayedRoles = roles?.length ? roles : ["employee"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {displayedRoles.map((role, index) => (
        <Badge key={`${role}-${index}`} variant={variantFor(role, context)} className="text-[10px] uppercase h-5 px-1.5 shrink-0">
          {role}
        </Badge>
      ))}
    </div>
  );
}