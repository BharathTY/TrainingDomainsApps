import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadLookups } from "@/apps/banking/features/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { Modal } from "@/shared/Modal"
import { ReauthModal } from "@/shared/ReauthModal"
import { Tabs } from "@/shared/Tabs"
import { openAppPopup } from "@/shared/popup"
import { ApiError, api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

type Preview = {
  amount: number
  toLabel: string
  availableBalance: number
  requiresReauth: boolean
  dailyLimit: number
  transferType: string
}

type Receipt = {
  id: string
  transferRef: string
  status: string
  amount: number
  fromAccount: string
  toLabel: string
  remarks: string
  completedAt: string | null
  scheduledFor: string | null
}

export function TransfersPage() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const lookups = useQuery({ queryKey: ["banking", "lookups"], queryFn: loadLookups })
  const history = useQuery({
    queryKey: ["banking", "transfers"],
    queryFn: () =>
      api<{
        data: {
          id: string
          transferRef: string
          amount: number
          status: string
          fromNickname: string
          toLabel: string
          createdAt: string
        }[]
      }>("/api/transfers?pageSize=20"),
  })

  const [mode, setMode] = useState<"own" | "beneficiary">("own")
  const [fromAccountId, setFromAccountId] = useState(params.get("from") ?? "")
  const [toAccountId, setToAccountId] = useState("")
  const [beneficiaryId, setBeneficiaryId] = useState("")
  const [amount, setAmount] = useState("")
  const [remarks, setRemarks] = useState("")
  const [frequency, setFrequency] = useState("once")
  const [scheduledFor, setScheduledFor] = useState("")
  const [simulate, setSimulate] = useState("none")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [pickBenOpen, setPickBenOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [idempotencyKey] = useState(() => `TRF${Date.now().toString(36).toUpperCase()}`)

  useEffect(() => {
    if (!fromAccountId && lookups.data?.accounts[0]) setFromAccountId(lookups.data.accounts[0].id)
  }, [lookups.data, fromAccountId])

  const source = useMemo(
    () => lookups.data?.accounts.find((a) => a.id === fromAccountId),
    [lookups.data, fromAccountId],
  )

  const previewMutation = useMutation({
    mutationFn: () =>
      api<Preview>("/api/transfers/preview", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          toAccountId: mode === "own" ? toAccountId : undefined,
          beneficiaryId: mode === "beneficiary" ? beneficiaryId : undefined,
          amount: Number(amount),
          remarks,
          frequency,
          scheduledFor: scheduledFor || undefined,
          transferType: mode === "own" ? "own" : "external",
        }),
      }),
    onSuccess: (data) => {
      setPreview(data)
      setConfirmOpen(true)
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Validation failed"),
  })

  async function submitTransfer(reauthConfirmed = false) {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await api<Receipt>("/api/transfers", {
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          fromAccountId,
          toAccountId: mode === "own" ? toAccountId : undefined,
          beneficiaryId: mode === "beneficiary" ? beneficiaryId : undefined,
          amount: Number(amount),
          remarks,
          frequency,
          scheduledFor: scheduledFor || undefined,
          transferType: mode === "own" ? "own" : "external",
          reauthConfirmed,
          simulate: simulate === "none" ? undefined : simulate,
          idempotencyKey,
        }),
      })
      setConfirmOpen(false)
      setReauthOpen(false)
      setReceipt(result)
      toast.success(result.status === "completed" ? "Transfer completed" : "Transfer scheduled")
      await queryClient.invalidateQueries({ queryKey: ["banking"] })
    } catch (error) {
      if (error instanceof ApiError && error.message.includes("Re-authentication")) {
        setConfirmOpen(false)
        setReauthOpen(true)
        return
      }
      toast.error(error instanceof ApiError ? error.message : "Transfer failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Fund transfers"
        description="Own-account, same-bank, and external beneficiary transfers with review and re-auth."
      />

      <Tabs
        tabs={[
          {
            id: "new",
            label: "New transfer",
            content: (
              <form
                className="grid gap-3 md:grid-cols-2"
                data-testid="transfer-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  previewMutation.mutate()
                }}
              >
                <fieldset className="md:col-span-2 grid gap-2 rounded border border-border p-3">
                  <legend className="px-1 text-sm font-medium">Transfer type</legend>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="transfer-mode"
                        value="own"
                        checked={mode === "own"}
                        onChange={() => setMode("own")}
                      />
                      Between my accounts
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="transfer-mode"
                        value="beneficiary"
                        checked={mode === "beneficiary"}
                        onChange={() => setMode("beneficiary")}
                      />
                      To a beneficiary
                    </label>
                  </div>
                </fieldset>

                <div className="grid gap-1">
                  <Label htmlFor="from-account">From account</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger id="from-account" data-testid="from-account">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {(lookups.data?.accounts ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nickname || a.accountType} · {inr.format(a.availableBalance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {source ? (
                    <p className="text-xs text-muted-foreground">
                      Available: {inr.format(source.availableBalance)} · Daily limit ₹1,00,000
                    </p>
                  ) : null}
                </div>

                {mode === "own" ? (
                  <div className="grid gap-1">
                    <Label htmlFor="to-account">To account</Label>
                    <Select value={toAccountId} onValueChange={setToAccountId}>
                      <SelectTrigger id="to-account" data-testid="to-account">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {(lookups.data?.ownAccounts ?? [])
                          .filter((a) => a.id !== fromAccountId)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nickname || a.accountType}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <Label htmlFor="beneficiary">Beneficiary</Label>
                    <div className="flex gap-2">
                      <Select value={beneficiaryId} onValueChange={setBeneficiaryId}>
                        <SelectTrigger id="beneficiary" data-testid="beneficiary" className="flex-1">
                          <SelectValue placeholder="Select beneficiary" />
                        </SelectTrigger>
                        <SelectContent>
                          {(lookups.data?.beneficiaries ?? []).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.nickname || b.name} · {b.bankType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => setPickBenOpen(true)}>
                        Pick…
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-1">
                  <Label htmlFor="transfer-amount">Amount (INR)</Label>
                  <Input
                    id="transfer-amount"
                    name="amount"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="transfer-amount"
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="transfer-frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger id="transfer-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="transfer-when">Schedule (optional)</Label>
                  <Input
                    id="transfer-when"
                    name="scheduledFor"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    data-testid="transfer-when"
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="simulate-outcome">Training outcome</Label>
                  <Select value={simulate} onValueChange={setSimulate}>
                    <SelectTrigger id="simulate-outcome">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal success</SelectItem>
                      <SelectItem value="fail">Simulate failure</SelectItem>
                      <SelectItem value="timeout">Simulate timeout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1 md:col-span-2">
                  <Label htmlFor="transfer-remarks">Remarks</Label>
                  <Textarea
                    id="transfer-remarks"
                    name="remarks"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Payment for…"
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit" data-testid="review-transfer" disabled={previewMutation.isPending}>
                    Review transfer
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to={appPath("beneficiaries")}>Manage beneficiaries</Link>
                  </Button>
                </div>
              </form>
            ),
          },
          {
            id: "history",
            label: "Transfer history",
            content: (
              <ul className="space-y-2 text-sm" data-testid="transfer-history">
                {(history.data?.data ?? []).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2">
                    <span>
                      <span className="font-medium">{t.transferRef}</span> · {inr.format(t.amount)} · {t.status}
                      <span className="block text-xs text-muted-foreground">
                        {t.fromNickname} → {t.toLabel}
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openAppPopup(`transfers/receipt/${t.id}`, { name: "receipt", width: 520, height: 640 })}
                    >
                      Receipt
                    </Button>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />

      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm transfer"
        description={
          preview
            ? `Send ${inr.format(preview.amount)} to ${preview.toLabel}? Available after transfer: ${inr.format(preview.availableBalance - preview.amount)}.`
            : "Review details"
        }
        confirmLabel={submitting ? "Submitting…" : "Confirm & pay"}
        onConfirm={async () => {
          if (preview?.requiresReauth) {
            setConfirmOpen(false)
            setReauthOpen(true)
            return
          }
          await submitTransfer(false)
        }}
      />

      <ReauthModal
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSubmit={() => {
          void submitTransfer(true)
        }}
      />

      <Modal open={Boolean(receipt)} title="Transfer receipt" onClose={() => setReceipt(null)}>
        {receipt ? (
          <div className="grid gap-2 text-sm" data-testid="transfer-receipt">
            <p>
              <strong>Reference:</strong> {receipt.transferRef}
            </p>
            <p>
              <strong>Status:</strong> {receipt.status}
            </p>
            <p>
              <strong>Amount:</strong> {inr.format(receipt.amount)}
            </p>
            <p>
              <strong>From:</strong> {receipt.fromAccount}
            </p>
            <p>
              <strong>To:</strong> {receipt.toLabel}
            </p>
            <p>
              <strong>Remarks:</strong> {receipt.remarks || "—"}
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" onClick={() => window.print()}>
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openAppPopup(`transfers/receipt/${receipt.id}`, { name: "receipt-window", width: 520, height: 640 })}
              >
                Open window
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={pickBenOpen} title="Select beneficiary" onClose={() => setPickBenOpen(false)}>
        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
          {(lookups.data?.beneficiaries ?? []).map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  setBeneficiaryId(b.id)
                  setPickBenOpen(false)
                }}
              >
                {b.name} · {b.bankName} · {b.accountNo}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
