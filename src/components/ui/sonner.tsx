import { Toaster as Sonner } from "sonner"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function Toaster() {
  const theme = useUiStore((state) => state.theme)
  return <Sonner theme={theme} richColors closeButton position="bottom-right" />
}
