import { useEffect } from "react";
import { X, FileText, Download, ExternalLink } from "lucide-react";

interface JobSpecModalProps {
  title: string;
  fileUrl: string;
  onClose: () => void;
}

export function JobSpecModal({ title, fileUrl, onClose }: JobSpecModalProps) {
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
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Job Specification</div>
            <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted flex-shrink-0 mt-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{title} — Job Specification</p>
              <p className="text-xs text-muted-foreground mt-0.5">Word Document (.docx)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
            <a
              href={fileUrl}
              download
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-muted text-foreground text-sm font-medium px-4 py-2.5 hover:bg-muted/80 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
