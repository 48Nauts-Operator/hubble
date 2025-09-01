import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      
      toggleTheme: () => set((state) => {
        const newIsDarkMode = !state.isDarkMode
        // Update document class for Tailwind
        if (newIsDarkMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { isDarkMode: newIsDarkMode }
      }),
      
      setTheme: (isDark) => set(() => {
        // Update document class for Tailwind
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { isDarkMode: isDark }
      })
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme to document on rehydration
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    }
  )
)