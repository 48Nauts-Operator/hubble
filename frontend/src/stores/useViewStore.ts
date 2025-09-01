// ABOUTME: View mode store for managing list/card view preference
// ABOUTME: Persists user's view preference across sessions

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'card' | 'list'

interface ViewState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      viewMode: 'card',
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      toggleViewMode: () => set((state) => ({
        viewMode: state.viewMode === 'card' ? 'list' : 'card'
      }))
    }),
    {
      name: 'view-storage'
    }
  )
)