import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  visualsLoaded: boolean;
  setVisualsLoaded: (loaded: boolean) => void;
  parsedComponentOne: string; // Add
  parsedComponentTwo: string; // Add
  setParsedComponent: (value: string) => void; // Add
  setParsedComponentTwo: (value: string) => void; // Add
  metrics: Record<string, string>; // { [label]: value }
  setMetrics: (metrics: Record<string, string>) => void;
  
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      visualsLoaded: JSON.parse(localStorage.getItem('visualsLoaded') || 'false'),
      setVisualsLoaded: (loaded) => {
        localStorage.setItem('visualsLoaded', JSON.stringify(loaded));
        set({ visualsLoaded: loaded });
      },
      parsedComponentOne: "loading...",
      parsedComponentTwo: "loading...",
      setParsedComponent: (parsedComponentOne) => set({ parsedComponentOne }),
      setParsedComponentTwo: (parsedComponentTwo) => set({ parsedComponentTwo }),
      metrics: {},
      setMetrics: (metrics) => set({ metrics }),
    }),
    {
      name: 'auth-storage',
    }
  )
);