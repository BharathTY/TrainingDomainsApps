export type HostelRoom = {
  id: string
  block: string
  number: string
  capacity: number
  occupied: number
}

export type HostelStay = {
  id: string
  roomId: string
  roomLabel: string
  studentId: string
  studentName: string
  since: string
}
