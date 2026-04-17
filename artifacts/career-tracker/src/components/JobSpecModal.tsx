import { useEffect } from "react";
import { X, FileText } from "lucide-react";

interface JobSpecModalProps {
  title: string;
  jobSpec: string;
  onClose: () => void;
}

export function JobSpecModal({ title, jobSpec, onClose }: JobSpecModalProps) {
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
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
        <div className="overflow-y-auto px-6 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{jobSpec}</p>
        </div>
      </div>
    </div>
  );
}
