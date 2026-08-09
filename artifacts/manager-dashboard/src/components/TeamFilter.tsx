import { useHierarchy } from "@/hooks/useHierarchy";
import { Users, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamFilterProps {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  className?: string;
}

export function TeamFilter({ selectedId, onSelect, className }: TeamFilterProps) {
  const { data: members = [], isLoading } = useHierarchy();

  const selected = members.find(m => m.id === selectedId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
        <Users className="h-3.5 w-3.5" />
        <span>Viewing:</span>
      </div>
      <div className="relative">
        <select
          value={selectedId ?? ""}
          onChange={e => {
            const val = e.target.value;
            onSelect(val === "" ? null : parseInt(val));
          }}
          disabled={isLoading}
          className={cn(
            "appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-card text-sm",
            "text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer",
            "disabled:opacity-50 min-w-[180px]"
          )}
        >
          <option value="">All team members</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}{m.department ? ` (${m.department})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </div>
      {selected && (
        <button
          onClick={() => onSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Clear
        </button>
      )}
    </div>
  );
}
