import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadAccounts, maskAccountNo } from "@/apps/banking/features/api"
import { useUiStore } from "@/apps/banking/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { Modal } from "@/shared/Modal"
import { openAppPopup } from "@/shared/popup"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"
import { toast } from "sonner"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

export function AccountsPage() {
  const mask = useUiStore((s) => s.maskAccounts)
  const setMask = useUiStore((s) => s.setMaskAccounts)
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [nickOpen, setNickOpen] = useState(false)
  const [nickname, setNickname] = useState("")
  const [confirmFav, setConfirmFav] = useState(false)

  const query = useQuery({
    queryKey: ["banking", "accounts", q, type, status, favoriteOnly],
    queryFn: () =>
      loadAccounts({
        q,
        type: type === "all" ? undefined : type,
        status: status === "all" ? undefined : status,
        favorite: favoriteOnly ? "true" : undefined,
        pageSize: 50,
      }),
  })

  const selected = useMemo(() => query.data?.data.find((a) => a.id === selectedId), [query.data, selectedId])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Accounts"
        description="Savings, current, salary, and fixed deposit accounts with status indicators."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="account-select" className="sr-only">
              Jump to account
            </Label>
            <Select value={selectedId || undefined} onValueChange={setSelectedId}>
              <SelectTrigger id="account-select" className="w-[220px]" data-testid="account-select">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(query.data?.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nickname || a.accountType} · {maskAccountNo(a.accountNo, true)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" data-testid="toggle-mask" onClick={() => setMask(!mask)}>
              {mask ? "Show account numbers" : "Mask account numbers"}
            </Button>
          </div>
        }
      />

      <form
        className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
        data-testid="accounts-filters"
      >
        <div className="grid gap-1">
          <Label htmlFor="accounts-search">Search</Label>
          <Input
            id="accounts-search"
            name="accounts-search"
            type="search"
            placeholder="Nickname or number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="accounts-type">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="accounts-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="fixed_deposit">Fixed deposit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="accounts-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="accounts-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="favorites-only"
            checked={favoriteOnly}
            onChange={(e) => setFavoriteOnly(e.target.checked)}
            data-testid="favorites-only"
          />
          Favorites only
        </label>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="accounts-table">
          <caption className="sr-only">Customer bank accounts</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">
                Account
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Type
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Balance
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Status
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link className="font-medium underline" to={appPath(`accounts/${a.id}`)}>
                    {a.nickname || "Account"}
                  </Link>
                  <div className="text-xs text-muted-foreground">{maskAccountNo(a.accountNo, mask)}</div>
                </td>
                <td className="px-3 py-2 capitalize">{a.accountType.replace("_", " ")}</td>
                <td className="px-3 py-2 text-right">{inr.format(a.balance)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      a.status === "active"
                        ? "text-emerald-700"
                        : a.status === "frozen"
                          ? "text-amber-700"
                          : "text-muted-foreground"
                    }
                  >
                    {a.status}
                  </span>
                  {a.isFavorite ? <span className="ml-2 text-xs">★</span> : null}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedId(a.id)
                        setNickname(a.nickname)
                        setNickOpen(true)
                      }}
                    >
                      Nickname
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedId(a.id)
                        setConfirmFav(true)
                      }}
                    >
                      {a.isFavorite ? "Unfavorite" : "Favorite"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openAppPopup(`accounts/${a.id}`, { name: "account-detail", width: 720, height: 640 })}
                    >
                      New window
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(query.data?.data.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No accounts match the filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <p className="text-sm text-muted-foreground" data-testid="selected-account-summary">
          Selected: {selected.nickname} · available {inr.format(selected.availableBalance)}
        </p>
      ) : null}

      <Modal open={nickOpen} title="Update nickname" onClose={() => setNickOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await api(`/api/accounts/${selectedId}`, {
                method: "PATCH",
                body: JSON.stringify({ nickname, isFavorite: selected?.isFavorite ?? false }),
              })
              toast.success("Nickname updated")
              setNickOpen(false)
              await queryClient.invalidateQueries({ queryKey: ["banking", "accounts"] })
            } catch (error) {
              toast.error(error instanceof ApiError ? error.message : "Update failed")
            }
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="account-nickname">Nickname</Label>
            <Input id="account-nickname" name="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </Modal>

      <ConfirmSheet
        open={confirmFav}
        onOpenChange={setConfirmFav}
        title={selected?.isFavorite ? "Remove favorite?" : "Mark as favorite?"}
        description="Favorites appear first on the accounts list and dashboard."
        confirmLabel="Confirm"
        onConfirm={async () => {
          await api(`/api/accounts/${selectedId}`, {
            method: "PATCH",
            body: JSON.stringify({ isFavorite: !selected?.isFavorite }),
          })
          toast.success("Favorite updated")
          await queryClient.invalidateQueries({ queryKey: ["banking", "accounts"] })
        }}
      />
    </div>
  )
}
