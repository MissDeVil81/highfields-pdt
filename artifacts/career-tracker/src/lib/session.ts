import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  // sessionId is now the Clerk userId — set by ClerkTokenSync after sign-in
  sessionId: string;
  currentRoleId: number | null;
  targetRoleId: number | null;
  careerPathId: number | null;
  setSessionId: (id: string) => void;
  setCurrentRoleId: (id: number | null) => void;
  setTargetRoleId: (id: number | null) => void;
  setCareerPathId: (id: number | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: "",
      currentRoleId: null,
      targetRoleId: null,
      careerPathId: null,
      setSessionId: (id) => set({ sessionId: id }),
      setCurrentRoleId: (id) => set({ currentRoleId: id }),
      setTargetRoleId: (id) => set({ targetRoleId: id }),
      setCareerPathId: (id) => set({ careerPathId: id }),
      reset: () => set({ currentRoleId: null, targetRoleId: null, careerPathId: null }),
    }),
    {
      name: 'career-tracker-session',
    }
  )
);
