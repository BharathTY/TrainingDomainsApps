import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"

export type TopNavItem = {
  id: string
  label: string
  href: string
  group?: string
}

const INLINE_LINK_COUNT = 8

export function AppTopNav({
  brand,
  logoLetter,
  homeHref,
  roleLabel,
  userName,
  items,
  onLogout,
  onSearch,
  onToggleTheme,
  onOpenNavigation,
  onCollapseSidebar,
  unread,
}: {
  brand: string
  logoLetter: string
  homeHref: string
  roleLabel: string
  userName?: string
  items: TopNavItem[]
  onLogout: () => void
  onSearch: () => void
  onToggleTheme: () => void
  onOpenNavigation: () => void
  onCollapseSidebar: () => void
  unread: number
}) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const roleMenuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDetailsElement>(null)
  const active = items.find((item) => pathname === item.href)
  const rest = items.filter((item) => item.id !== active?.id)
  const inline = rest.slice(0, INLINE_LINK_COUNT)
  const overflow = rest.slice(INLINE_LINK_COUNT)

  useEffect(() => {
    function closeMore() {
      if (moreRef.current) moreRef.current.open = false
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (roleMenuRef.current && !roleMenuRef.current.contains(target)) setMenuOpen(false)
      if (moreRef.current && !moreRef.current.contains(target)) closeMore()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      setMenuOpen(false)
      closeMore()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function choose(action: () => void) {
    return () => {
      setMenuOpen(false)
      if (moreRef.current) moreRef.current.open = false
      action()
    }
  }

  return (
    <header className="bg-primary text-primary-foreground" data-print-hide>
      <nav aria-label="Primary" className="flex h-14 items-center gap-2 px-3">
        <Link to={homeHref} className="flex shrink-0 items-center gap-2">
          <span data-testid="app-logo" className="grid size-7 place-items-center rounded-[6px] bg-white text-xs font-semibold text-primary">
            {logoLetter}
          </span>
          <span className="sr-only">{brand}</span>
        </Link>
        <div className="relative" ref={roleMenuRef}>
          <button
            type="button"
            className="flex h-8 items-center gap-1 rounded-full px-2 text-[13px] font-medium hover:bg-white/10"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => {
              if (moreRef.current) moreRef.current.open = false
              setMenuOpen((open) => !open)
            }}
          >
            {roleLabel} ▾
          </button>
          {menuOpen ? (
            <div role="menu" className="absolute left-0 top-9 z-50 w-52 rounded-[6px] border border-border bg-card p-1 text-foreground shadow-md">
              <p className="px-2 py-1.5 text-[13px] font-medium">{userName ?? roleLabel}</p>
              <button type="button" role="menuitem" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft" onClick={choose(onLogout)}>
                Log out
              </button>
              <button type="button" role="menuitem" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft" onClick={choose(onSearch)}>
                Search
              </button>
              <button type="button" role="menuitem" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft" onClick={choose(onToggleTheme)}>
                Toggle theme
              </button>
              <button type="button" role="menuitem" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft" onClick={choose(onOpenNavigation)}>
                Open navigation
              </button>
            </div>
          ) : null}
        </div>
        {active ? (
          <Link
            to={active.href}
            aria-current="page"
            className="shrink-0 rounded-full bg-white px-3 py-1 text-[13px] font-medium text-primary"
          >
            {active.label}
          </Link>
        ) : null}
        <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {inline.map((item) => (
            <Link key={item.id} to={item.href} className="shrink-0 px-2 py-1 text-[13px] text-white hover:underline">
              {item.label}
            </Link>
          ))}
        </div>
        <details
          ref={moreRef}
          className="relative ml-auto"
          onToggle={(event) => {
            if (event.currentTarget.open) setMenuOpen(false)
          }}
        >
          <summary
            aria-label="More modules"
            className="grid size-8 cursor-pointer list-none place-items-center rounded-full text-lg hover:bg-white/10 [&::-webkit-details-marker]:hidden"
          >
            ⋮
          </summary>
          <div className="absolute right-0 top-9 z-50 max-h-80 w-52 overflow-y-auto rounded-[6px] border border-border bg-card p-1 text-foreground shadow-md">
            {overflow.map((item) => (
              <Link key={item.id} to={item.href} className="block rounded-[6px] px-2 py-1.5 text-[13px] hover:bg-primary-soft" onClick={choose(() => undefined)}>
                {item.label}
              </Link>
            ))}
            <button type="button" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft" onClick={choose(onCollapseSidebar)}>
              Collapse sidebar
            </button>
            <button
              type="button"
              className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] hover:bg-primary-soft"
              aria-label={`Notifications, ${unread} unread`}
              onClick={choose(onOpenNavigation)}
            >
              Notifications
            </button>
          </div>
        </details>
        <div className="sr-only">
          <button type="button" onClick={onLogout}>
            Log out
          </button>
          <button type="button" onClick={onSearch}>
            Search
          </button>
          <button type="button" aria-label="Toggle theme" onClick={onToggleTheme}>
            Toggle theme
          </button>
          <button type="button" aria-label={`Notifications, ${unread} unread`}>
            Notifications
          </button>
          <button type="button" aria-label="Open navigation" onClick={onOpenNavigation}>
            Open navigation
          </button>
          <button type="button" aria-label="Collapse sidebar" onClick={onCollapseSidebar}>
            Collapse sidebar
          </button>
          <span>Ctrl K</span>
        </div>
      </nav>
    </header>
  )
}
