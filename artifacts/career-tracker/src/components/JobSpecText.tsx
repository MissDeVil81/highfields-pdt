function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith("•") || t.startsWith("-") || t.startsWith("*")) return false;
  if (!/^[A-Z]/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  if (/[.,!?]$/.test(t)) return false;
  return true;
}

export function JobSpecText({ text }: { text: string }) {
  const lines = text.split("\n").filter(l => l.trim());

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const t = line.trim();
        if (isHeading(t)) {
          return (
            <p key={i} className="text-sm font-bold text-foreground pt-3 first:pt-0">
              {t}
            </p>
          );
        }
        if (t.startsWith("•")) {
          return (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed pl-4">
              {t}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {t}
          </p>
        );
      })}
    </div>
  );
}
