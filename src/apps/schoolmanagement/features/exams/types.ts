export type GradeBand = {
  id: string
  grade: string
  min: number
  max: number
}

export type Exam = {
  id: string
  name: string
  className: string
  term: string
  startDate: string
  endDate: string
  deletedAt: string | null
}

export type ExamPaper = {
  id: string
  examId: string
  subjectId: string
  subjectName: string
  date: string
  startTime: string
  durationMinutes: number
  maxMarks: number
  deletedAt: string | null
}

export type ExamMark = {
  id: string
  examId: string
  paperId: string
  studentId: string
  score: number | null
}

export type MarkCell = {
  paperId: string
  score: number | null
  grade: string
}

export type MarkRow = {
  studentId: string
  name: string
  admissionNo: string
  cells: MarkCell[]
}

export type MarksGrid = {
  examId: string
  className: string
  section: string
  papers: Pick<ExamPaper, "id" | "subjectName" | "maxMarks">[]
  scheme: GradeBand[]
  rows: MarkRow[]
}

export type ReportRow = {
  subject: string
  date: string
  score: number | null
  max: number
  percent: number | null
  grade: string
}

export type ReportCard = {
  school: string
  examId: string
  examName: string
  term: string
  studentId: string
  name: string
  admissionNo: string
  className: string
  section: string
  rows: ReportRow[]
  total: number
  totalMax: number
  percent: number | null
  grade: string
}

export const SCHOOL_NAME = "QSpiders School"
