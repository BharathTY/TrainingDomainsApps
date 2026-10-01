export type BusRoute = {
  id: string
  name: string
  vehicle: string
  driver: string
  stop: string
  departure: string
}

export type RouteAssignment = {
  id: string
  routeId: string
  routeName: string
  studentId: string
  studentName: string
  stop: string
}
