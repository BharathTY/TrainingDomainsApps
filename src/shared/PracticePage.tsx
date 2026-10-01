import { appPath } from "@/shared/lib/active-app"

export type PracticeRow = {
  feature: string
  screen: string
  level: 1 | 2 | 3 | 4
  exercise: string
}

function screenHref(screen: string) {
  if (screen.startsWith("/")) return screen
  return appPath(screen)
}

export function PracticePage({ title, rows }: { title: string; rows: PracticeRow[] }) {
  return (
    <main className="mx-auto grid max-w-5xl gap-4 p-6" data-testid="practice-page">
      <h1 className="text-xl font-semibold">{title}</h1>
      <table data-testid="practice-table" className="w-full border-collapse text-sm">
        <caption className="mb-2 text-left text-muted-foreground">Automation exercises</caption>
        <thead>
          <tr>
            <th scope="col" className="border-b border-border px-2 py-2 text-left">Feature</th>
            <th scope="col" className="border-b border-border px-2 py-2 text-left">Screen</th>
            <th scope="col" className="border-b border-border px-2 py-2 text-left">Locator level</th>
            <th scope="col" className="border-b border-border px-2 py-2 text-left">What to automate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.feature}-${row.screen}`}>
              <td className="border-b border-border px-2 py-2">{row.feature}</td>
              <td className="border-b border-border px-2 py-2">
                <a href={screenHref(row.screen)}>{row.screen}</a>
              </td>
              <td className="border-b border-border px-2 py-2">{row.level}</td>
              <td className="border-b border-border px-2 py-2">{row.exercise}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
