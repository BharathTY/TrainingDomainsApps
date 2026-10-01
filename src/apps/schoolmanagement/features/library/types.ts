export type Book = {
  id: string
  title: string
  author: string
  copies: number
  available: number
}

export type Loan = {
  id: string
  bookId: string
  bookTitle: string
  studentId: string
  studentName: string
  issuedOn: string
  dueOn: string
  returnedOn: string | null
}
