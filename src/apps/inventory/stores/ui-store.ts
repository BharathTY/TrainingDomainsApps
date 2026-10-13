import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/apps/inventory/config/permissions"

type UiState = {
  role: Role
  theme: "light" | "dark"
  setRole: (role: Role) => void
  toggleTheme: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "admin",
      theme: "light",
      setRole: (role) => set({ role }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "ims-ui" },
  ),
)
