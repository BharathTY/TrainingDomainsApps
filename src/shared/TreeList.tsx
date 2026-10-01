import { ChevronRight } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { cn } from "@/shared/lib/utils"

export type TreeNode = {
  id: string
  label: string
  badge?: string
  avatar?: string
  children?: TreeNode[]
}

function groupIds(nodes: TreeNode[], openFirstOnly: boolean): string[] {
  if (!openFirstOnly) {
    return nodes.flatMap((node) => (node.children?.length ? [node.id, ...groupIds(node.children, false)] : []))
  }
  const first = nodes[0]
  if (!first?.children?.length) return []
  const month = first.children[0]
  return month ? [first.id, month.id] : [first.id]
}

export function TreeList({
  nodes,
  selectedId,
  onSelect,
  label,
}: {
  nodes: TreeNode[]
  selectedId?: string
  onSelect: (id: string) => void
  label: string
}) {
  const treeId = useId()
  const rootRef = useRef<{ node: HTMLUListElement | null }>({ node: null })
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || nodes.length === 0) return
    seeded.current = true
    const initial = groupIds(nodes, true)
    setExpanded(new Set(initial))
    setFocusId(initial[0] ?? nodes[0]?.id ?? null)
  }, [nodes])

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const items = [...(rootRef.current.node?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])]
    const index = items.findIndex((item) => item.dataset.nodeId === focusId)
    const current = items[index]
    if (!current) return
    const id = current.dataset.nodeId ?? ""
    const isGroup = current.dataset.group === "true"
    const open = current.getAttribute("aria-expanded") === "true"

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const next = items[event.key === "ArrowDown" ? index + 1 : index - 1]
      const nextId = next?.dataset.nodeId
      if (nextId) {
        setFocusId(nextId)
        next.focus()
      }
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      if (isGroup && !open) toggle(id)
      else {
        const child = current.querySelector<HTMLElement>('[role="group"] [role="treeitem"]')
        const childId = child?.dataset.nodeId
        if (childId) {
          setFocusId(childId)
          child.focus()
        }
      }
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      if (isGroup && open) toggle(id)
      else {
        const parent = current.parentElement?.closest<HTMLElement>('[role="treeitem"]')
        const parentId = parent?.dataset.nodeId
        if (parentId) {
          setFocusId(parentId)
          parent.focus()
        }
      }
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (isGroup) toggle(id)
      else onSelect(id)
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      const target = event.key === "Home" ? items[0] : items[items.length - 1]
      const targetId = target?.dataset.nodeId
      if (targetId) {
        setFocusId(targetId)
        target.focus()
      }
    }
  }

  return (
    <Branch
      nodes={nodes}
      level={1}
      label={label}
      treeId={treeId}
      rootRef={rootRef}
      expanded={expanded}
      focusId={focusId}
      selectedId={selectedId}
      onKeyDown={onKeyDown}
      onToggle={toggle}
      onSelect={onSelect}
      onFocus={setFocusId}
    />
  )
}

function Branch({
  nodes,
  level,
  label,
  treeId,
  rootRef,
  expanded,
  focusId,
  selectedId,
  onKeyDown,
  onToggle,
  onSelect,
  onFocus,
}: {
  nodes: TreeNode[]
  level: number
  label: string
  treeId: string
  rootRef: { readonly current: { node: HTMLUListElement | null } }
  expanded: Set<string>
  focusId: string | null
  selectedId?: string
  onKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onFocus: (id: string) => void
}) {
  const list = (
    <ul
      ref={
        level === 1
          ? (node) => {
              rootRef.current.node = node
            }
          : undefined
      }
      id={level === 1 ? treeId : undefined}
      role={level === 1 ? "tree" : "group"}
      aria-label={level === 1 ? label : undefined}
      onKeyDown={level === 1 ? onKeyDown : undefined}
      className={cn(level > 1 && "ml-3 border-l border-border")}
    >
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length)
        const open = hasChildren && expanded.has(node.id)
        const selected = node.id === selectedId
        return (
          <li
            key={node.id}
            role="treeitem"
            data-node-id={node.id}
            data-group={hasChildren ? "true" : "false"}
            aria-level={level}
            aria-expanded={hasChildren ? open : undefined}
            aria-selected={hasChildren ? undefined : selected}
            tabIndex={focusId === node.id ? 0 : -1}
            className="outline-none"
            onFocus={() => onFocus(node.id)}
            onClick={(event) => {
              event.stopPropagation()
              event.currentTarget.focus()
              onFocus(node.id)
              if (hasChildren) onToggle(node.id)
              else onSelect(node.id)
            }}
          >
            <span
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-[13px]",
                selected ? "bg-primary-soft font-medium text-primary" : "hover:bg-primary-soft",
              )}
            >
              {hasChildren ? (
                <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
              ) : (
                <span className="grid size-5 shrink-0 place-items-center rounded-[4px] bg-primary text-[11px] font-medium text-primary-foreground">
                  {node.avatar}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{node.label}</span>
              {node.badge ? (
                <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">{node.badge}</span>
              ) : null}
            </span>
            {open && node.children ? (
              <Branch
                nodes={node.children}
                level={level + 1}
                label={label}
                treeId={treeId}
                rootRef={rootRef}
                expanded={expanded}
                focusId={focusId}
                selectedId={selectedId}
                onKeyDown={onKeyDown}
                onToggle={onToggle}
                onSelect={onSelect}
                onFocus={onFocus}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
  return list
}
