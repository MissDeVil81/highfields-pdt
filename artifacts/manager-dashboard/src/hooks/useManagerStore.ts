import { useState, useEffect } from "react";

export interface ManagerIdentity {
  id: number;
  name: string;
}

const STORAGE_KEY = "manager_identity";

export function useManagerStore() {
  const [manager, setManagerState] = useState<ManagerIdentity | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setManager = (identity: ManagerIdentity) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setManagerState(identity);
  };

  const clearManager = () => {
    localStorage.removeItem(STORAGE_KEY);
    setManagerState(null);
  };

  return { manager, setManager, clearManager };
}
