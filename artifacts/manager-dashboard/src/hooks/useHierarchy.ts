import { useQuery } from "@tanstack/react-query";
import { useManagerStore } from "./useManagerStore";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type HierarchyMember = {
  id: number;
  name: string;
  jobTitle: string | null;
  department: string | null;
};

export function useHierarchy() {
  const { manager } = useManagerStore();

  return useQuery<HierarchyMember[]>({
    queryKey: ["hierarchy", manager?.id, manager?.role],
    queryFn: async () => {
      if (!manager) return [];
      const res = await fetch(
        `${BASE}/api/manager-ld/hierarchy?managerId=${manager.id}&role=${manager.role}`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!manager,
    staleTime: 5 * 60 * 1000,
  });
}
