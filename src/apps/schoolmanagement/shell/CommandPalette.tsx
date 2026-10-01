import { Command } from "cmdk"
import { useNavigate } from "react-router-dom"
import { moduleIcons } from "@/apps/schoolmanagement/shell/icons"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { visibleModules } from "@/apps/schoolmanagement/config/permissions"
import { appPath } from "@/shared/lib/app-context"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function CommandPalette() {
  const open = useUiStore((state) => state.commandOpen)
  const setOpen = useUiStore((state) => state.setCommandOpen)
  const role = useUiStore((state) => state.role)
  const navigate = useNavigate()
  const modules = visibleModules(role)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search modules</DialogTitle>
        <DialogDescription className="sr-only">Jump to a module you can open.</DialogDescription>
        <Command className="[&_[cmdk-input]]:h-10 [&_[cmdk-input]]:w-full [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-3 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:outline-none [&_[cmdk-item]]:flex [&_[cmdk-item]]:cursor-pointer [&_[cmdk-item]]:items-center [&_[cmdk-item]]:gap-2 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:text-sm [&_[cmdk-item][data-selected=true]]:bg-accent">
          <Command.Input placeholder="Search modules…" />
          <Command.List className="max-h-80 overflow-y-auto border-t border-border p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">No matching module.</Command.Empty>
            <Command.Group>
              {modules.map((module) => {
                const Icon = moduleIcons[module.id]
                return (
                  <Command.Item
                    key={module.id}
                    value={module.label}
                    onSelect={() => {
                      navigate(appPath(module.path))
                      setOpen(false)
                    }}
                  >
                    <Icon className="size-4" />
                    {module.label}
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
