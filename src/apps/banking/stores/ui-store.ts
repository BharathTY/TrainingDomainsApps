import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/banking/config/permissions"

type UiState = {
  role: Role
  theme: "light" | "dark"
  sidebarCollapsed: boolean
  maskAccounts: boolean
  setRole: (role: Role) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setMaskAccounts: (mask: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "customer",
      theme: "light",
      sidebarCollapsed: false,
      maskAccounts: true,
      setRole: (role) => set({ role }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMaskAccounts: (maskAccounts) => set({ maskAccounts }),
    }),
    { name: "banking-ui" },
  ),
)
