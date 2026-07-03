function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^[•\-*]/.test(t)) return false;
  if (!/^[A-Z]/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  if (/[.,!?]$/.test(t)) return false;
  return true;
}

// Detect "Name – description" lines where the name is short but the full line
// exceeds the heading word limit (e.g. behaviours, the "What Success Looks Like" heading)
function parseDashItem(line: string): { name: string; description: string } | null {
  const t = line.trim();
  if (!t || /^[•\-*]/.test(t)) return null;
  const idx = t.indexOf(" \u2013 "); // en-dash with spaces
  if (idx === -1) return null;
  const name = t.slice(0, idx).trim();
  const desc = t.slice(idx + 3).trim();
  if (!desc) return null;
  const nameWords = name.split(/\s+/).length;
  if (nameWords > 5 || !/^[A-Z]/.test(name)) return null;
  // Only activate for lines that are too long to be caught by isHeading
  if (t.split(/\s+/).length <= 8) return null;
  return { name, description: desc };
}

export function JobSpecText({ text }: { text: string }) {
  const lines = text.split("\n").filter(l => l.trim());

  return (
    <div>
      {lines.map((line, i) => {
        const t = line.trim();

        // First line = job title — rendered larger and bold
        if (i === 0) {
          return (
            <p key={i} className="text-base font-bold text-foreground mb-3">
              {t}
            </p>
          );
        }

        // Section / sub-section headings
        if (isHeading(t)) {
          return (
            <p key={i} className="text-sm font-bold text-foreground mt-4 mb-1">
              {t}
            </p>
          );
        }

        // "Name – description" items (behaviour values, section sub-titles)
        const dashItem = parseDashItem(t);
        if (dashItem) {
          return (
            <p key={i} className="text-sm leading-relaxed mt-1">
              <span className="font-semibold text-foreground">{dashItem.name}</span>
              <span className="text-muted-foreground">{" \u2013 "}{dashItem.description}</span>
            </p>
          );
        }

        // Bullet points
        if (t.startsWith("•")) {
          return (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 mt-0.5">
              {t}
            </p>
          );
        }

        // Body text
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed mt-1">
            {t}
          </p>
        );
      })}
    </div>
  );
}
