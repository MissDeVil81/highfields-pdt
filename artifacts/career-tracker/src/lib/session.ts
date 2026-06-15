import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  currentRoleId: number | null;
  targetRoleId: number | null;
  careerPathId: number | null;
  targetCareerPathId: number | null;
  setUser: (id: number, name: string, email: string) => void;
  clearUser: () => void;
  setCurrentRoleId: (id: number | null) => void;
  setTargetRoleId: (id: number | null) => void;
  setCareerPathId: (id: number | null) => void;
  setTargetCareerPathId: (id: number | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      userEmail: null,
      currentRoleId: null,
      targetRoleId: null,
      careerPathId: null,
      targetCareerPathId: null,
      setUser: (id, name, email) => set({ userId: id, userName: name, userEmail: email }),
      clearUser: () => set({ userId: null, userName: null, userEmail: null, currentRoleId: null, targetRoleId: null, careerPathId: null, targetCareerPathId: null }),
      setCurrentRoleId: (id) => set({ currentRoleId: id }),
      setTargetRoleId: (id) => set({ targetRoleId: id }),
      setCareerPathId: (id) => set({ careerPathId: id }),
      setTargetCareerPathId: (id) => set({ targetCareerPathId: id }),
      reset: () => set({ currentRoleId: null, targetRoleId: null, careerPathId: null, targetCareerPathId: null }),
    }),
    {
      name: 'career-tracker-session',
    }
  )
);
