import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/shared/lib/app-context"

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter a username"),
  password: z.string().min(1, "Enter a password"),
})

export type LoginAccount = {
  username: string
  password: string
  name: string
  role: string
}

export function LoginScreen({
  users,
  error,
  onSubmit,
}: {
  users: LoginAccount[]
  error: string
  onSubmit: (values: { username: string; password: string }) => Promise<void>
}) {
  const app = useApp()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-4">
      <div className="flex items-center gap-3">
        <span
          data-testid="app-logo"
          className="grid size-10 place-items-center rounded-md text-sm font-semibold text-white"
          style={{ background: app.themeColor }}
        >
          {app.name.slice(0, 1)}
        </span>
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{app.name}</p>
          <h1 className="text-xl font-semibold">Sign in</h1>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Use a demo account. The session is kept in an HTTP-only cookie.</p>
      <form
        data-testid="login-form"
        className="grid gap-3 rounded-lg border border-border p-4"
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
        })}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="username">
            Username <span>*</span>
          </Label>
          <Input id="username" data-testid="login-username" autoComplete="username" {...form.register("username")} />
          {form.formState.errors.username ? <p className="text-xs text-destructive">{form.formState.errors.username.message}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">
            Password <span>*</span>
          </Label>
          <Input id="password" data-testid="login-password" type="password" autoComplete="current-password" {...form.register("password")} />
          {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert" data-testid="login-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" data-testid="login-submit" disabled={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">Demo accounts</h2>
        <ul className="grid gap-1">
          {users.map((user) => (
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
    </main>
  )
}
