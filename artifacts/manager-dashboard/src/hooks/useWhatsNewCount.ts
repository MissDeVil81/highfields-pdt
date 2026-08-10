import { useQuery } from "@tanstack/react-query";
import { useManagerStore } from "./useManagerStore";

export function useWhatsNewCount(): number {
  const { manager } = useManagerStore();

  const { data = [] } = useQuery<any[]>({
    queryKey: ["whats-new", manager?.id],
    queryFn: async () => {
      if (!manager) return [];
      const res = await fetch(`/api/manager-ld/whats-new?managerId=${manager.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!manager,
    refetchInterval: 60_000,
  });

  return data.length;
}
