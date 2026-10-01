import { useState, type ReactNode } from "react"

export function Tabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: ReactNode }[]
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "")
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]
  return (
    <div data-testid="tabs">
      <div role="tablist" className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            data-testid={`tab-${tab.id}`}
            aria-selected={tab.id === current?.id}
            className="h-8 px-2 text-sm"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" data-testid="tab-panel" className="py-3 text-sm">
        {current?.content}
      </div>
    </div>
  )
}
