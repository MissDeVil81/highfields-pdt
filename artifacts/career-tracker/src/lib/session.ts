import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface SessionState {
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
      sessionId: uuidv4(),
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
