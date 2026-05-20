export type UserRole = 'SUPER_ADMIN' | 'CTE_ADMIN' | 'PRINCIPAL' | 'DATA_ENTRY' | 'AUDITOR' | 'EMPLOYEE';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  institutionId?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  fatherName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  community: string;
  subCaste?: string;
  religion: string;
  phCategory: string;
  phPercentage?: string;
  maritalStatus?: string;
  nativePlace?: string;
  nativeDistrict?: string;
  mobile: string;
  email: string;
  qualification: string;
  designation: string;
  branch: string;
  institutionId: string;
  biometricId: string;
  workingSince: string;
  againstPostDetails?: string;
  payScale: string;
  aictePayLevel?: string;
  basicPay: number;
  incrementDate?: string;
  initialAppointmentPost?: string;
  initialJoiningDate?: string;
  regularizationDate?: string;
  superannuationDate?: string;
  contractServiceDetails?: string;
  contractPeriod?: string;
  localCadre?: string;
  cadreChoiceStatus?: string;
  deputationStatus: boolean | string;
  deputationInstitution?: string;
  spouseEmploymentStatus?: string;
  spouseDetails?: string;
  remarks: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documentUrls: string[];
  certificateName?: string;
  certificateUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  district: string;
  principalName: string;
  staffStrength: number;
  workingStrength: number;
  vacancies: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  details: string;
}
