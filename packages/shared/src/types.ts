// Core domain types shared across RN and web.

export interface Branch {
  _id: number
  BranchCode: string
  BranchName: string
  PhysicalBranch: 0 | 1
  Address: string
  PostalCode: string
  Website: string
  Telephone: string
  SquareFootage: string
  PublicParking: string | number
  KidsStop: 0 | 1
  LeadingReading: 0 | 1
  CLC: 0 | 1
  DIH: 0 | 1
  TeenCouncil: 0 | 1
  YouthHub: 0 | 1
  AdultLiteracyProgram: 0 | 1
  Workstations: number
  ServiceTier: string
  Lat: string
  Long: string
  NBHDNo: number
  NBHDName: string
  TPLNIA: 0 | 1
  WardNo: number
  WardName: string
  PresentSiteYear: number
  District: string
}

export interface Route {
  id: string
  name: string
  mode: string
  area: string
  duration: string
  description: string
  branches: string[] // BranchCodes
}

export interface CheckIn {
  branchCode: string
  timestamp: string // ISO string
  note: string
  hasPhoto?: boolean
  photoUri?: string // local file:// path (anonymous) or R2 https:// URL (authenticated)
}

export interface Profile {
  name: string
  homeBranch: string
  theme: 'light' | 'dark' | ''
  bypassLocationFence: boolean
  hasSeenOnboarding: boolean
}
