import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface UserWithToken extends User {
  idToken?: string; // Add idToken
}

interface AuthState {
  user: UserWithToken | null; // Use extended type
  setUser: (user: UserWithToken | null) => void; // Use extended type
  getToken: () => string | undefined; // Helper to get token
  isAuthenticated: boolean;
  visualsLoaded: boolean;
  setVisualsLoaded: (loaded: boolean) => void;
  parsedComponentOne: string;
  parsedComponentTwo: string;
  setParsedComponent: (value: string) => void;
  setParsedComponentTwo: (value: string) => void;
  metrics: Record<string, string>;
  setMetrics: (metrics: Record<string, string>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ // Add get
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      getToken: () => get().user?.idToken, // Implement getToken
      visualsLoaded: false, // Initialize to false, don't persist this
      setVisualsLoaded: (loaded) => set({ visualsLoaded: loaded }),
      parsedComponentOne: "loading...",
      parsedComponentTwo: "loading...",
      setParsedComponent: (parsedComponentOne) => set({ parsedComponentOne }),
      setParsedComponentTwo: (parsedComponentTwo) => set({ parsedComponentTwo }),
      metrics: {},
      setMetrics: (metrics) => set({ metrics }),
    }),
    {
      name: 'auth-storage',
      // Only persist user, not transient state like visualsLoaded
      partialize: (state) => ({ user: state.user }),
    }
  )
);