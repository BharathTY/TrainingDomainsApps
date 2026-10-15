import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROLE_LABEL, type Role, visibleModules } from "@/apps/crm/config/permissions"
import { Sidebar } from "@/apps/crm/shell/Sidebar"
import { useUiStore } from "@/apps/crm/stores/ui-store"
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
    queryKey: ["crm", "notifications"],
    queryFn: () => api<{ id: string }[]>("/api/notifications"),
  })
  const globalSearch = useQuery({
    queryKey: ["crm", "search", query],
    queryFn: () =>
      api<{
        leads: { id: string; leadNo: string; firstName: string; lastName: string }[]
        contacts: { id: string; contactNo: string; fullName: string }[]
        opportunities: { id: string; opportunityNo: string; name: string }[]
      }>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2 && searchOpen,
  })
  const items = visibleModules(role as Role).map((module) => ({
    id: module.id,
    label: module.label,
    href: appPath(module.path),
    group: module.group,
  }))
  const moduleMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))
  }, [items, query])

  return (
    <>
      <AppTopNav
        brand="Pulse CRM"
        logoLetter="C"
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
            <SheetDescription>CRM modules</SheetDescription>
          </SheetHeader>
          <Sidebar onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="right" className="w-[min(100%,24rem)]" data-testid="global-search-sheet">
          <SheetHeader>
            <SheetTitle>Global search</SheetTitle>
            <SheetDescription>Find modules, leads, contacts, and opportunities.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="crm-search">Search</Label>
              <Input
                id="crm-search"
                name="crm-search"
                type="search"
                autoFocus
                placeholder="e.g. Acme or Vikram"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Modules</p>
            <ul className="space-y-1">
              {moduleMatches.map((item) => (
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
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
            {query.trim().length >= 2 ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">Records</p>
                <ul className="space-y-1 text-sm">
                  {(globalSearch.data?.leads ?? []).map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSearchOpen(false)
                          navigate(appPath(`leads/${l.id}`))
                        }}
                      >
                        Lead {l.leadNo}: {l.firstName} {l.lastName}
                      </button>
                    </li>
                  ))}
                  {(globalSearch.data?.contacts ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSearchOpen(false)
                          navigate(appPath(`contacts/${c.id}`))
                        }}
                      >
                        Contact {c.contactNo}: {c.fullName}
                      </button>
                    </li>
                  ))}
                  {(globalSearch.data?.opportunities ?? []).map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSearchOpen(false)
                          navigate(appPath("pipeline"))
                        }}
                      >
                        Opp {o.opportunityNo}: {o.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
