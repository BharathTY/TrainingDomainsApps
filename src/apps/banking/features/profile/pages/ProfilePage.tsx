import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/banking/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { Tabs } from "@/shared/Tabs"
import { ApiError, api } from "@/shared/lib/api-client"

export function ProfilePage() {
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: ["banking", "profile"],
    queryFn: () =>
      api<{
        user: { username: string; role: string; name: string }
        customer: { fullName: string; customerNo: string; email: string; phone: string; address: string; branchName: string } | null
        settings: {
          dateFormat: string
          timeFormat: string
          notifyEmail: boolean
          notifySms: boolean
          notifyPush: boolean
          phoneMasked: string
          emailMasked: string
        } | null
        loginActivity: { id: string; ip: string; userAgent: string; success: boolean; createdAt: string }[]
      }>("/api/profile"),
  })

  const [address, setAddress] = useState("")
  const [dateFormat, setDateFormat] = useState("dd-MMM-yyyy")
  const [timeFormat, setTimeFormat] = useState("hh:mm a")
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifySms, setNotifySms] = useState(true)
  const [notifyPush, setNotifyPush] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmSave, setConfirmSave] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!profile.data) return
    setAddress(profile.data.customer?.address ?? "")
    setDateFormat(profile.data.settings?.dateFormat ?? "dd-MMM-yyyy")
    setTimeFormat(profile.data.settings?.timeFormat ?? "hh:mm a")
    setNotifyEmail(profile.data.settings?.notifyEmail ?? true)
    setNotifySms(profile.data.settings?.notifySms ?? true)
    setNotifyPush(profile.data.settings?.notifyPush ?? false)
  }, [profile.data])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title="Profile & settings" description="Masked contact details, notification preferences, and login activity." />

      <Tabs
        tabs={[
          {
            id: "details",
            label: "Details",
            content: (
              <div className="grid gap-3 text-sm" data-testid="profile-details">
                <p>
                  <strong>{profile.data?.customer?.fullName ?? profile.data?.user.name}</strong>
                  {profile.data?.customer?.customerNo ? ` · ${profile.data.customer.customerNo}` : null}
                </p>
                <p>Email (masked): {profile.data?.settings?.emailMasked ?? "—"}</p>
                <p>Phone (masked): {profile.data?.settings?.phoneMasked ?? "—"}</p>
                <p>Branch: {profile.data?.customer?.branchName ?? "—"}</p>
                <div className="grid gap-1">
                  <Label htmlFor="profile-address">Address</Label>
                  <Input
                    id="profile-address"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      setDirty(true)
                    }}
                  />
                </div>
                <Button type="button" onClick={() => setConfirmSave(true)}>
                  Save details
                </Button>
              </div>
            ),
          },
          {
            id: "security",
            label: "Security",
            content: (
              <form
                className="grid gap-3 max-w-sm"
                data-testid="change-password-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    await api("/api/profile/change-password", {
                      method: "POST",
                      body: JSON.stringify({ currentPassword, newPassword }),
                    })
                    toast.success("Password updated")
                    setCurrentPassword("")
                    setNewPassword("")
                  } catch (error) {
                    toast.error(error instanceof ApiError ? error.message : "Could not change password")
                  }
                }}
              >
                <div className="grid gap-1">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button type="submit">Change password</Button>
              </form>
            ),
          },
          {
            id: "preferences",
            label: "Preferences",
            content: (
              <form
                className="grid gap-3 max-w-md"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setConfirmSave(true)
                }}
              >
                <div className="grid gap-1">
                  <Label htmlFor="date-format">Date format</Label>
                  <Select
                    value={dateFormat}
                    onValueChange={(v) => {
                      setDateFormat(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger id="date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-MMM-yyyy">dd-MMM-yyyy</SelectItem>
                      <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="time-format">Time format</Label>
                  <Select
                    value={timeFormat}
                    onValueChange={(v) => {
                      setTimeFormat(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger id="time-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hh:mm a">12-hour</SelectItem>
                      <SelectItem value="HH:mm">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <fieldset className="grid gap-2 rounded border border-border p-3">
                  <legend className="px-1 text-sm">Notifications</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notifyEmail} onChange={(e) => { setNotifyEmail(e.target.checked); setDirty(true) }} />
                    Email alerts
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notifySms} onChange={(e) => { setNotifySms(e.target.checked); setDirty(true) }} />
                    SMS alerts
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notifyPush} onChange={(e) => { setNotifyPush(e.target.checked); setDirty(true) }} />
                    Push notifications
                  </label>
                </fieldset>
                <Button type="submit">Save preferences</Button>
              </form>
            ),
          },
          {
            id: "activity",
            label: "Login activity",
            content: (
              <ul className="space-y-2 text-sm" data-testid="login-activity">
                {(profile.data?.loginActivity ?? []).map((row) => (
                  <li key={row.id} className="border-b border-border py-1">
                    {new Date(row.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {row.ip} ·{" "}
                    {row.success ? "Success" : "Failed"}
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />

      <ConfirmSheet
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Save profile changes?"
        description="Your address and notification preferences will be updated."
        confirmLabel="Save"
        onConfirm={async () => {
          await api("/api/profile", {
            method: "PATCH",
            body: JSON.stringify({ address, dateFormat, timeFormat, notifyEmail, notifySms, notifyPush }),
          })
          toast.success("Profile updated")
          setDirty(false)
          await queryClient.invalidateQueries({ queryKey: ["banking", "profile"] })
        }}
      />
    </div>
  )
}
