import { NavLink } from "react-router-dom"
import { visibleModules } from "@/apps/hospital/config/permissions"
import { useUiStore } from "@/apps/hospital/stores/ui-store"
import { appPath, useApp } from "@/shared/lib/app-context"
import { cn } from "@/shared/lib/utils"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const role = useUiStore((state) => state.role)
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const app = useApp()
  const modules = visibleModules(role)
  const groups = [...new Set(modules.map((module) => module.group))]

  return (
    <aside className={cn("flex h-full flex-col border-r border-border bg-card", collapsed ? "w-14" : "w-56")} aria-label="Module navigation">
      <div className={cn("flex h-12 items-center px-3", collapsed && "justify-center px-0")}>
        <span data-testid="app-logo" className="grid size-7 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: app.themeColor }}>
          M
        </span>
        {collapsed ? null : <span className="ml-2 truncate text-sm font-semibold tracking-tight">MediCare HMS</span>}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group}>
            {collapsed ? null : <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group}</p>}
            <div className="space-y-0.5">
              {modules
                .filter((module) => module.group === group)
                .map((module) => (
                  <NavLink
                    key={module.id}
                    to={appPath(module.path)}
                    end
                    title={module.label}
                    data-testid={`nav-${module.id}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn("flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent", collapsed && "justify-center px-0", isActive && "bg-accent font-medium")
                    }
                  >
                    <span className="grid size-4 place-items-center text-[10px] font-semibold text-muted-foreground">{module.label.slice(0, 1)}</span>
                    {collapsed ? null : <span className="truncate">{module.label}</span>}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
