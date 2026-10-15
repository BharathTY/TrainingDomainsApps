import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/retail/config/permissions"

type UiState = {
  role: Role
  theme: "light" | "dark"
  sidebarCollapsed: boolean
  storeId: string
  setRole: (role: Role) => void
  setStoreId: (storeId: string) => void
  toggleTheme: () => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "admin",
      theme: "light",
      sidebarCollapsed: false,
      storeId: "store-1",
      setRole: (role) => set({ role }),
      setStoreId: (storeId) => set({ storeId }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: "rms-ui" },
  ),
)
