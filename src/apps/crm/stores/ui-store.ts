import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/crm/config/permissions"

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
      role: "salesrep",
      theme: "light",
      sidebarCollapsed: false,
      setRole: (role) => set({ role }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "crm-ui" },
  ),
)
