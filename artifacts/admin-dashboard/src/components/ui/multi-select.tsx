import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon } from "lucide-react";

export interface Option {
  value: number;
  label: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Search...",
}: {
  options: Option[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 bg-background h-9"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border border-input bg-background p-1">
        {filtered.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No results found.
          </div>
        ) : (
          filtered.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                className="rounded border-primary text-primary focus:ring-primary h-4 w-4 accent-primary"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((id) => {
            const opt = options.find((o) => o.value === id);
            return opt ? (
              <Badge key={id} variant="secondary" className="gap-1 px-2 py-0.5">
                {opt.label}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="text-muted-foreground hover:text-foreground outline-none"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
