import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardState } from '../types';

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      components: [],
      setComponents: (components) => set({ components }),
    }),
    {
      name: 'dashboard-storage',
    }
  )
);