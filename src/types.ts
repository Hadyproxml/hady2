
export type AuditActionType = 'CREATE_PATIENT' | 'UPDATE_PATIENT' | 'UPDATE_SERVICE' | 'DELETE_PATIENT' | 'SYSTEM_LOGIN' | 'SYSTEM_SETTINGS_CHANGE' | 'CREATE_DEPARTMENT' | 'UPDATE_DEPARTMENT' | 'DELETE_DEPARTMENT' | 'DELETE_SERVICE';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditActionType;
  targetId: string;
  targetName: string;
  oldData?: any;
  newData?: any;
  details?: string;
}

export type ViewType = 'dashboard' | 'registration' | 'patients' | 'departments' | 'doctor' | 'queue' | 'reports' | 'settings' | 'audit' | 'developer_audit' | 'referrals';

export type UserRole = 'ADMIN' | 'STAFF' | 'DOCTOR' | 'NURSE' | 'DEVELOPER';

export interface Permissions {
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canManageDepartments: boolean;
  canEditPrices: boolean;
  canCreateAccounts: boolean;
  canCancelServices: boolean;
  canDeleteServices: boolean;
  canViewReports: boolean;
  canViewAudit: boolean;
  canViewEmrHistory: boolean;
  canViewEmrInfo: boolean;
  canViewEmrFiles: boolean;
  canAddEmrNotes: boolean;
  canAddEmrPrescriptions: boolean;
  canAddEmrFiles: boolean;
  canPrintInvoices: boolean;
  visibleMainSections: string[]; // ['registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings']
  assignedDepartments: string[]; // IDs of departments
  patient_referral?: boolean;
  patient_referral_delete?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  permissions: Permissions;
  assignedOfficeId?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  active: boolean;
  placeholder?: string;
  options?: string[]; // for select type
  validationRule?: 'NONE' | 'TRIPLE_NAME' | 'QUAD_NAME' | 'NID_OPTIONAL_IF_MINOR';
  isSystemField?: boolean; // To distinguish between standard fields (Name, Phone, etc.) and user-added ones
}

export interface PatientCategoryDefinition {
  id: string;
  label: string;
  color?: string;
  isDefault?: boolean;
  requiresDiscountScheme?: boolean;
  discountOverridePercent?: number; // e.g. 100 for FREE category
  availableDiscounts?: { id: string; label: string; percentage: number }[];
}

export interface Patient {
  id: string; // The numeric barcode
  name: string;
  phone: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  nationalId: string;
  category: string; // Changed from PatientCategory union to string for dynamic categories
  notes: string;
  documents: Array<{ id: string; name: string; url: string; date: string; type?: string; uploadedAt?: string }>;
  customFieldsData: Record<string, any>;
  createdAt: string;
  registeredBy: string; // userId
  registeredAt: string; // ISO string
  officeId: string;
  selectedDiscountId?: string;
  selectedSubDiscountId?: string;
}

export interface Doctor {
  id: string; // User ID if existing user or just ID
  name: string;
  specialty?: string;
}

export interface Department {
  id: string;
  name: string;
  isMain: boolean;
  parentDepartmentId?: string; // If sub-department
  type: 'CLINIC' | 'LAB' | 'RADIOLOGY' | 'OTHER';
  doctors?: Doctor[]; // Added doctors for clinics
}

export interface MedicalService {
  id: string;
  departmentId: string;
  name: string;
  price: number;
  doctorId?: string; // Changed to doctorId referring to clinic doctors
}

export interface ServiceLog {
  id: string;
  serviceId: string;
  status: 'PENDING' | 'COMPLETED';
  report?: string;
  resultUrl?: string; // File upload for results
  completedAt?: string;
  completedBy?: string; // Doctor ID
  notes?: string; // For adding sequential notes
  addedBy?: string; // User/Account who added this service
}

export interface Prescription {
  id: string;
  content: string;
  date: string;
  prescribedBy: string;
}

export interface DiscountScheme {
  id: string;
  name: string;
  percentage: number; // 0-100
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  services: ServiceLog[];
  totalPrice: number;
  discountId?: string; // Reference to DiscountScheme
  categoryAtVisit?: string; // Keep record of category at time of visit
  invoiceNumber: string;
  queueNumber: number;
  targetDepartmentId?: string; // For transfers without initial services
  targetDoctorId?: string; // Target doctor User ID
  prescriptions?: Prescription[];
  generalNotes?: string;
  isReferralUnpriced?: boolean;
}

export interface ReceptionOffice {
  id: string;
  name: string;
}

export interface RolePermissions {
  role: UserRole;
  defaultPermissions: Permissions;
}

export interface Referral {
  id: string; // رقم التحويل
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referredToId: string; // Department ID or Doctor ID
  referredToName: string; // Department name or Doctor name
  referredToType: 'DEPARTMENT' | 'DOCTOR' | 'SERVICE';
  priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  referralType: 'CONSULTATION' | 'PROCEDURE' | 'TRANSFER' | 'FOLLOWUP';
  reason: string;
  clinicalNotes?: string;
  instructions?: string;
  status: 'NEW' | 'COMPLETED' | 'CANCELLED'; // 'جديد' or 'منتهي' or 'ملغي'
  queueNumber?: number; // رقم الدور
  createdAt: string; // ISO String
}

export interface SystemSettings {
  licenseExpiryDate: string;
  renewalPasswordHash: string;
  developerInfo: {
    name: string;
    phone: string;
  };
  storagePath: string;
  customPatientFields: CustomField[];
  patientCategories?: PatientCategoryDefinition[]; // Dynamic patient categories/contracts
  discountSchemes?: DiscountScheme[]; // New field for contract/insurance discounts
  offices: ReceptionOffice[];
  roleDefaults?: RolePermissions[];
  autoPrintInvoice?: boolean;
  referrals?: Referral[];
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
}

export interface HospitalData {
  users: User[];
  patients: Patient[];
  departments: Department[];
  services: MedicalService[];
  visits: Visit[];
  settings: SystemSettings;
}
