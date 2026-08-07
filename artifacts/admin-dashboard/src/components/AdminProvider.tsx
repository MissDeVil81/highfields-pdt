import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AdminContextType = {
  adminUserId: number | null;
  setAdminUserId: (id: number | null) => void;
  viewAsUserId: number | null;
  setViewAsUserId: (id: number | null) => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminUserId, setAdminUserId] = useState<number | null>(() => {
    const saved = localStorage.getItem('adminUserId');
    return saved ? parseInt(saved, 10) : null;
  });

  const [viewAsUserId, setViewAsUserId] = useState<number | null>(null);

  useEffect(() => {
    if (adminUserId !== null) {
      localStorage.setItem('adminUserId', adminUserId.toString());
    } else {
      localStorage.removeItem('adminUserId');
    }
  }, [adminUserId]);

  return (
    <AdminContext.Provider value={{ adminUserId, setAdminUserId, viewAsUserId, setViewAsUserId }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}
