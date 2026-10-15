import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/erp/config/permissions"

type UiState = {
  role: Role
  theme: "light" | "dark"
  sidebarCollapsed: boolean
  organizationId: string
  setRole: (role: Role) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setOrganizationId: (id: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "sysadmin",
      theme: "light",
      sidebarCollapsed: false,
      organizationId: "org-qspiders",
      setRole: (role) => set({ role }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setOrganizationId: (organizationId) => set({ organizationId }),
    }),
    { name: "erp-ui" },
  ),
)
