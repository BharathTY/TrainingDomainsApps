import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/hospital/config/permissions"

type UiState = {
  role: Role
  theme: "light" | "dark"
  sidebarCollapsed: boolean
  setRole: (role: Role) => void
  toggleTheme: () => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "admin",
      theme: "light",
      sidebarCollapsed: false,
      setRole: (role) => set({ role }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "hms-ui" },
  ),
)
