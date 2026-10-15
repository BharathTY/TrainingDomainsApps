import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROLE_LABEL, type Role, visibleModules } from "@/apps/assets/config/permissions"
import { Sidebar } from "@/apps/assets/shell/Sidebar"
import { useUiStore } from "@/apps/assets/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AppTopNav } from "@/shared/AppTopNav"
import { appPath } from "@/shared/lib/app-context"
import { api } from "@/shared/lib/api-client"
import { fetchSession, logout, sessionKeys } from "@/shared/lib/session"

export function Topbar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useUiStore((state) => state.role)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const [mobileNav, setMobileNav] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })
  const notifications = useQuery({
    queryKey: ["assets", "notifications"],
    queryFn: () => api<{ id: string }[]>("/api/notifications"),
  })
  const items = visibleModules(role as Role).map((module) => ({
    id: module.id,
    label: module.label,
    href: appPath(module.path),
    group: module.group,
  }))
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
  }, [items, query])

  return (
    <>
      <AppTopNav
        brand="Asset EAM"
        logoLetter="A"
        homeHref={appPath("dashboard")}
        roleLabel={ROLE_LABEL[role as Role] ?? role}
        userName={session.data?.name}
        items={items}
        unread={notifications.data?.length ?? 0}
        onLogout={() => {
          void logout().finally(() => {
            queryClient.removeQueries({ queryKey: sessionKeys.current })
            navigate(appPath("login"), { replace: true })
          })
        }}
        onSearch={() => {
          setQuery("")
          setSearchOpen(true)
        }}
        onToggleTheme={() => {
          toggleTheme()
          document.documentElement.classList.toggle("dark")
        }}
        onOpenNavigation={() => setMobileNav(true)}
        onCollapseSidebar={toggleSidebar}
      />
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Asset EAM modules</SheetDescription>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="right" className="w-[min(100%,24rem)]" data-testid="module-search-sheet">
          <SheetHeader>
            <SheetTitle>Search modules</SheetTitle>
            <SheetDescription>Jump to a module by name.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="module-search">Module</Label>
              <Input
                id="module-search"
                name="module-search"
                type="search"
                autoFocus
                placeholder="e.g. Assignments"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ul className="space-y-1" role="listbox" aria-label="Matching modules">
              {matches.length === 0 ? (
                <li className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">No modules matched.</li>
              ) : (
                matches.map((item) => (
                  <li key={item.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start px-3 py-2"
                      onClick={() => {
                        setSearchOpen(false)
                        navigate(item.href)
                      }}
                    >
                      <span className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.group}</span>
                      </span>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
