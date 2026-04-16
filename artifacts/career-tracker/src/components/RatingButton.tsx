import { cn } from "@/lib/utils";

type Rating = "red" | "amber" | "green";

interface RatingButtonProps {
  value: Rating;
  selected: boolean;
  onClick: () => void;
  label?: string;
}

const config: Record<Rating, { label: string; selectedClasses: string; idleClasses: string }> = {
  red: {
    label: "Not Ready",
    selectedClasses: "bg-red-500 text-white border-red-500 shadow-sm",
    idleClasses: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
  },
  amber: {
    label: "In Progress",
    selectedClasses: "bg-amber-500 text-white border-amber-500 shadow-sm",
    idleClasses: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  green: {
    label: "Ready",
    selectedClasses: "bg-green-500 text-white border-green-500 shadow-sm",
    idleClasses: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  },
};

export function RatingButton({ value, selected, onClick, label }: RatingButtonProps) {
  const cfg = config[value];
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer select-none",
        selected ? cfg.selectedClasses : cfg.idleClasses
      )}
    >
      <span className={cn(
        "inline-block h-2 w-2 rounded-full flex-shrink-0",
        selected
          ? "bg-current opacity-70"
          : value === "red" ? "bg-red-400" : value === "amber" ? "bg-amber-400" : "bg-green-400"
      )} />
      {label ?? cfg.label}
    </button>
  );
}

export function RatingPicker({
  value,
  onChange,
}: {
  value: Rating | null;
  onChange: (r: Rating) => void;
}) {
  const ratings: Rating[] = ["red", "amber", "green"];
  return (
    <div className="flex gap-2">
      {ratings.map(r => (
        <RatingButton
          key={r}
          value={r}
          selected={value === r}
          onClick={() => onChange(r)}
        />
      ))}
    </div>
  );
}

export function RatingBadge({ rating }: { rating: Rating | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">Not rated</span>;
  const cfg = config[rating];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
      cfg.selectedClasses
    )}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  );
}
