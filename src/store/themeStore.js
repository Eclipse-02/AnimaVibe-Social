import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'system',

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'animavibe-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
