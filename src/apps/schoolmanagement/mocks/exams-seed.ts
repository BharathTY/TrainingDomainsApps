import type { SchoolSubject } from "@/apps/schoolmanagement/features/academics/types"
import type { Exam, ExamMark, ExamPaper, GradeBand } from "@/apps/schoolmanagement/features/exams/types"
import type { Student } from "@/apps/schoolmanagement/features/students/types"

const PAPERS = [
  { subjectId: "sub-1", date: "2026-10-10" },
  { subjectId: "sub-2", date: "2026-10-11" },
  { subjectId: "sub-3", date: "2026-10-12" },
  { subjectId: "sub-4", date: "2026-10-15" },
  { subjectId: "sub-5", date: "2026-10-16" },
] as const

export function defaultBands(): GradeBand[] {
  return [
    { id: "band-a1", grade: "A1", min: 91, max: 100 },
    { id: "band-a2", grade: "A2", min: 81, max: 90 },
    { id: "band-b1", grade: "B1", min: 71, max: 80 },
    { id: "band-b2", grade: "B2", min: 61, max: 70 },
    { id: "band-c1", grade: "C1", min: 51, max: 60 },
    { id: "band-c2", grade: "C2", min: 41, max: 50 },
    { id: "band-d", grade: "D", min: 33, max: 40 },
    { id: "band-e", grade: "E", min: 0, max: 32 },
  ]
}

export function createExamSeed(students: Student[], subjects: SchoolSubject[]) {
  const exam: Exam = {
    id: "exam-term1-6",
    name: "Term 1",
    className: "6",
    term: "Term 1",
    startDate: "2026-10-10",
    endDate: "2026-10-16",
    deletedAt: null,
  }
  const papers: ExamPaper[] = PAPERS.map((paper, index) => ({
    id: `paper-term1-${index + 1}`,
    examId: exam.id,
    subjectId: paper.subjectId,
    subjectName: subjects.find((subject) => subject.id === paper.subjectId)?.name ?? "Subject",
    date: paper.date,
    startTime: "09:00",
    durationMinutes: 180,
    maxMarks: 100,
    deletedAt: null,
  }))
  const roll = students.filter((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A")
  const marks: ExamMark[] = []
  roll.forEach((student, studentIndex) => {
    papers.forEach((paper, paperIndex) => {
      const blank = studentIndex === roll.length - 1 && paperIndex === papers.length - 1
      marks.push({
        id: `mark-${paper.id}-${studentIndex}`,
        examId: exam.id,
        paperId: paper.id,
        studentId: student.id,
        score: blank ? null : Math.min(100, 48 + ((studentIndex * 11 + paperIndex * 7) % 49)),
      })
    })
  })
  return { exams: [exam], papers, marks }
}
