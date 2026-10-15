import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { loadBeneficiaries } from "@/apps/banking/features/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { FormDrawer } from "@/shared/FormDrawer"
import { ApiError, api } from "@/shared/lib/api-client"

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  accountNo: z.string().regex(/^\d{9,18}$/, "9–18 digit account number"),
  bankName: z.string().min(2, "Bank name is required"),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, "Invalid IFSC"),
  bankType: z.enum(["same_bank", "other_bank"]),
  nickname: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function BeneficiariesPage() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [initial, setInitial] = useState<Partial<FormValues>>({})

  const query = useQuery({
    queryKey: ["banking", "beneficiaries", q],
    queryFn: () => loadBeneficiaries({ q, pageSize: 50 }),
  })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader
        title="Beneficiaries"
        description="Add, edit, favorite, and delete payees for transfers."
        actions={
          <Button
            type="button"
            data-testid="add-beneficiary"
            onClick={() => {
              setEditingId(null)
              setInitial({ bankType: "same_bank", nickname: "" })
              setDrawerOpen(true)
            }}
          >
            Add beneficiary
          </Button>
        }
      />

      <div className="grid gap-1 max-w-sm">
        <Label htmlFor="ben-search">Search</Label>
        <Input
          id="ben-search"
          type="search"
          placeholder="Name or account number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="ben-search"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" data-testid="beneficiaries-table">
          <caption className="sr-only">Saved beneficiaries</caption>
          <thead>
            <tr className="bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left">Name</th>
              <th scope="col" className="px-3 py-2 text-left">Account</th>
              <th scope="col" className="px-3 py-2 text-left">Bank</th>
              <th scope="col" className="px-3 py-2 text-left">Type</th>
              <th scope="col" className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.data ?? []).map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {b.nickname || b.name} {b.isFavorite ? "★" : ""}
                  <div className="text-xs text-muted-foreground">{b.name}</div>
                </td>
                <td className="px-3 py-2">{b.accountNo}</td>
                <td className="px-3 py-2">
                  {b.bankName}
                  <div className="text-xs text-muted-foreground">{b.ifsc}</div>
                </td>
                <td className="px-3 py-2">{b.bankType === "same_bank" ? "Same bank" : "Other bank"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(b.id)
                        setInitial({
                          name: b.name,
                          accountNo: b.accountNo,
                          bankName: b.bankName,
                          ifsc: b.ifsc,
                          bankType: b.bankType as "same_bank" | "other_bank",
                          nickname: b.nickname,
                        })
                        setDrawerOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api(`/api/beneficiaries/${b.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ isFavorite: !b.isFavorite, name: b.name }),
                        })
                        toast.success(b.isFavorite ? "Removed from favorites" : "Marked favorite")
                        await queryClient.invalidateQueries({ queryKey: ["banking", "beneficiaries"] })
                      }}
                    >
                      {b.isFavorite ? "Unfavorite" : "Favorite"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(b.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(query.data?.data.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No beneficiaries found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <FormDrawer<FormValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editingId ? "Edit beneficiary" : "Add beneficiary"}
        schema={schema}
        defaultValues={initial}
        fields={[
          { name: "name", label: "Beneficiary name", type: "text" },
          { name: "accountNo", label: "Account number", type: "text" },
          { name: "bankName", label: "Bank name", type: "text" },
          { name: "ifsc", label: "IFSC", type: "text" },
          {
            name: "bankType",
            label: "Bank type",
            type: "select",
            options: [
              { value: "same_bank", label: "Same bank" },
              { value: "other_bank", label: "Other bank" },
            ],
          },
          { name: "nickname", label: "Nickname", type: "text" },
        ]}
        onSubmit={async (values) => {
          try {
            if (editingId) {
              await api(`/api/beneficiaries/${editingId}`, {
                method: "PATCH",
                body: JSON.stringify({ ...values, ifsc: values.ifsc.toUpperCase() }),
              })
              toast.success("Beneficiary updated")
            } else {
              await api("/api/beneficiaries", {
                method: "POST",
                body: JSON.stringify({ ...values, ifsc: values.ifsc.toUpperCase() }),
              })
              toast.success("Beneficiary added")
            }
            setDrawerOpen(false)
            await queryClient.invalidateQueries({ queryKey: ["banking"] })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Save failed")
            throw error
          }
        }}
      />

      <ConfirmSheet
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete beneficiary?"
        description="This removes the payee from your list. Existing scheduled payments may fail."
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          await api(`/api/beneficiaries/${deleteId}`, { method: "DELETE" })
          toast.success("Beneficiary deleted")
          setDeleteId(null)
          await queryClient.invalidateQueries({ queryKey: ["banking"] })
        }}
      />

      {/* Hidden select keeps multi-control practice for IFSC banks */}
      <div className="sr-only">
        <Label htmlFor="ifsc-suggest">IFSC suggestions</Label>
        <Select>
          <SelectTrigger id="ifsc-suggest">
            <SelectValue placeholder="IFSC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEMO0001001">DEMO0001001</SelectItem>
            <SelectItem value="HORZ0002211">HORZ0002211</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
