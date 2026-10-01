export type ClassStrength = {
  id: string
  className: string
  section: string
  students: number
}

export type SchoolReport = {
  students: number
  feeCollected: number
  septemberCollected: number
  septemberBilled: number
  openLoans: number
  visitorsInside: number
  strength: ClassStrength[]
}
