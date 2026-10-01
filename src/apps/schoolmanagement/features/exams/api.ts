import type { Role } from "@/apps/schoolmanagement/config/permissions"
import type { ExamValues, GradingValues, MarkValues, PaperValues } from "@/apps/schoolmanagement/features/exams/schemas"
import type { Exam, ExamPaper, GradeBand, MarksGrid, ReportCard } from "@/apps/schoolmanagement/features/exams/types"
import type { Section } from "@/apps/schoolmanagement/features/students/types"
import { api } from "@/shared/lib/api-client"

export const examKeys = {
  all: ["exams"] as const,
  papers: (examId: string) => ["exams", examId, "papers"] as const,
  marks: (examId: string, section: string) => ["exams", examId, "marks", section] as const,
  report: (examId: string, studentId: string) => ["exams", examId, "report", studentId] as const,
  ownReport: (role: Role, examId: string) => ["exams", examId, "report", role] as const,
  grading: ["exams", "grading"] as const,
}

export function listExams() {
  return api<Exam[]>("/api/exams")
}

export function createExam(values: ExamValues) {
  return api<Exam>("/api/exams", { method: "POST", body: JSON.stringify(values) })
}

export function updateExam(id: string, values: ExamValues) {
  return api<Exam>(`/api/exams/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function archiveExams(ids: string[]) {
  return api<{ ids: string[] }>("/api/exams/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restoreExams(ids: string[]) {
  return api<{ ids: string[] }>("/api/exams/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function listPapers(examId: string) {
  return api<ExamPaper[]>(`/api/exams/${examId}/papers`)
}

export function createPaper(examId: string, values: PaperValues) {
  return api<ExamPaper>(`/api/exams/${examId}/papers`, { method: "POST", body: JSON.stringify(values) })
}

export function updatePaper(id: string, values: PaperValues) {
  return api<ExamPaper>(`/api/exam-papers/${id}`, { method: "PATCH", body: JSON.stringify(values) })
}

export function archivePapers(ids: string[]) {
  return api<{ ids: string[] }>("/api/exam-papers/archive", { method: "POST", body: JSON.stringify({ ids }) })
}

export function restorePapers(ids: string[]) {
  return api<{ ids: string[] }>("/api/exam-papers/restore", { method: "POST", body: JSON.stringify({ ids }) })
}

export function fetchMarks(examId: string, section: Section) {
  return api<MarksGrid>(`/api/exams/${examId}/marks?section=${section}`)
}

export function saveMark(examId: string, values: MarkValues) {
  return api<{ score: number | null; percent: number | null; grade: string }>(`/api/exams/${examId}/marks`, {
    method: "PATCH",
    body: JSON.stringify(values),
  })
}

export function fetchReport(examId: string, studentId: string) {
  return api<ReportCard>(`/api/exams/${examId}/report?studentId=${studentId}`)
}

export function fetchOwnReport(examId: string, role: Role) {
  return api<ReportCard>(`/api/exams/${examId}/report?role=${role}`)
}

export function fetchGrading() {
  return api<GradeBand[]>("/api/grading")
}

export function saveGrading(values: GradingValues) {
  return api<GradeBand[]>("/api/grading", { method: "PUT", body: JSON.stringify(values) })
}
