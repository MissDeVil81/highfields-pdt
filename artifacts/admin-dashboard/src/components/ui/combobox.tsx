import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon, CheckIcon } from "lucide-react";
import { Option } from "./multi-select";

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
}: {
  options: Option[];
  value?: number;
  onChange: (val?: number) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOpt = options.find((o) => o.value === value);
  const displayValue = isOpen ? search : selectedOpt ? selectedOpt.label : "";

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 cursor-default bg-background"
          placeholder={placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
        />
      </div>
      {isOpen && (
        <div className="absolute top-full mt-1 w-full z-[100] max-h-60 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
          <div
            className="px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between"
            onMouseDown={() => {
              onChange(undefined);
              setIsOpen(false);
            }}
          >
            <span className="text-muted-foreground italic">None / Clear</span>
          </div>
          {filtered.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No results found.
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className="px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center"
                onMouseDown={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
                {value === opt.value && <CheckIcon className="h-4 w-4" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
