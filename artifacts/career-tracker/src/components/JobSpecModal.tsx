import { useEffect, useState } from "react";
import { X, Download, RefreshCw } from "lucide-react";

interface JobSpecModalProps {
  title: string;
  fileUrl: string;
  onClose: () => void;
}

export function JobSpecModal({ title, fileUrl, onClose }: JobSpecModalProps) {
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  const absoluteUrl = new URL(fileUrl, window.location.href).href;
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
        style={{ width: "min(860px, 95vw)", height: "min(700px, 90vh)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border flex-shrink-0">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium leading-none mb-0.5">Job Specification</div>
            <h2 className="text-sm font-bold text-foreground leading-tight">{title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={fileUrl}
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="relative flex-1 min-h-0">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading document…</p>
            </div>
          )}
          <iframe
            key={key}
            src={viewerUrl}
            className="w-full h-full rounded-b-2xl border-0"
            onLoad={() => setLoading(false)}
            title={`${title} Job Specification`}
          />
        </div>
      </div>
    </div>
  );
}
