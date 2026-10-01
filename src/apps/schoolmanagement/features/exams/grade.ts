import type { GradeBand } from "@/apps/schoolmanagement/features/exams/types"

export function percentOf(score: number, max: number) {
  if (max <= 0) return 0
  return Math.round((score / max) * 100)
}

export function gradeFor(percent: number, bands: GradeBand[]) {
  const match = [...bands].sort((left, right) => right.min - left.min).find((band) => percent >= band.min && percent <= band.max)
  return match?.grade ?? "—"
}

export function schemeError(bands: { grade: string; min: number; max: number }[]) {
  if (bands.length === 0) return "Add at least one band"
  for (const band of bands) {
    if (!band.grade.trim()) return "Each band needs a grade"
    if (band.min > band.max) return `${band.grade || "A band"} has a minimum above its maximum`
    if (band.min < 0 || band.max > 100) return "Bands stay between 0 and 100"
  }
  const sorted = [...bands].sort((left, right) => left.min - right.min)
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (previous && current && current.min <= previous.max) return "Bands overlap"
  }
  return null
}
