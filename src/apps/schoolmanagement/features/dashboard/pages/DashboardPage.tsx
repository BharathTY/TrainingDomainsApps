import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { StatCard } from "@/apps/schoolmanagement/components/StatCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { moduleById, ROLE_LABEL } from "@/apps/schoolmanagement/config/permissions"
import { dashboardKeys, loadDashboard } from "@/apps/schoolmanagement/features/dashboard/api"
import { formatInr, percentOf } from "@/apps/schoolmanagement/features/dashboard/format"
import type { AnnouncementItem, AttendancePoint, ExamItem, FeeSnapshot, QuickAction } from "@/apps/schoolmanagement/features/dashboard/types"
import { moduleIcons } from "@/apps/schoolmanagement/shell/icons"
import { appPath } from "@/shared/lib/app-context"
import { tokens } from "@/apps/schoolmanagement/theme/tokens"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
}

export function DashboardPage() {
  const role = useUiStore((state) => state.role)
  const query = useQuery({ queryKey: dashboardKeys.role(role), queryFn: () => loadDashboard(role) })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Dashboard" description={query.data?.summary ?? `${ROLE_LABEL[role]} view. Widgets follow the signed-in role.`} />
      {query.isLoading ? <DashboardSkeleton /> : null}
      {query.isError ? (
        <EmptyState title="Dashboard unavailable" description="The snapshot could not be loaded." actionLabel="Retry" onAction={() => void query.refetch()} />
      ) : null}
      {query.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {query.data.stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
            ))}
          </div>
          <div className={query.data.fees ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
            <AttendanceChart title={query.data.attendanceTitle} points={query.data.attendance} />
            {query.data.fees ? <FeeChart fees={query.data.fees} /> : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <ExamList items={query.data.exams} />
            <AnnouncementList items={query.data.announcements} />
          </div>
          <QuickActions actions={query.data.actions} />
        </>
      ) : null}
    </div>
  )
}

function AttendanceChart({ title, points }: { title: string; points: AttendancePoint[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide domain={[70, 100]} />
            <Tooltip formatter={(value) => [`${Number(value)}%`, "Present"]} contentStyle={tooltipStyle} />
            <Bar dataKey="present" fill={tokens.color.chart[0]} radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function FeeChart({ fees }: { fees: FeeSnapshot }) {
  const ratio = percentOf(fees.collected, fees.target)
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{fees.title}</h2>
        <p className="text-xs text-muted-foreground">
          {formatInr(fees.collected)} of {formatInr(fees.target)} · {ratio}%
        </p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={fees.points}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis hide />
            <Tooltip formatter={(value, name) => [formatInr(Number(value)), name === "collected" ? "Collected" : "Target"]} contentStyle={tooltipStyle} />
            <Legend formatter={(value) => (value === "collected" ? "Collected" : "Target")} />
            <Bar dataKey="collected" fill={tokens.color.chart[0]} radius={4} />
            <Bar dataKey="target" fill={tokens.color.chart[1]} radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ExamList({ items }: { items: ExamItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Upcoming exams</h2>
      <ul className="divide-y divide-border">
        {items.map((exam) => (
          <li key={exam.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{exam.subject}</p>
              <p className="text-xs text-muted-foreground">{exam.detail}</p>
            </div>
            <p className="shrink-0 text-xs text-muted-foreground">{exam.when}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AnnouncementList({ items }: { items: AnnouncementItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Recent announcements</h2>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="shrink-0 text-xs text-muted-foreground">{item.postedOn}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = moduleIcons[action.moduleId]
          return (
            <Button key={action.moduleId} variant="outline" asChild>
              <Link to={appPath(moduleById(action.moduleId).path)}>
                <Icon className="size-4" />
                <span>{action.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{action.hint}</span>
              </Link>
            </Button>
          )
        })}
      </div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
