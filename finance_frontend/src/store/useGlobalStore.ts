import { create } from 'zustand';

interface GlobalState {
  financialYear: string;
  setFinancialYear: (year: string) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  financialYear: "2026-2027",
  setFinancialYear: (year) => set({ financialYear: year }),
}));
