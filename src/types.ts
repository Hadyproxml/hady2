export interface Pet {
  id: string;
  name: string;
  species: string; // نوع الحيوان (قط، كلب، الخ)
  age: string;
  condition: string;
}

export interface Owner {
  fullName: string;
  phone: string;
  email: string;
}

export interface Clinic {
  id: string;
  name: string;
  doctorName: string;
}

export type VisitStatus = 'WAITING' | 'EXAMINING' | 'AWAITING_PAYMENT' | 'COMPLETED';

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

export interface MedicationItem {
  id: string;
  name: string;
  price: number;
}

export interface MedicationRecord {
  id: string;
  name: string;
  price: number;
  instructions: string; // Doctor's note for usage
}

export interface ServiceRecord {
  id: string;
  name: string;
  price: number;
}

export interface VisitAttachment {
  id: string;
  name: string;
  url: string; // Base64 string for client-side storage & offline persistence
  type: string; // File MIME type
  size: number; // File size in bytes
  serviceId?: string; // Link to a specific service record if applicable
  uploadedAt: string;
}

export interface Visit {
  id: string;
  owner: Owner;
  pet: Pet;
  clinicId?: string;
  status: VisitStatus;
  doctorNotes?: string;
  services?: ServiceRecord[];
  medications?: MedicationRecord[];
  createdAt: string;
  doctorName?: string;
  attachments?: VisitAttachment[];
}


export interface RegisteredPet {
  id: string;
  name: string;
  species: string;
  age: string;
}

export interface ClientRecord {
  id: string;
  owner: Owner;
  pets: RegisteredPet[];
}

export type UserRole = 'MANAGER' | 'RECEPTIONIST' | 'DOCTOR';

export interface UserPermissions {
  canViewRegistration: boolean;
  canViewDoctor: boolean;
  canViewPayment: boolean;
  canViewServices: boolean;
  canViewSearch: boolean;
  canViewSettings: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDeleteClientRecord: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string; // Sticking to plain string for prototype
  fullName: string;
  role: UserRole;
  clinicId?: string; // Optional, only applicable if role === DOCTOR
  permissions: UserPermissions;
}

export const DEFAULT_ADMIN: UserAccount = {
  id: 'admin_1',
  username: 'admin',
  password: '123',
  fullName: 'مدير النظام',
  role: 'MANAGER',
  permissions: {
    canViewRegistration: true,
    canViewDoctor: true,
    canViewPayment: true,
    canViewServices: true,
    canViewSearch: true,
    canViewSettings: true,
    canEdit: true,
    canDelete: true,
    canDeleteClientRecord: true,
  }
};

export const DEVELOPER_ACCOUNT: UserAccount = {
  id: 'dev_1',
  username: 'hadypro',
  password: 'hady@pro2001',
  fullName: 'هادي ماهر',
  role: 'MANAGER',
  permissions: {
    canViewRegistration: true,
    canViewDoctor: true,
    canViewPayment: true,
    canViewServices: true,
    canViewSearch: true,
    canViewSettings: true,
    canEdit: true,
    canDelete: true,
    canDeleteClientRecord: true,
  }
};

export const INITIAL_CLINICS: Clinic[] = [
  { id: '1', name: 'عيادة الطب العام', doctorName: 'د. أحمد الكيلاني' },
  { id: '2', name: 'عيادة الجراحة', doctorName: 'د. محمد طارق' },
  { id: '3', name: 'عيادة الجلدية', doctorName: 'د. سارة فؤاد' },
  { id: '4', name: 'عيادة طب الأسنان', doctorName: 'د. ليلى سمير' },
  { id: '5', name: 'قسم الطوارئ', doctorName: 'طاقم الطوارئ المناوب' },
];
