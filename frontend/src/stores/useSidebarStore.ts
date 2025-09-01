// ABOUTME: Sidebar state management for collapse/expand functionality
// ABOUTME: Persists sidebar state across sessions

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      
      toggleSidebar: () => set((state) => ({
        isCollapsed: !state.isCollapsed
      })),
      
      setSidebarCollapsed: (collapsed) => set({
        isCollapsed: collapsed
      })
    }),
    {
      name: 'sidebar-storage'
    }
  )
)