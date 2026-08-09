import { useState } from "react";

export interface LdIdentity {
  id: number;
  name: string;
}

const STORAGE_KEY = "ld_identity";

export function useLdStore() {
  const [ldUser, setLdState] = useState<LdIdentity | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setLdUser = (identity: LdIdentity) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setLdState(identity);
  };

  const clearLdUser = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLdState(null);
  };

  return { ldUser, setLdUser, clearLdUser };
}
