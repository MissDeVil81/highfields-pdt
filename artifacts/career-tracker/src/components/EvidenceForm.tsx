import {
  useCreateEvidence,
  useUpdateEvidence,
  getListEvidenceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RatingPicker } from "@/components/RatingButton";
import { Check, X } from "lucide-react";

type Rating = "red" | "amber" | "green";

export interface EvidenceFormProps {
  userId: number;
  competencyId: number;
  roleId: number;
  onClose: () => void;
  existing?: { id: number; title: string; description: string; rating: string };
}

export function EvidenceForm({ userId, competencyId, roleId, onClose, existing }: EvidenceFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [rating, setRating] = useState<Rating | null>((existing?.rating as Rating) ?? null);

  const create = useCreateEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() });
        onClose();
      },
    },
  });
  const update = useUpdateEvidence({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() });
        onClose();
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !rating) return;
    if (existing) {
      update.mutate({ id: existing.id, data: { title: title.trim(), description: description.trim(), rating } });
    } else {
      create.mutate({ data: { userId, competencyId, roleId, title: title.trim(), description: description.trim(), rating } });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-muted/50 rounded-lg border border-border space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Evidence Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What did you do?"
          required
          className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the situation, your actions and the outcome..."
          required
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground block mb-1">How well does this evidence demonstrate readiness?</label>
        <RatingPicker value={rating} onChange={setRating} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || !description.trim() || !rating || isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Check className="h-3.5 w-3.5" />
          {existing ? "Save Changes" : "Add Evidence"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </form>
  );
}