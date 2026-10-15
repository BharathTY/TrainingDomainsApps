import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"
import { ROLES, type Role } from "@/apps/banking/config/permissions"
import { DEMO_USERS } from "@/apps/banking/demo-users"
import { useUiStore } from "@/apps/banking/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Modal } from "@/shared/Modal"
import { appPath, useApp } from "@/shared/lib/app-context"
import { ApiError } from "@/shared/lib/api-client"
import { fetchSession, login, sessionKeys } from "@/shared/lib/session"

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter a username"),
  password: z.string().min(1, "Enter a password"),
  remember: z.boolean().optional(),
})

function safeReturn(base: string, value: string | null) {
  if (!value || !value.startsWith(`${base}/`) || value.startsWith(`${base}/login`)) return appPath("dashboard")
  return value
}

export function LoginPage() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const setRole = useUiStore((state) => state.setRole)
  const session = useQuery({ queryKey: sessionKeys.current, queryFn: fetchSession, retry: false })
  const [formError, setFormError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [forgotUser, setForgotUser] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const destination = safeReturn(app.basePath, new URLSearchParams(location.search).get("returnUrl"))

  const remembered = localStorage.getItem("banking-remember-user") ?? ""
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: remembered, password: "", remember: Boolean(remembered) },
  })

  if (session.isLoading) return <p className="p-6 text-sm text-muted-foreground">Checking session…</p>
  if (session.data) return <Navigate to={appPath("dashboard")} replace />

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="flex items-center gap-3">
        <span
          data-testid="app-logo"
          className="grid size-10 place-items-center rounded-md text-sm font-semibold text-white"
          style={{ background: app.themeColor }}
        >
          B
        </span>
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo National Bank</p>
          <h1 className="text-xl font-semibold">Internet banking sign in</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Synthetic training login. Session is stored in an HTTP-only cookie.</p>

      <form
        data-testid="login-form"
        className="grid gap-3 rounded-lg border border-border p-4"
        onSubmit={form.handleSubmit(async (values) => {
          setFormError("")
          try {
            const user = await login({ username: values.username, password: values.password })
            if (ROLES.includes(user.role as Role)) setRole(user.role as Role)
            if (values.remember) localStorage.setItem("banking-remember-user", values.username)
            else localStorage.removeItem("banking-remember-user")
            queryClient.setQueryData(sessionKeys.current, user)
            navigate(destination, { replace: true })
          } catch (error) {
            setFormError(error instanceof ApiError ? error.message : "Invalid credentials")
          }
        })}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="username">
            Username <span>*</span>
          </Label>
          <Input id="username" data-testid="login-username" autoComplete="username" {...form.register("username")} />
          {form.formState.errors.username ? (
            <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">
            Password <span>*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="password"
              data-testid="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="flex-1"
              {...form.register("password")}
            />
            <Button type="button" variant="outline" data-testid="toggle-password" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
          {form.formState.errors.password ? (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" data-testid="remember-me" {...form.register("remember")} />
          Remember me
        </label>
        {formError ? (
          <p className="text-sm text-destructive" role="alert" data-testid="login-error">
            {formError}
          </p>
        ) : null}
        <Button type="submit" data-testid="login-submit" disabled={form.formState.isSubmitting}>
          Login
        </Button>
        <div className="flex flex-wrap gap-3 text-sm">
          <button type="button" className="underline" data-testid="forgot-password" onClick={() => setForgotOpen(true)}>
            Forgot password
          </button>
          <button type="button" className="underline" data-testid="reset-password-link" onClick={() => setResetOpen(true)}>
            Reset password
          </button>
        </div>
      </form>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">Demo accounts</h2>
        <ul className="grid gap-1">
          {DEMO_USERS.map((user) => (
            <li key={user.username}>
              <button
                type="button"
                data-testid={`demo-account-${user.username}`}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  form.setValue("username", user.username, { shouldValidate: true })
                  form.setValue("password", user.password, { shouldValidate: true })
                }}
              >
                <span>
                  <span className="block font-medium">{user.name}</span>
                  <span className="text-muted-foreground">{user.role}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {user.username} · {user.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={forgotOpen} title="Forgot password" onClose={() => setForgotOpen(false)}>
        <form
          className="grid gap-3"
          data-testid="forgot-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!forgotUser.trim()) return
            window.alert(`Password reset link sent to the demo inbox for ${forgotUser} (simulated). Use token DEMO123 on Reset password.`)
            setForgotOpen(false)
            setResetOpen(true)
            setResetToken("DEMO123")
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="forgot-username">Username</Label>
            <Input id="forgot-username" value={forgotUser} onChange={(e) => setForgotUser(e.target.value)} required />
          </div>
          <Button type="submit">Send reset link</Button>
        </form>
      </Modal>

      <Modal open={resetOpen} title="Reset password" onClose={() => setResetOpen(false)}>
        <form
          className="grid gap-3"
          data-testid="reset-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (resetToken !== "DEMO123") {
              window.alert("Invalid reset token. Use DEMO123.")
              return
            }
            if (newPassword.length < 6) {
              window.alert("Password must be at least 6 characters.")
              return
            }
            window.alert("Password reset simulated. Sign in with your original demo password (seed passwords are restored on data reset).")
            setResetOpen(false)
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="reset-token">Reset token</Label>
            <Input id="reset-token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="reset-new-password">New password</Label>
            <Input
              id="reset-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Reset password</Button>
        </form>
      </Modal>
    </main>
  )
}
