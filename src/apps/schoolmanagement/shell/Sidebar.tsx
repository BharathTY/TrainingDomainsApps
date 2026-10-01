import { NavLink } from "react-router-dom"
import { moduleIcons } from "@/apps/schoolmanagement/shell/icons"
import { visibleModules } from "@/apps/schoolmanagement/config/permissions"
import { appPath, useApp } from "@/shared/lib/app-context"
import { cn } from "@/shared/lib/utils"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useUiStore((state) => state.role)
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const permissionVersion = useUiStore((state) => state.permissionVersion)
  const app = useApp()
  const modules = visibleModules(role)
  void permissionVersion
  const groups = [...new Set(modules.map((module) => module.group))]

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-12 items-center px-3", collapsed && "justify-center px-0")}>
        <span
          data-testid="app-logo"
          className="grid size-7 place-items-center rounded-md text-xs font-semibold text-white"
          style={{ background: app.themeColor }}
        >
          {app.name.slice(0, 1)}
        </span>
        {collapsed ? null : <span className="ml-2 truncate text-sm font-semibold tracking-tight">{app.name}</span>}
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group}>
            {collapsed ? null : <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group}</p>}
            <div className="space-y-0.5">
              {modules
                .filter((module) => module.group === group)
                .map((module) => {
                  const Icon = moduleIcons[module.id]
                  return (
                    <NavLink
                      key={module.id}
                      to={appPath(module.path)}
                      end
                      title={module.label}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
                          collapsed && "justify-center px-0",
                          isActive && "bg-sidebar-accent font-medium text-foreground",
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      {collapsed ? null : <span className="truncate">{module.label}</span>}
                    </NavLink>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
