import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/schoolmanagement/config/permissions"

export type ThemeMode = "light" | "dark"

type UiState = {
  role: Role
  theme: ThemeMode
  sidebarCollapsed: boolean
  commandOpen: boolean
  permissionVersion: number
  setRole: (role: Role) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandOpen: (open: boolean) => void
  bumpPermissions: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "admin",
      theme: "light",
      sidebarCollapsed: false,
      commandOpen: false,
      permissionVersion: 0,
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      bumpPermissions: () => set((state) => ({ permissionVersion: state.permissionVersion + 1 })),
    }),
    {
      name: "sms-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
)
