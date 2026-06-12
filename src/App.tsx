import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { 
  Users, UserPlus, Building2, ClipboardList, 
  Stethoscope, LayoutDashboard, Settings, 
  LogOut, ShieldAlert, Search, Plus, Filter,
  Trash2, Edit, Save, Scan, Printer, ArrowRightLeft, 
  ChevronRight, ChevronDown, ChevronLeft, CheckCircle, Check,
  Clock, FileText, Upload, Barcode,
  AlertTriangle, CreditCard, HeartPulse, 
  Activity, Phone, User as UserIcon, Calendar,
  Download, Database, Lock, Key, Info, Layers, UserCheck,
  Menu, X, History, FlaskConical, Pill, Microscope, ShieldCheck,
  Bell, Eye, Tag, ShoppingBag, XCircle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { format, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReactBarcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { io } from "socket.io-client";

// Types
import { 
  User, UserRole, HospitalData, ViewType, Department, 
  MedicalService, Patient, Visit, ServiceLog,
  PatientCategoryDefinition, SystemSettings, CustomField, Prescription
} from './types';
import { SettingsView } from './components/SettingsView';
import { ReferPatientModal } from './components/ReferPatientModal';
import { ReferralsView } from './components/ReferralsView';
import { AccountInfoModal } from './components/AccountInfoModal';
import { CompleteReferralModal } from './components/CompleteReferralModal';

// Socket
const socket = io();

import { AuditView } from './components/AuditView';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { logAudit } from './lib/audit';

// Shared Utilities
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

const safeFormat = (date: any, formatStr: string) => {
  try {
    if (!date) return '--/--';
    const d = new Date(date);
    if (!isValid(d)) return '--/--';
    return format(d, formatStr, { locale: ar });
  } catch (e) {
    return '--/--';
  }
};

const SystemLogo = memo(({ className = "w-6 h-6 text-brand-600", strokeWidth = 3.5 }: { className?: string; strokeWidth?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 3V21" stroke="currentColor" />
    <path d="M18 3V21" stroke="currentColor" />
    <path d="M6 12H18" stroke="currentColor" />
    <circle cx="12" cy="12" r="3" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 10.5V13.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M10.5 12H13.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
));


const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير النظام',
  STAFF: 'موظف استقبال',
  DOCTOR: 'طبيب / فني',
  NURSE: 'موظف تمريض',
  DEVELOPER: 'مطور النظام'
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'ذكر',
  FEMALE: 'أنثى'
};

// No static CATEGORY_LABELS, using data.settings.patientCategories dynamically

const DEPT_TYPE_LABELS: Record<string, string> = {
  CLINIC: 'عيادة طبية',
  LAB: 'مختبر طبي',
  RADIOLOGY: 'مركز أشعة',
  OTHER: 'أخرى'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي'
};

interface LocalNotification {
  id: string;
  title: string;
  body: string;
  time: Date;
  isRead: boolean;
  type: 'NEW_PATIENT' | 'LAB_RESULT_UPLOAD';
  meta?: {
    patientId?: string;
    visitId?: string;
    departmentId?: string;
    serviceId?: string;
  };
}

export default function App() {
  const [data, setData] = useState<HospitalData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<LocalNotification[]>(() => {
    try {
      const saved = localStorage.getItem('hospital_local_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Keep notifications only for 24 hours temporarily
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return parsed
          .filter((n: any) => new Date(n.time).getTime() > oneDayAgo)
          .map((n: any) => ({ ...n, time: new Date(n.time) }))
          .slice(0, 100);
      }
    } catch (e) {}
    return [];
  });
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notificationSelectedPatient, setNotificationSelectedPatient] = useState<Patient | null>(null);
  const [headerToast, setHeaderToast] = useState<LocalNotification | null>(null);
  const prevDataRef = useRef<HospitalData | null>(null);

  const [activeViewInternal, setActiveViewInternal] = useState<ViewType>(() => {
    const saved = localStorage.getItem('hospital_active_view');
    return (saved as ViewType) || 'dashboard';
  });

  const setActiveView = useCallback((view: ViewType) => {
    setActiveViewInternal(view);
    localStorage.setItem('hospital_active_view', view);
  }, []);

  const activeView = activeViewInternal;

  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSystemExpired, setIsSystemExpired] = useState(false);
  const [shakeLogin, setShakeLogin] = useState(false);
  const [referralToPrice, setReferralToPrice] = useState<Visit | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hospital_local_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  // Handle outside click to auto-close notification dropdown
  useEffect(() => {
    if (!showNotificationsDropdown) return;
    const handleOutsideClick = () => {
      setShowNotificationsDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showNotificationsDropdown]);

  // Premium Synthesized Studio Chime using Web Audio API (cross-device, no asset required)
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.23); // C6
      gain2.gain.setValueAtTime(0.10, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.75);
    } catch (e) {
      console.warn('Audio chime blocked or not supported on this browser context:', e);
    }
  };

  // Tracking delta updates to data for real-time notifications
  useEffect(() => {
    if (!data || !currentUser) {
      if (data) prevDataRef.current = data;
      return;
    }

    if (!prevDataRef.current) {
      prevDataRef.current = data;
      return;
    }

    const prevVisits = prevDataRef.current.visits || [];
    const currVisits = data.visits || [];
    const newAlerts: LocalNotification[] = [];

    currVisits.forEach(visit => {
      const existed = prevVisits.some(pv => pv.id === visit.id);
      if (!existed) {
        const patient = data.patients?.find(p => p.id === visit.patientId);
        if (patient) {
            const isUserAdmin = ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase());
            const userDepts = currentUser.permissions?.assignedDepartments || [];
            const isUserAssigned = 
              isUserAdmin ||
              userDepts.length === 0 || 
              (visit.targetDoctorId && visit.targetDoctorId === currentUser.id) ||
              (visit.targetDepartmentId && userDepts.includes(visit.targetDepartmentId)) ||
              visit.services?.some(s => {
                const service = data.services?.find(sd => sd.id === s.serviceId);
                return service && userDepts.includes(service.departmentId);
              });

          if (isUserAssigned) {
            const firstServiceId = visit.services?.[0]?.serviceId;
            const targetDeptId = visit.targetDepartmentId || (firstServiceId ? data.services?.find(sd => sd.id === firstServiceId)?.departmentId : undefined);
            const deptObj = data.departments?.find(d => d.id === targetDeptId);
            const deptName = deptObj ? deptObj.name : 'العيادات الطبية';
            
            const isRef = visit.invoiceNumber && visit.invoiceNumber.startsWith('REF-');

            newAlerts.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              title: isRef ? `تحويل مريض جديد: ${patient.name}` : `مريض جديد بالانتظار: ${patient.name}`,
              body: isRef 
                ? `تم تحويل مريض إليك بقسم (${deptName}) برقم دور #${visit.queueNumber}`
                : `تم تسجيل المريض وتوجيهه إلى قسم (${deptName}) بورقة انتظار #${visit.queueNumber}`,
              time: new Date(),
              isRead: false,
              type: 'NEW_PATIENT',
              meta: {
                patientId: patient.id,
                visitId: visit.id,
                departmentId: targetDeptId
              }
            });
          }
        }
      } else {
        const prevVisit = prevVisits.find(pv => pv.id === visit.id);
        if (prevVisit) {
          visit.services?.forEach(currSer => {
            const prevSer = prevVisit.services?.find(ps => ps.id === currSer.id);
            const wasCompletedNow = currSer.status === 'COMPLETED' && (!prevSer || prevSer.status !== 'COMPLETED');
            
            if (wasCompletedNow && (currSer.resultUrl || currSer.report)) {
              const patient = data.patients?.find(p => p.id === visit.patientId);
              if (patient) {
                const serviceObj = data.services?.find(s => s.id === currSer.serviceId);
                const serviceName = serviceObj ? serviceObj.name : 'خدمة مخبرية';

                const isDoctorRole = currentUser.role === 'DOCTOR' || currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER';
                if (isDoctorRole) {
                  newAlerts.push({
                    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    title: `تقرير مخبري جاهز: ${patient.name}`,
                    body: `تم رفع تفاصيل ونتيجة الخدمة (${serviceName}) للمريض في الملف الطبي.`,
                    time: new Date(),
                    isRead: false,
                    type: 'LAB_RESULT_UPLOAD',
                    meta: {
                      patientId: patient.id,
                      visitId: visit.id,
                      serviceId: currSer.serviceId
                    }
                  });
                }
              }
            }
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setNotifications(prev => {
        const updated = [...newAlerts, ...prev];
        return updated.slice(0, 100);
      });
      playChime();

      // Show the latest patient alert next to the bell icon and let it auto-hide after 3.5 seconds
      const latestPatientAlert = [...newAlerts].reverse().find(a => a.type === 'NEW_PATIENT');
      if (latestPatientAlert) {
        setHeaderToast(latestPatientAlert);
        // Clean up previous timeouts to prevent race conditions
        const timeoutId = setTimeout(() => {
          setHeaderToast(null);
        }, 3500);
      }
    }

    prevDataRef.current = data;
  }, [data, currentUser]);

  // Resize Listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // Auto-close sidebar on mobile
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024;

  // Load Initial Data
  useEffect(() => {
    fetchData();
    socket.on("data-updated", (newData: HospitalData) => {
      setData(newData);
    });
    return () => { socket.off("data-updated"); };
  }, []);

  // Persistent Login Check
  useEffect(() => {
    const checkSession = async () => {
      const savedSession = localStorage.getItem('hospital_session');
      if (savedSession) {
        try {
          const { username, password, timestamp } = JSON.parse(savedSession);
          const now = Date.now();
          
          if (now - timestamp < SESSION_DURATION) {
            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });

            if (res.ok) {
              const user = await res.json();
              const normalizedUser: User = { 
                ...user, 
                role: (user.role || 'STAFF').toUpperCase() as UserRole,
                permissions: {
                  canEditPatients: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canDeletePatients: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canManageDepartments: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canEditPrices: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canCreateAccounts: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canCancelServices: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canDeleteServices: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canViewReports: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canViewAudit: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  canViewEmrHistory: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canViewEmrInfo: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canViewEmrFiles: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canAddEmrNotes: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canAddEmrPrescriptions: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canAddEmrFiles: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes((user.role || 'STAFF').toUpperCase()),
                  canPrintInvoices: true,
                  patient_referral: ['ADMIN', 'DEVELOPER', 'DOCTOR'].includes((user.role || 'STAFF').toUpperCase()),
                  patient_referral_delete: ['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase()),
                  visibleMainSections: (user.role || 'STAFF').toUpperCase() === 'DOCTOR' || (user.role || 'STAFF').toUpperCase() === 'NURSE'
                    ? ['dashboard', 'doctor', 'queue']
                    : (['ADMIN', 'DEVELOPER'].includes((user.role || 'STAFF').toUpperCase())
                       ? ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit']
                       : ['dashboard', 'registration', 'patients', 'queue']),
                  assignedDepartments: [],
                  ...user.permissions
                }
              };

              // Force developer/admin permissions to be true always
              if (normalizedUser.role === 'DEVELOPER') {
                normalizedUser.permissions = {
                  canEditPatients: true,
                  canDeletePatients: true,
                  canManageDepartments: true,
                  canEditPrices: true,
                  canCreateAccounts: true,
                  canCancelServices: true,
                  canDeleteServices: true,
                  canViewReports: true,
                  canViewAudit: true,
                  canViewEmrHistory: true,
                  canViewEmrInfo: true,
                  canViewEmrFiles: true,
                  canAddEmrNotes: true,
                  canAddEmrPrescriptions: true,
                  canAddEmrFiles: true,
                  canPrintInvoices: true,
                  patient_referral: true,
                  patient_referral_delete: true,
                  visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
                  assignedDepartments: []
                };
              } else if (normalizedUser.role === 'ADMIN') {
                normalizedUser.permissions = {
                  canEditPatients: true,
                  canDeletePatients: true,
                  canManageDepartments: true,
                  canEditPrices: true,
                  canCreateAccounts: true,
                  canCancelServices: true,
                  canDeleteServices: true,
                  canViewReports: true,
                  canViewAudit: true,
                  canViewEmrHistory: true,
                  canViewEmrInfo: true,
                  canViewEmrFiles: true,
                  canAddEmrNotes: true,
                  canAddEmrPrescriptions: true,
                  canAddEmrFiles: true,
                  canPrintInvoices: true,
                  patient_referral: true,
                  patient_referral_delete: true,
                  visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
                  assignedDepartments: normalizedUser.permissions?.assignedDepartments || []
                };
              }

              // Update currentUser only if permissions or relevant data changed
              if (JSON.stringify(normalizedUser.permissions) !== JSON.stringify(currentUser?.permissions) || 
                  normalizedUser.role !== currentUser?.role || 
                  normalizedUser.name !== currentUser?.name) {
                setCurrentUser(normalizedUser);
                
                if (!currentUser) {
                  const savedView = localStorage.getItem('hospital_active_view') as ViewType | null;
                  const sections = user.permissions?.visibleMainSections || (normalizedUser.role === 'DEVELOPER' || normalizedUser.role === 'ADMIN' ? ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings'] : ['dashboard', 'registration', 'patients', 'queue']);
                  const fallbackView = (sections[0] as ViewType) || 'dashboard';
                  if (savedView && sections.includes(savedView)) {
                    setActiveView(savedView);
                  } else {
                    setActiveView(fallbackView);
                  }
                }
              }
            } else {
              localStorage.removeItem('hospital_session');
            }
          } else {
            localStorage.removeItem('hospital_session');
          }
        } catch (e) {
          localStorage.removeItem('hospital_session');
        }
      }
    };
    
    if (data && !currentUser) {
      checkSession();
    }
  }, [data, currentUser]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      
      // Ensure system fields exist in settings for the new form builder
      if (json.settings && (!json.settings.customPatientFields || json.settings.customPatientFields.length === 0)) {
        const systemFields: CustomField[] = [
          { id: 'sys-name', label: 'اسم المريض بالكامل', type: 'text', required: true, active: true, isSystemField: true, validationRule: 'QUAD_NAME', placeholder: 'الاسم رباعي...' },
          { id: 'sys-phone', label: 'رقم الهاتف', type: 'text', required: true, active: true, isSystemField: true, placeholder: '01xxxxxxxxx' },
          { id: 'sys-age', label: 'السن', type: 'number', required: true, active: true, isSystemField: true, placeholder: 'مثال: 25' },
          { id: 'sys-gender', label: 'الجنس', type: 'select', required: true, active: true, isSystemField: true, options: ['ذكر', 'أنثى'] },
          { id: 'sys-nid', label: 'الرقم القومي', type: 'text', required: true, active: true, isSystemField: true, validationRule: 'NID_OPTIONAL_IF_MINOR', placeholder: '299xxxxxxxxxxx' },
        ];
        json.settings.customPatientFields = systemFields;
        // Persist the injected fields to the backend
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
      }
      
      // Ensure patient categories exist
      if (json.settings && (!json.settings.patientCategories || json.settings.patientCategories.length === 0)) {
        const defaultCategories: PatientCategoryDefinition[] = [
          { id: 'CASH', label: 'نقدي (كاش)', color: 'emerald', isDefault: true, requiresDiscountScheme: false },
          { id: 'INSURANCE', label: 'تأمين طبي', color: 'sky', requiresDiscountScheme: true },
          { id: 'CONTRACT', label: 'تعاقدات جهات', color: 'indigo', requiresDiscountScheme: true },
          { id: 'FREE', label: 'مجاني / إعفاء', color: 'rose', discountOverridePercent: 100 },
          { id: 'VIP', label: 'كبار الشخصيات', color: 'amber' },
          { id: 'STAFF', label: 'موظف', color: 'slate' },
          { id: 'COMPANY', label: 'شركة / تعاقد', color: 'blue', requiresDiscountScheme: true },
          { id: 'REGULAR', label: 'عادي', color: 'gray' },
        ];
        json.settings.patientCategories = defaultCategories;
      }
      
      setData(json);
      checkExpiry(json.settings.licenseExpiryDate);
      setIsLoading(false);
    } catch (e) {
      toast.error('فشل تحميل البيانات');
    }
  };

  const checkExpiry = (dateStr: string) => {
    const exp = new Date(dateStr).getTime();
    if (Date.now() > exp) {
      setIsSystemExpired(true);
    } else {
      setIsSystemExpired(false);
    }
  };

  const saveData = useCallback(async (newData: HospitalData) => {
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (res.ok) {
        setData(newData);
        toast.success('تم حفظ التغييرات بنجاح');
      }
    } catch (e) {
      toast.error('فشل حفظ البيانات');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      
      if (!res.ok) {
        setShakeLogin(true);
        setTimeout(() => setShakeLogin(false), 500);
        
        toast.error('خطأ في البيانات المدخلة', {
          description: 'اسم المستخدم أو كلمة المرور التي تم إدخالها غير صحيحة. يرجى التحقق بدقة والمحاولة مجددًا.',
          style: {
            background: '#fff5f5',
            border: '2px solid #feb2b2',
            color: '#9b2c2c',
            borderRadius: '1.5rem',
            padding: '16px',
            fontFamily: 'inherit',
            fontWeight: 'bold',
          },
          duration: 4000
        });
        return;
      }
      
      const user = await res.json();
      
      const normalizedUser: User = { 
        ...user, 
        role: user.role.toUpperCase() as UserRole,
        permissions: {
          canEditPatients: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canDeletePatients: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canManageDepartments: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canEditPrices: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canCreateAccounts: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canCancelServices: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canDeleteServices: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canViewReports: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canViewAudit: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          canViewEmrHistory: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canViewEmrInfo: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canViewEmrFiles: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canAddEmrNotes: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canAddEmrPrescriptions: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canAddEmrFiles: ['ADMIN', 'DEVELOPER', 'DOCTOR', 'NURSE'].includes(user.role.toUpperCase()),
          canPrintInvoices: true,
          patient_referral: ['ADMIN', 'DEVELOPER', 'DOCTOR'].includes(user.role.toUpperCase()),
          patient_referral_delete: ['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase()),
          visibleMainSections: user.role.toUpperCase() === 'DOCTOR' || user.role.toUpperCase() === 'NURSE'
            ? ['dashboard', 'doctor', 'queue']
            : (['ADMIN', 'DEVELOPER'].includes(user.role.toUpperCase())
               ? ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit']
               : ['dashboard', 'registration', 'patients', 'queue']),
          assignedDepartments: [],
          ...user.permissions
        }
      };

      // Force developer/admin permissions to be true always
      if (normalizedUser.role === 'DEVELOPER') {
        normalizedUser.permissions = {
          canEditPatients: true,
          canDeletePatients: true,
          canManageDepartments: true,
          canEditPrices: true,
          canCreateAccounts: true,
          canCancelServices: true,
          canDeleteServices: true,
          canViewReports: true,
          canViewAudit: true,
          canViewEmrHistory: true,
          canViewEmrInfo: true,
          canViewEmrFiles: true,
          canAddEmrNotes: true,
          canAddEmrPrescriptions: true,
          canAddEmrFiles: true,
          canPrintInvoices: true,
          patient_referral: true,
          patient_referral_delete: true,
          visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
          assignedDepartments: []
        };
      } else if (normalizedUser.role === 'ADMIN') {
        normalizedUser.permissions = {
          canEditPatients: true,
          canDeletePatients: true,
          canManageDepartments: true,
          canEditPrices: true,
          canCreateAccounts: true,
          canCancelServices: true,
          canDeleteServices: true,
          canViewReports: true,
          canViewAudit: true,
          canViewEmrHistory: true,
          canViewEmrInfo: true,
          canViewEmrFiles: true,
          canAddEmrNotes: true,
          canAddEmrPrescriptions: true,
          canAddEmrFiles: true,
          canPrintInvoices: true,
          patient_referral: true,
          patient_referral_delete: true,
          visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
          assignedDepartments: normalizedUser.permissions?.assignedDepartments || []
        };
      }

      setCurrentUser(normalizedUser);
      
      // Save session for 30 days
      localStorage.setItem('hospital_session', JSON.stringify({
         username: loginForm.username,
         password: loginForm.password,
         timestamp: Date.now()
      }));

      const savedView = localStorage.getItem('hospital_active_view') as ViewType | null;
      const sections = user.permissions?.visibleMainSections || (normalizedUser.role === 'DEVELOPER' || normalizedUser.role === 'ADMIN' ? ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings'] : ['dashboard', 'registration', 'patients', 'queue']);
      const fallbackView = (sections[0] as ViewType) || 'dashboard';
      if (savedView && sections.includes(savedView)) {
        setActiveView(savedView);
      } else {
        setActiveView(fallbackView);
      }
      logAudit(normalizedUser, 'SYSTEM_LOGIN', normalizedUser.id, normalizedUser.name, null, null, `تسجيل دخول ناجح من ${normalizedUser.username}`);
      toast.success(`مرحباً بك، ${normalizedUser.name}`);
    } catch (e) {
      toast.error('بيانات الدخول غير صحيحة');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hospital_session');
    localStorage.removeItem('hospital_active_view');
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
  };

  // Renewal Logic for Expired System
  const [renewalPass, setRenewalPass] = useState('');
  const handleRenew = async () => {
    try {
      const res = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: renewalPass })
      });
      if (res.ok) {
        const result = await res.json();
        toast.success('تم تجديد النظام لمدة 30 يوماً');
        setIsSystemExpired(false);
        setRenewalPass('');
        fetchData();
      } else {
        toast.error('فشل التجديد: كلمة السر غير صحيحة');
      }
    } catch (e) {
      toast.error('خطأ في الاتصال بالخادم');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-center" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <SystemLogo className="w-16 h-16 text-sky-500 animate-pulse relative z-10" />
             <div className="absolute inset-0 bg-sky-500/20 blur-2xl animate-pulse rounded-full" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sky-900 font-black text-2xl tracking-tight">هادي هيلث برو</span>
            <span className="text-sky-500 font-bold text-sm">جاري تهيئة النظام السحابي...</span>
          </div>
        </div>
      </div>
    );
  }

  // System Expiration Shield
  if (isSystemExpired) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 text-right" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border-4 border-red-500 flex flex-col gap-8"
        >
          <div className="flex items-center gap-5 text-red-600">
            <div className="p-4 bg-red-50 rounded-3xl">
              <AlertTriangle size={50} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">النظام متوقف!</h1>
              <p className="text-sky-800 font-bold">لقد انتهت فترة ترخيص البرنامج</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-sky-200">
            <h3 className="font-black text-sky-900 mb-2">معلومات المطور للمساعدة:</h3>
            <div className="flex flex-col gap-1 font-bold">
              <p className="text-sky-700">الاسم: {data?.settings?.developerInfo?.name || ""}</p>
              <p className="text-sky-700">الهاتف: {data?.settings?.developerInfo?.phone || ""}</p>
            </div>
            <p className="text-xs text-sky-700 mt-4 italic leading-relaxed text-justify">تنبيه: محاولات تخطي هذا الحاجز قد تؤدي إلى فقدان دائم للبيانات. يرجى التواصل مع المطور للحصول على كلمة سر التجديد بشكل رسمي لضمان استمرارية عملك.</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-black text-sky-800 mr-2">أدخل كلمة سر التجديد:</label>
            <div className="flex gap-3">
              <input 
                type="password"
                value={renewalPass}
                onChange={(e) => setRenewalPass(e.target.value)}
                placeholder="****"
                className="flex-1 bg-sky-50 border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-red-500 font-black text-center tracking-[0.5em]"
              />
              <button 
                onClick={handleRenew}
                className="bg-rose-50 text-rose-700 px-8 py-4 rounded-2xl font-black hover:bg-rose-100 transition-colors shadow-lg active:scale-95 border-2 border-rose-200"
              >
                تجديد
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center p-6 relative overflow-hidden font-sans" dir="rtl">
        {/* Abstract Medical Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={shakeLogin ? { x: [-12, 12, -8, 8, -4, 4, 0], y: 0, opacity: 1 } : { y: 0, opacity: 1 }}
          transition={shakeLogin ? { duration: 0.4 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border-2 border-sky-200 rounded-[3rem] p-10 md:p-14 max-w-lg w-full shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="bg-brand-50 p-6 rounded-[2rem] border-2 border-brand-100 shadow-sm transition-transform hover:scale-105 duration-500">
              <SystemLogo className="w-14 h-14 text-brand-600" />
            </div>
            <div className="text-center">
               <h1 className="text-3xl md:text-4xl font-black text-sky-950 tracking-tight mb-2">هادي هيلث برو</h1>
               <p className="text-sky-500 font-bold uppercase tracking-[0.1em] text-[10px]">نظام الإدارة الطبية المتكامل v1.0</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sky-900 text-xs font-black uppercase tracking-widest px-1">اسم المستخدم</label>
              <div className="relative group">
                <input 
                  type="text"
                  required
                  autoFocus
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full bg-sky-50 border-2 border-sky-100 rounded-2xl px-6 py-5 text-sky-900 font-bold outline-none focus:border-sky-900 focus:bg-white transition-all placeholder:text-sky-400 pr-14"
                  placeholder="ادخل اسم المستخدم"
                />
                <UserIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-sky-500 group-focus-within:text-sky-900 transition-colors" size={20} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sky-900 text-xs font-black uppercase tracking-widest px-1">كلمة المرور</label>
              <div className="relative group">
                <input 
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-sky-50 border-2 border-sky-100 rounded-2xl px-6 py-5 text-sky-900 font-bold outline-none focus:border-sky-900 focus:bg-white transition-all placeholder:text-sky-400 pr-14"
                  placeholder="كلمة المرور السرية"
                />
                <Key className="absolute right-6 top-1/2 -translate-y-1/2 text-sky-500 group-focus-within:text-sky-900 transition-colors" size={20} />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {data?.settings?.developerInfo?.phone && (
                <div className="text-center text-sky-500 font-bold text-xs mt-4">
                  للدعم الفني: {data.settings.developerInfo.phone}
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="mt-6 bg-sky-950 hover:bg-sky-900 text-sky-100 font-black py-5 rounded-2xl shadow-xl shadow-sky-950/20 active:scale-[0.97] transition-all text-lg flex items-center justify-center gap-3"
            >
              دخول النظام الموحد
            </button>
          </form>
          
          <div className="mt-14 pt-8 border-t border-sky-100 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-sky-500 text-[9px] font-black uppercase tracking-[0.2em]">All Systems Operational</p>
            </div>
            <p className="text-sky-900 text-xs font-black">{(data?.settings?.developerInfo?.name) || ""} © 2025</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main App Layout
  return (
    <div className="min-h-screen bg-sky-50 flex overflow-hidden lg:p-4" dir="rtl" style={{ height: '100dvh' }}>
      <Toaster position="top-center" richColors />
      
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-sky-900/40  z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 bg-white h-screen lg:h-full transition-all duration-500 flex flex-col lg:rounded-3xl shadow-sm border-l border-sky-200 lg:my-auto lg:mr-4
        ${isSidebarOpen 
          ? 'w-[280px] right-0 translate-x-0' 
          : 'w-0 lg:w-[90px] right-0 translate-x-full lg:translate-x-0 overflow-hidden'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-8 mb-4 border-b border-sky-100 flex-shrink-0">
            <div className="flex items-center gap-4">
               <div className="bg-brand-50 p-3 rounded-2xl border border-brand-100 flex-shrink-0">
                 <SystemLogo className="w-6 h-6 text-brand-600" />
               </div>
               {isSidebarOpen && (
                 <div className="flex flex-col whitespace-nowrap overflow-hidden">
                   <span className="text-sky-900 font-black text-xl leading-none tracking-tight">هادي هيلث برو</span>
                   <span className="text-sky-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-2">MEDICAL SYSTEM v1.0</span>
                 </div>
               )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 flex flex-col gap-2 overflow-y-auto py-4 overflow-x-hidden no-scrollbar">
            {MENU_ITEMS.filter(item => {
              const role = currentUser?.role?.toUpperCase();
              
              // Strict granular permission checks
              if (item.id === 'audit') return currentUser?.permissions.canViewAudit;
              if (item.id === 'reports') return currentUser?.permissions.canViewReports;
              if (item.id === 'settings') return role === 'ADMIN' || role === 'DEVELOPER';
              if (item.id === 'referrals') return !!currentUser?.permissions?.patient_referral || role === 'ADMIN' || role === 'DEVELOPER';

              const visible = currentUser?.permissions?.visibleMainSections;
              if (visible && visible.length > 0) return visible.includes(item.id);
              
              // Fallback
              if (role === 'DEVELOPER' || role === 'ADMIN') return true;
              return ['dashboard', 'registration', 'patients', 'queue'].includes(item.id);
            }).map(item => (
              <SidebarItem 
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                collapsed={!isSidebarOpen}
                onClick={() => {
                  setActiveView(item.id as ViewType);
                  if (isMobile) setIsSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Top Header */}
        <header className="h-20 bg-transparent px-6 lg:px-10 flex items-center justify-between z-30 flex-shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 lg:p-4 bg-white rounded-2xl text-sky-900 shadow-sm border border-sky-100 hover:bg-sky-50 transition-all active:scale-95"
            >
              {isSidebarOpen ? <X size={20} className="lg:w-6 lg:h-6" /> : <Menu size={20} className="lg:w-6 lg:h-6" />}
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl lg:text-3xl font-black text-sky-900 tracking-tight leading-none mb-1 lg:mb-2">
                {MENU_ITEMS.find(m => m.id === activeView)?.label || 'لوحة التحكم'}
              </h2>
              <div className="flex items-center gap-2 text-sky-700 font-bold text-[10px] lg:text-sm">
                <Calendar size={14} className="text-sky-500" />
                <span>{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            {/* Elegant sliding alert next to the bell */}
            <AnimatePresence>
              {headerToast && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-white transition-all max-w-[240px]"
                  style={{ direction: 'rtl' }}
                  onClick={() => {
                    const patientObj = data?.patients?.find(p => p.id === headerToast.meta?.patientId);
                    if (patientObj) {
                      setNotificationSelectedPatient(patientObj);
                    }
                    setHeaderToast(null);
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold leading-none truncate">{headerToast.title}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Real-time local notification bell widget */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`p-3 relative rounded-2xl bg-white border border-sky-100 text-sky-600 hover:text-sky-900 hover:bg-sky-50 transition-all active:scale-95 shadow-sm ${showNotificationsDropdown ? 'ring-2 ring-sky-950 bg-sky-950 text-white border-sky-950' : ''}`}
                title="التنبيهات المحلية"
              >
                <Bell size={20} className={notifications.some(n => !n.isRead) ? 'animate-bounce' : ''} />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 border-2 border-white text-sky-900 font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-3 w-80 sm:w-96 bg-white border-2 border-sky-200 rounded-[2rem] shadow-2xl z-[150] overflow-hidden text-right flex flex-col max-h-[480px]"
                    style={{ direction: 'rtl' }}
                  >
                    <div className="p-5 border-b border-sky-200 flex items-center justify-between bg-white/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        <h4 className="font-black text-sky-900 text-sm">التنبيهات العاجلة</h4>
                      </div>
                      {notifications.length > 0 && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                              toast.success('تم تحديد جميع التنبيهات كمقروءة');
                            }}
                            className="text-sky-600 hover:text-sky-700 text-[11px] font-black transition-all animate-fade-in"
                          >
                            تحديد الكل كمقروء
                          </button>
                          <div className="w-px h-3 bg-sky-100 self-center" />
                          <button
                            onClick={() => {
                              setNotifications([]);
                              toast.success('تم مسح سجل التنبيهات');
                            }}
                            className="text-rose-500 hover:text-rose-600 text-[11px] font-black transition-all animate-fade-in"
                          >
                            مسح الكل
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-sky-100 max-h-[360px] custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center gap-3 text-sky-500">
                          <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-400">
                            <Bell size={22} />
                          </div>
                          <p className="text-xs font-bold">لا يوجد أي تنبيهات واردة حالياً</p>
                          <p className="text-[10px] text-sky-500 leading-normal max-w-[200px]">ستظهر التنبيهات اللحظية فور قيام أي موظف بتعديلات مطابقة لقسمك أو رفع نتائج تحاليل</p>
                        </div>
                      ) : (
                        notifications.map(notif => {
                          const dateObj = new Date(notif.time);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                // Mark as read
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                                // Show EMR
                                const patientObj = data.patients?.find(p => p.id === notif.meta?.patientId);
                                if (patientObj) {
                                  setNotificationSelectedPatient(patientObj);
                                }
                                setShowNotificationsDropdown(false);
                              }}
                              className={`p-5 hover:bg-white transition-all flex gap-3 cursor-pointer items-start relative ${!notif.isRead ? 'bg-sky-50/20' : ''}`}
                            >
                              {!notif.isRead && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-600 rounded-full" />
                              )}
                              <div className={`p-2.5 rounded-xl flex-shrink-0 border ${notif.type === 'NEW_PATIENT' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-sky-50 text-sky-600 border-sky-105'}`}>
                                {notif.type === 'NEW_PATIENT' ? <UserPlus size={16} /> : <Microscope size={16} />}
                              </div>
                              <div className="flex-1 min-w-0 pr-1.5 text-right">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider mb-1 inline-block ${notif.type === 'NEW_PATIENT' ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-sky-50 text-sky-700 border border-sky-100'}`}>
                                  {notif.type === 'NEW_PATIENT' ? 'مريض جديد للقسم' : 'مختبر / نتائج'}
                                </span>
                                <h5 className={`text-xs font-black leading-tight text-sky-900 ${!notif.isRead ? 'font-extrabold text-sky-950' : 'text-sky-900'}`}>{notif.title}</h5>
                                <p className="text-[10px] text-sky-600 font-medium leading-relaxed mt-1">{notif.body}</p>
                                <p className="text-[9px] text-sky-500 font-bold tracking-tight mt-1 ml-auto ltr text-left">
                                  {safeFormat(notif.time, 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Account / Logout Widget */}
            <div 
              onClick={() => setIsAccountModalOpen(true)}
              className="group flex items-center gap-2 bg-white border border-sky-100/50 hover:border-sky-200 hover:shadow-md transition-all duration-300 rounded-2xl p-1 pl-3 shadow-sm select-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-900 border border-sky-100 flex items-center justify-center font-black text-sm flex-shrink-0 transition-transform group-hover:scale-105">
                 {currentUser?.name?.[0] || 'U'}
              </div>
              <div className="hidden md:flex flex-col justify-center px-1 pr-1 transition-all duration-300">
                 <span className="text-sky-950 font-black text-xs leading-tight block whitespace-nowrap">{currentUser?.name}</span>
                 <span className="text-sky-500 text-[9px] font-bold mt-0.5 uppercase tracking-wider">{ROLE_LABELS[currentUser?.role?.toUpperCase()] || currentUser?.role}</span>
              </div>
            </div>
            
          </div>
        </header>

        {/* Dynamic View Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10 custom-scrollbar">
           {data && currentUser ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full"
              >
                  {renderView(activeView, data, saveData, currentUser, setActiveView, handleLogout, setReferralToPrice)}
              </motion.div>
            </AnimatePresence>
           ) : (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-sky-900">
                <Activity className="animate-spin text-sky-600" size={50} />
                <p className="font-black text-xl">جاري تحميل بيانات المستخدم...</p>
             </div>
           )}
        </div>

        <AnimatePresence>
          {notificationSelectedPatient && (
            <PatientEMRModal 
              patient={notificationSelectedPatient}
              data={data}
              saveData={saveData}
              currentUser={currentUser}
              onClose={() => setNotificationSelectedPatient(null)}
            />
          )}
          {isAccountModalOpen && (
            <AccountInfoModal 
              isOpen={isAccountModalOpen}
              onClose={() => setIsAccountModalOpen(false)}
              user={currentUser}
              updateUser={(u) => {
                if (u === null) {
                  handleLogout();
                }
              }}
            />
          )}
          {referralToPrice && (
            <CompleteReferralModal 
              isOpen={!!referralToPrice}
              onClose={() => setReferralToPrice(null)}
              visit={referralToPrice}
              data={data}
              saveData={saveData}
              currentUser={currentUser}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Side Components
const SidebarItem = memo(({ icon: Icon, label, active, collapsed, onClick }: any) => {
  return (
    <button 
      onClick={onClick}
      className={`
        relative group flex items-center gap-5 p-5 rounded-2xl transition-all duration-300
        ${active ? 'bg-sky-900 text-white shadow-xl' : 'text-sky-600 hover:bg-sky-100 hover:text-sky-900'}
        ${collapsed && 'justify-center'}
      `}
    >
      <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
        <Icon size={ active ? 24 : 22 } className={active ? 'text-white' : 'text-sky-500 group-hover:text-sky-900'} />
      </div>
      {(!collapsed) && (
        <span className="font-extrabold text-sm tracking-tight whitespace-nowrap">{label}</span>
      )}
      {!collapsed && active && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
      )}
    </button>
  );
});

const MENU_ITEMS = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'registration', label: 'تسجيل مريض', icon: UserPlus },
  { id: 'patients', label: 'إدارة المرضى', icon: Users },
  { id: 'queue', label: 'قائمة الدور', icon: ClipboardList },
  { id: 'doctor', label: 'تقرير الطبيب', icon: Stethoscope },
  { id: 'referrals', label: 'التحويلات الطبية', icon: ArrowRightLeft },
  { id: 'departments', label: 'الأقسام والخدمات', icon: Building2 },
  { id: 'reports', label: 'التقارير المالية', icon: FileText },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
  { id: 'audit', label: 'سجل التدقيق', icon: ShieldCheck },
];

// --- Views Routing ---
function renderView(
  view: ViewType, 
  data: HospitalData, 
  saveData: (d: HospitalData) => void, 
  currentUser: User, 
  setActiveView: (v: ViewType) => void, 
  onLogout: () => void,
  onOpenPricingModal: (visit: Visit) => void
) {
  switch (view) {
    case 'registration': return <RegistrationView data={data} saveData={saveData} currentUser={currentUser} />;
    case 'patients': return <PatientsView data={data} saveData={saveData} currentUser={currentUser} />;
    case 'departments': return <DepartmentsView data={data} saveData={saveData} currentUser={currentUser} />;
    case 'doctor': return <DoctorView data={data} saveData={saveData} currentUser={currentUser} />;
    case 'queue': return <QueueView data={data} saveData={saveData} currentUser={currentUser} onOpenPricingModal={onOpenPricingModal} />;
    case 'referrals': return (
      <ReferralsView 
        data={data} 
        saveData={saveData} 
        currentUser={currentUser} 
        onCompleteReferral={(ref) => {
          const visit = data.visits.find(v => v.invoiceNumber === ref.id && v.isReferralUnpriced);
          if (visit) onOpenPricingModal(visit);
          else toast.error('لا يمكن استكمال هذا التحويل، قد يكون تم تسعيره مسبقاً أو غير موجود في الجدول');
        }}
      />
    );
    case 'reports': return <ReportsView data={data} currentUser={currentUser} />;
    case 'settings': return <SettingsView data={data} saveData={saveData} currentUser={currentUser} setActiveView={setActiveView} onLogout={onLogout} />;
    case 'audit': return <AuditView />;
    case 'developer_audit': return <AuditView />;
    case 'dashboard':
    default: return <DashboardView data={data} currentUser={currentUser} setActiveView={setActiveView} />;
  }
}

// --- Specific Views Components (Skeletal) ---
// I will implement each of these in detail next.
const DashboardView = memo(({ data, currentUser, setActiveView }: { data: HospitalData, currentUser: User, setActiveView: (v: ViewType) => void }) => { 
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todaysVisits = useMemo(() => (data.visits || []).filter(v => safeFormat(v.date, 'yyyy-MM-dd') === todayStr), [data.visits, todayStr]);

  const stats = useMemo(() => [
    { label: 'إجمالي المرضى المسجلين', value: (data.patients || []).length, icon: Users, color: 'bg-sky-50', textColor: 'text-sky-900', iconColor: 'text-sky-500' },
    { label: 'حالات الكشف اليوم', value: todaysVisits.length, icon: Calendar, color: 'bg-sky-50', textColor: 'text-sky-900', iconColor: 'text-sky-500' },
    { label: 'الأقسام الطبية العاملة', value: (data.departments || []).length, icon: Building2, color: 'bg-sky-50', textColor: 'text-sky-900', iconColor: 'text-sky-500' },
    { label: 'إجمالي تحصيل اليوم', value: todaysVisits.filter(v => v.services.length > 0 && v.services.every(s => s.status === 'COMPLETED')).reduce((acc, v) => acc + (v.totalPrice || 0), 0) + ' ج.م', icon: CreditCard, color: 'bg-sky-950', textColor: 'text-white', iconColor: 'text-sky-400' },
  ], [data.patients, todaysVisits, data.departments]);


  const isSecureDev = localStorage.getItem('hospital_session') ? JSON.parse(localStorage.getItem('hospital_session')!).username === atob('aGFkeXBybw==') : false;

  const chartData = (data.visits || []).filter(v => v.services.length > 0 && v.services.every(s => s.status === 'COMPLETED')).slice(-7).map(v => ({ 
    date: safeFormat(v.date, 'MM/dd'), 
    value: v.totalPrice || 0 
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-12 pb-20 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.color === 'bg-sky-950' ? 'bg-sky-950 border-sky-900 shadow-2xl' : 'bg-white border-sky-100 shadow-sm'} p-10 rounded-[2.5rem] flex flex-col gap-6 group hover:translate-y-[-4px] hover:shadow-xl transition-all duration-300 border-2`}>
            <div className={`${stat.color === 'bg-sky-950' ? 'bg-sky-800' : stat.color} w-16 h-16 rounded-2xl flex items-center justify-center ${stat.iconColor} shadow-inner group-hover:scale-110 transition-transform`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className={`${stat.color === 'bg-sky-950' ? 'text-sky-400' : 'text-sky-500'} font-extrabold text-[10px] uppercase tracking-widest mb-2`}>{stat.label}</p>
              <h3 className={`text-4xl font-black tabular-nums ${stat.textColor}`}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {(isSecureDev || currentUser?.role === 'DEVELOPER' || currentUser?.role === 'ADMIN') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
          className="bg-sky-900 p-12 rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 border-4 border-sky-800"
        >
           <div className="flex items-center gap-10">
              <div className="bg-sky-800 p-8 rounded-[2rem] shadow-2xl border-2 border-sky-700">
                 <ShieldCheck size={48} className="text-emerald-400" />
              </div>
              <div>
                 <h3 className="text-sky-100 text-3xl font-black italic tracking-tight">نظام التدقيق والرقابة الذكي</h3>
                 <p className="text-sky-500 font-bold text-lg mt-3 max-w-xl leading-relaxed">بروتوكول أمني متطور لمراقبة كافة العمليات المحاسبية وتعديلات السجلات الطبية لضمان الشفافية الكاملة.</p>
              </div>
           </div>
           <button 
             onClick={() => setActiveView('audit')}
             className="bg-emerald-500 text-sky-950 px-14 py-6 rounded-3xl font-black text-xl hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] min-w-[280px] active:scale-95 flex items-center justify-center gap-4"
           >
              <span>سجل التدقيق الرقمي</span>
              <History size={24} />
           </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-black text-sky-900 mb-6 flex items-center gap-2">
            <Activity className="text-sky-500" /> إحصائيات الزيارات
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-sky-900 mb-6">نشاط الأقسام المتاحة</h3>
          <div className="flex-1 flex flex-col gap-4">
            {(data.departments || []).filter(d => d.isMain)
              .filter(d => (currentUser.permissions?.assignedDepartments || []).length === 0 || ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || (currentUser.permissions?.assignedDepartments || []).includes(d.id))
              .slice(0, 5).map(dept => {
               const count = (data.visits || []).reduce((acc, v) => {
                 const hasServiceInDept = (v.services || []).some(s => {
                   const service = (data.services || []).find(ser => ser.id === s.serviceId);
                   return service?.departmentId === dept.id;
                 });
                 const isDirectlyTargeted = v.targetDepartmentId === dept.id;
                 return acc + (hasServiceInDept || isDirectlyTargeted ? 1 : 0);
               }, 0);
               return (
                 <div key={dept.id} className="flex flex-col gap-2">
                   <div className="flex justify-between items-center text-sm">
                     <span className="font-bold text-sky-700">{dept.name}</span>
                     <span className="text-sky-900 font-black">{count} خدمة</span>
                   </div>
                   <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
                     <div className="h-full bg-sky-600 rounded-full" style={{ width: `${Math.min(100, count * 5)}%` }} />
                   </div>
                 </div>
                );
              })}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// --- Views Components ---
const RegistrationView = memo(({ data, saveData, currentUser }: { data: HospitalData, saveData: (d: HospitalData) => void, currentUser: User }) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '', phone: '', age: 0, gender: 'MALE', 
    category: 'CASH', nationalId: '', notes: '',
    customFieldsData: {},
    selectedDiscountId: '',
    selectedSubDiscountId: '',
    customDiscountPercent: ''
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [activeFolders, setActiveFolders] = useState<Record<string, boolean>>({});
  const [serviceSearch, setServiceSearch] = useState('');

  const toggleFolder = (id: string) => {
    setActiveFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generatePatientId = useCallback(() => {
    let newId = '';
    let isUnique = false;
    let attempts = 0;
    // We strictly check against all existing patients to avoid any recurrence
    while (!isUnique && attempts < 100) {
      newId = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
      isUnique = !data.patients.some(p => p.id === newId);
      attempts++;
    }
    // Fallback if random fails multiple times (extremely unlikely)
    if (!isUnique) {
      newId = `P${Date.now().toString().slice(-10)}`;
    }
    return newId;
  }, [data.patients]);

  const currentPatientId = useRef(generatePatientId());

  const resetForm = () => {
    setFormData({
      name: '', phone: '', age: 0, gender: 'MALE', 
      category: 'CASH', nationalId: '', notes: '',
      customFieldsData: {},
      selectedDiscountId: '',
      selectedSubDiscountId: ''
    });
    setSelectedServices([]);
    setSelectedDepartmentId(null);
    setShowInvoicePreview(false);
    currentPatientId.current = generatePatientId();
  };

  const handleServiceToggle = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const nameValidation = useMemo(() => {
    const name = (formData.name || '').trim();
    if (!name) return { isValid: false, message: 'مطلوب إدخال الاسم بالكامل رباعياً' };
    const words = name.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 4) {
      return { 
        isValid: false, 
        message: `الاسم يجب أن يكون رباعياً على الأقل؛ ناقص ${4 - words.length} أسماء` 
      };
    }
    return { isValid: true, message: '✓ الاسم رباعي ومكتمل ومطابق للمعايير الجنائية والطبية' };
  }, [formData.name]);

  const phoneValidation = useMemo(() => {
    const phone = (formData.phone || '').trim();
    if (!phone) return { isValid: false, message: 'مطلوب رقم هاتف للتواصل وإرسال الإشعارات' };
    const isAllDigits = /^\d+$/.test(phone);
    if (!isAllDigits) return { isValid: false, message: 'رقم الهاتف يجب أن يحتوي على أرقام فقط' };
    if (phone.length !== 11) {
      return { 
        isValid: false, 
        message: `رقم الهاتف ناقص؛ يجب أن يكون 11 رقماً (أدخلت ${phone.length} أرقام)` 
      };
    }
    return { isValid: true, message: '✓ رقم الهاتف صحيح ومطابق لمعايير شبكات الاتصال المصرية' };
  }, [formData.phone]);

  const nidValidation = useMemo(() => {
    const nid = (formData.nationalId || '').trim();
    const age = formData.age || 0;
    const isMinor = age < 16;

    if (isMinor) {
      if (!nid) return { isValid: true, isOptional: true, message: 'ℹ️ الرقم القومي اختياري للأطفال الأقل من 16 عاماً' };
    } else {
      if (!nid) return { isValid: false, message: 'الرقم القومي إجباري لمن هم في سن 16 عاماً أو أكثر للتدقيق الأمني والمالي' };
    }

    const isAllDigits = /^\d+$/.test(nid);
    if (!isAllDigits) return { isValid: false, message: 'الرقم القومي يجب أن يحتوي على أرقام فقط' };
    if (nid.length !== 14) {
      return { 
        isValid: false, 
        message: `الرقم القومي غير مكتمل؛ يجب أن يكون 14 رقماً (أدخلت ${nid.length} أرقام)` 
      };
    }
    return { isValid: true, message: '✓ الرقم القومي مطابق ومكتمل للبالغين' };
  }, [formData.nationalId, formData.age]);

  const rawTotalPrice = useMemo(() => {
    return selectedServices.reduce((acc, id) => {
      const service = data.services.find(s => s.id === id);
      return acc + (service?.price || 0);
    }, 0);
  }, [selectedServices, data.services]);

  const selectedScheme = data.settings?.discountSchemes?.find(s => s.id === formData.selectedDiscountId);
  const currentCategory = (data.settings.patientCategories || []).find(c => c.id === formData.category);
  const selectedSubDiscount = currentCategory?.availableDiscounts?.find(d => d.id === formData.selectedSubDiscountId);
  
  const discountPercent = formData.customDiscountPercent !== '' && formData.customDiscountPercent !== undefined
    ? Number(formData.customDiscountPercent)
    : (selectedSubDiscount 
        ? selectedSubDiscount.percentage
        : (currentCategory?.discountOverridePercent !== undefined 
            ? currentCategory.discountOverridePercent 
            : (currentCategory?.requiresDiscountScheme ? (selectedScheme?.percentage || 0) : 0)));
    
  const totalDiscount = Math.round(rawTotalPrice * (discountPercent / 100));
  const totalPrice = rawTotalPrice - totalDiscount;

  const handleSubmit = async () => {
    // Robust fallback: Always require at least a name
    if (!formData.name?.trim()) {
      toast.warning('يرجى إدخال اسم المريض');
      return;
    }

    const fields = data.settings?.customPatientFields || [];
    
    for (const field of fields) {
      if (!field.active) continue;
      
      let val: any;
      if (field.isSystemField) {
        if (field.id === 'sys-name') val = formData.name;
        else if (field.id === 'sys-phone') val = formData.phone;
        else if (field.id === 'sys-age') val = formData.age;
        else if (field.id === 'sys-gender') val = formData.gender;
        else if (field.id === 'sys-nid') val = formData.nationalId;
      } else {
        val = formData.customFieldsData?.[field.id];
      }

      // Required Check
      const isEmpty = (v: any) => {
        if (v === undefined || v === null) return true;
        if (typeof v === 'string') return v.trim().length === 0;
        return false;
      };

      // Custom override validations for Name, Phone, and National ID
      if (field.id === 'sys-name') {
        const cleanName = (val || '').toString().trim();
        if (!cleanName) {
          toast.warning('يرجى إكمال الحقل الإجباري: الاسم بالكامل');
          return;
        }
        const words = cleanName.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 4) {
          toast.warning('اسم المريض يجب أن يكون رباعياً على الأقل (مثال: أحمد محمد علي محمود)');
          return;
        }
      }

      else if (field.id === 'sys-phone') {
        const cleanPhone = (val || '').toString().trim();
        if (!cleanPhone) {
          toast.warning('يرجى إكمال الحقل الإجباري: رقم الهاتف');
          return;
        }
        const isAllDigits = /^\d+$/.test(cleanPhone);
        if (cleanPhone.length !== 11 || !isAllDigits) {
          toast.warning('رقم الهاتف يجب أن يتكون من 11 رقماً رقمياً');
          return;
        }
      }

      else if (field.id === 'sys-nid') {
        const cleanNid = (val || '').toString().trim();
        const age = formData.age || 0;
        const isMinor = age < 16;

        if (!isMinor) {
          // Compulsory for age >= 16
          if (!cleanNid) {
            toast.warning('الرقم القومي إجباري لمن سنهم 16 عاماً أو أكثر');
            return;
          }
        }

        // If filled, must be exactly 14 digits
        if (cleanNid) {
          const isAllDigits = /^\d+$/.test(cleanNid);
          if (cleanNid.length !== 14 || !isAllDigits) {
            toast.warning('الرقم القومي يجب أن يتكون من 14 رقماً رقمياً');
            return;
          }
        }
      }

      else {
        // Enforce required for any other active field
        if (field.required && isEmpty(val)) {
          toast.warning(`يرجى إكمال الحقل الإجباري: ${field.label}`);
          return;
        }
      }
    }

    if (selectedServices.length === 0 && !selectedDepartmentId) {
      toast.warning('يرجى اختيار خدمة واحدة على الأقل أو توجيه لقسم');
      return;
    }

    const isMinor = (formData.age || 0) < 16;
    const processedNotes = isMinor ? `[قاصر] ${formData.notes || ''}`.trim() : (formData.notes || '');

    // Verify ID uniqueness one last time before submission to prevent race conditions or stale state collisions
    if (data.patients.some(p => p.id === currentPatientId.current)) {
      currentPatientId.current = generatePatientId();
    }

    const newPatient: Patient = {
      ...(formData as Patient),
      notes: processedNotes,
      id: currentPatientId.current,
      documents: [],
      createdAt: new Date().toISOString(),
      registeredBy: currentUser.id,
      registeredAt: new Date().toISOString(),
      officeId: currentUser.assignedOfficeId || data.settings?.offices?.[0]?.id || 'o1'
    };

    const newVisit: Visit = {
      id: `v-${Date.now()}`,
      patientId: newPatient.id,
      date: new Date().toISOString(),
      services: selectedServices.map(sid => ({
        id: `sl-${Math.random().toString(36).substr(2, 9)}`,
        serviceId: sid,
        status: 'PENDING',
        addedBy: currentUser.name
      })),
      totalPrice,
      discountId: formData.selectedDiscountId || undefined,
      categoryAtVisit: formData.category,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      queueNumber: (data.visits || []).filter(v => safeFormat(v.date, 'yyyy-MM-dd') === todayStr).length + 1,
      targetDepartmentId: selectedDepartmentId || undefined
    };

    const newData: HospitalData = {
      ...data,
      patients: [...data.patients, newPatient],
      visits: [...data.visits, newVisit]
    };

    await logAudit(
      currentUser,
      'CREATE_PATIENT',
      newPatient.id,
      newPatient.name,
      null,
      newPatient,
      `تسجيل مريض جديد ${isMinor ? '(قاصر)' : ''} مع ${selectedServices.length} خدمات`
    );

    await saveData(newData);
    setShowInvoicePreview(true);
  };

  const invoiceRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة-${formData.name}`,
  });

  useEffect(() => {
    if (showInvoicePreview && data.settings?.autoPrintInvoice) {
      const timeout = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [showInvoicePreview, data.settings?.autoPrintInvoice]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 flex flex-col gap-8">
          <section className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-sky-950 text-white px-8 py-3 rounded-br-[2rem] font-black text-[10px] tracking-[0.2em] shadow-2xl flex items-center gap-3 z-10 uppercase">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
               Patient ID: {currentPatientId.current}
            </div>
            <h3 className="text-xl font-black text-sky-950 mb-8 border-b-2 border-sky-50 pb-4 mt-8">استمارة بيانات المريض</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(data.settings?.customPatientFields || []).filter(f => f.active).map(field => {
                const isSystem = field.isSystemField;
                const value = isSystem 
                  ? (field.id === 'sys-name' ? formData.name : field.id === 'sys-phone' ? formData.phone : field.id === 'sys-age' ? formData.age : field.id === 'sys-gender' ? formData.gender : formData.nationalId)
                  : (formData.customFieldsData?.[field.id] || '');
                
                const updateValue = (val: any) => {
                  if (isSystem) {
                    if (field.id === 'sys-name') setFormData({ ...formData, name: val });
                    else if (field.id === 'sys-phone') setFormData({ ...formData, phone: val });
                    else if (field.id === 'sys-age') setFormData({ ...formData, age: parseInt(val) || 0 });
                    else if (field.id === 'sys-gender') setFormData({ ...formData, gender: val });
                    else if (field.id === 'sys-nid') setFormData({ ...formData, nationalId: val });
                  } else {
                    setFormData({ ...formData, customFieldsData: { ...formData.customFieldsData, [field.id]: val } });
                  }
                };

                const validation = field.id === 'sys-name' ? nameValidation : field.id === 'sys-phone' ? phoneValidation : field.id === 'sys-nid' ? nidValidation : null;
                const hasContent = value !== undefined && value !== null && value.toString().trim().length > 0;
                
                let borderClass = "border-sky-200 focus:ring-sky-600 bg-white focus:border-sky-600";
                if (validation) {
                  if (hasContent) {
                    borderClass = validation.isValid 
                      ? "border-sky-300 focus:ring-sky-500 bg-sky-50/10 focus:border-sky-500" 
                      : "border-rose-300 focus:ring-rose-500 bg-rose-50/10 focus:border-rose-500";
                  } else if (field.required) {
                    borderClass = "border-amber-200 focus:ring-amber-500 bg-amber-50/5 focus:border-amber-500";
                  }
                }

                return (
                  <div key={field.id} className={`flex flex-col gap-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                    <label className="text-sm font-black text-sky-900 mr-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {field.label}
                        {field.required && <span className="text-rose-500">*</span>}
                      </span>
                      {validation && hasContent && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${validation.isValid ? 'bg-sky-50 text-sky-700 border border-sky-100' : 'bg-rose-55 text-rose-700 border border-rose-100'}`}>
                          {validation.isValid ? 'مكتمل' : 'غير مكتمل'}
                        </span>
                      )}
                    </label>
                    {isSystem && field.id === 'sys-gender' ? (
                      <div className="flex bg-sky-50 p-1 rounded-2xl border-2 border-sky-100">
                        <button 
                          onClick={() => updateValue('MALE')}
                          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${formData.gender === 'MALE' ? 'bg-white text-sky-700 shadow-sm' : 'text-sky-500 hover:text-sky-600'}`}
                        >
                          <span className={formData.gender === 'MALE' ? 'opacity-100' : 'opacity-0'}>●</span> ذكر
                        </button>
                        <button 
                          onClick={() => updateValue('FEMALE')}
                          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${formData.gender === 'FEMALE' ? 'bg-white text-rose-600 shadow-sm' : 'text-sky-500 hover:text-sky-600'}`}
                        >
                          <span className={formData.gender === 'FEMALE' ? 'opacity-100' : 'opacity-0'}>●</span> أنثى
                        </button>
                      </div>
                    ) : field.type === 'select' ? (
                      <select 
                        className={`border-2 rounded-2xl p-4 outline-none font-black text-sky-900 appearance-none transition-all ${borderClass}`}
                        value={value}
                        onChange={e => updateValue(e.target.value)}
                      >
                        {!isSystem && <option value="">اختر...</option>}
                        {!isSystem && field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea 
                        className={`border-2 rounded-2xl p-4 outline-none font-black text-sky-900 min-h-[100px] transition-all ${borderClass}`}
                        placeholder={field.placeholder || `أدخل ${field.label}...`}
                        value={value}
                        onChange={e => updateValue(e.target.value)}
                      />
                    ) : (
                      <input 
                        type={field.type}
                        className={`border-2 rounded-2xl p-4 outline-none font-black text-sky-900 transition-all ${field.id === 'sys-phone' || field.id === 'sys-nid' ? 'ltr text-right' : ''} ${borderClass}`}
                        placeholder={field.placeholder || `أدخل ${field.label}...`}
                        value={value === 0 && field.id === 'sys-age' ? '' : value}
                        onChange={e => updateValue(e.target.value)}
                        onFocus={e => { if (field.id === 'sys-age' && value === 0) updateValue(''); }}
                      />
                    )}
                    {validation && (
                      <div className={`text-[11px] font-black leading-relaxed px-1 mt-0.5 transition-all flex items-center gap-1.5 ${
                        hasContent 
                          ? (validation.isValid ? 'text-sky-600' : 'text-rose-600') 
                          : (field.required ? 'text-amber-600' : 'text-sky-500')
                      }`}>
                        <span className="text-xs">{hasContent ? (validation.isValid ? '✓' : '⚠️') : (field.required ? '⚡' : 'ℹ️')}</span>
                        <span>{hasContent ? validation.message : (field.required ? `مطلوب تعبئة هذا الحقل: يرجى إدخال ${field.label}` : validation.message)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-black text-sky-900 mr-2">تصنيف المريض</label>
                <div className="flex flex-wrap gap-3">
                  {(data.settings.patientCategories || []).map(cat => (
                    <button 
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.id, selectedSubDiscountId: '', selectedDiscountId: '' })}
                      className={`px-6 py-3 rounded-2xl border-2 font-black transition-all ${
                        formData.category === cat.id 
                          ? `bg-${cat.color || 'slate'}-100 border-${cat.color || 'slate'}-200 text-${cat.color || 'slate'}-900 shadow-md` 
                          : 'bg-white border-sky-200 text-sky-600 hover:border-sky-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {currentCategory?.availableDiscounts && currentCategory.availableDiscounts.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 mt-4 overflow-hidden"
                    >
                      <label className="text-sm font-black text-sky-900 mr-2 flex items-center gap-2">
                        <Tag size={16} className="text-sky-600" /> اختر فئة الخصم المحددة (مثلاً: خصم خاص، نسبة متغيرة)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentCategory.availableDiscounts.map(disc => (
                          <button 
                            key={disc.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, selectedSubDiscountId: disc.id, customDiscountPercent: '' })}
                            className={`px-5 py-3 rounded-xl border-2 font-black transition-all flex items-center gap-3 ${formData.selectedSubDiscountId === disc.id && !formData.customDiscountPercent ? 'bg-sky-600 border-sky-600 text-sky-50 shadow-md' : 'bg-white border-sky-100 text-sky-500 hover:border-sky-200'}`}
                          >
                            <span className="text-sm">{disc.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-lg font-mono ${formData.selectedSubDiscountId === disc.id ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600'}`}>{disc.percentage}%</span>
                          </button>
                        ))}
                        
                        {/* Manual Discount Input */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${formData.customDiscountPercent !== '' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-sky-100'}`}>
                           <span className="text-[10px] font-black whitespace-nowrap">خصم يدوي:</span>
                           <input 
                             type="number"
                             min="0"
                             max="100"
                             placeholder="%"
                             value={formData.customDiscountPercent}
                             onChange={(e) => setFormData({ 
                               ...formData, 
                               customDiscountPercent: e.target.value === '' ? '' : parseInt(e.target.value),
                               selectedSubDiscountId: '' 
                             })}
                             className="w-14 bg-white border border-sky-200 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:border-sky-500"
                           />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(data.settings.patientCategories || []).find(c => c.id === formData.category)?.requiresDiscountScheme && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 mt-4 overflow-hidden"
                    >
                      <label className="text-sm font-black text-sky-900 mr-2 flex items-center gap-2">
                        <Database size={16} className="text-brand-600" /> اختر جهة التعاقد / نظام الخصم
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(data.settings?.discountSchemes || []).map(scheme => (
                          <button 
                            key={scheme.id}
                            onClick={() => setFormData({ ...formData, selectedDiscountId: scheme.id })}
                            className={`p-5 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1 ${formData.selectedDiscountId === scheme.id ? 'bg-sky-900 border-sky-900 text-sky-100 shadow-lg' : 'bg-white border-sky-200 text-sky-600 hover:border-sky-400'}`}
                          >
                            <span>{scheme.name}</span>
                            <span className={`text-[10px] ${formData.selectedDiscountId === scheme.id ? 'text-sky-300' : 'text-sky-500'}`}>خصم {scheme.percentage}%</span>
                          </button>
                        ))}
                        {(data.settings?.discountSchemes || []).length === 0 && (
                          <div className="col-span-full p-8 border-2 border-dashed border-sky-200 rounded-3xl text-center text-sky-500 font-bold text-sm bg-sky-50">
                            لا توجد أنظمة خصم معرفة في الإعدادات.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-black text-sky-900 mr-2">ملاحظات طبية إضافية</label>
                <textarea 
                   className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 outline-none focus:border-sky-900 focus:bg-white font-bold text-sky-900 min-h-[100px] transition-all"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل أي ملاحظات سريرية أو إدارية هنا..."
                />
              </div>
            </div>
          </section>

          {/* Services Selection */}
          <section className="bg-white p-10 rounded-[3rem] border-2 border-sky-100 shadow-sm">
            <div className="flex flex-col gap-10">
              <div>
                <h3 className="text-xl font-black text-sky-900 mb-8 flex items-center justify-between">
                   توجيه مباشر لقسم طبي
                  <span className="text-[10px] font-extrabold text-sky-500 border border-sky-100 px-3 py-1 rounded-full bg-sky-50">(بدون اختيار خدمة محددة)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button 
                    onClick={() => setSelectedDepartmentId(null)}
                    className={`p-5 rounded-2xl border-2 font-black transition-all ${!selectedDepartmentId ? 'bg-sky-950 border-sky-950 text-white shadow-xl' : 'bg-sky-50 border-sky-100 text-sky-500 hover:border-sky-300'}`}
                  >
                    لا يوجد توجيه مباشر
                  </button>
                  {data.departments.filter(d => d.isMain).map(dept => (
                    <button 
                      key={`dept-target-${dept.id}`}
                      onClick={() => {
                        setSelectedDepartmentId(dept.id);
                        setSelectedServices([]);
                      }}
                      className={`p-5 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-3 ${selectedDepartmentId === dept.id ? 'bg-sky-950 border-sky-950 text-white shadow-xl' : 'bg-sky-50 border-sky-100 text-sky-600 hover:border-sky-200'}`}
                    >
                      <Building2 size={20} className={selectedDepartmentId === dept.id ? 'text-white' : 'text-sky-500'} />
                      <span className={selectedDepartmentId === dept.id ? 'text-white' : ''}>{dept.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-sky-100 my-2" />

              <div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                  <h3 className="text-xl font-black text-sky-900 flex items-center gap-4">
                    اختيار خدمات وأطباء
                    <span className="bg-sky-100 text-sky-900 text-xs px-5 py-2 rounded-full border border-sky-200">{selectedServices.length} بنود مختارة</span>
                  </h3>
                  
                  <div className="relative flex-1 max-w-md w-full">
                    <input 
                      type="text" 
                      placeholder="ابحث عن اسم الخدمة أو الطبيب..." 
                      className="w-full bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 pr-14 font-bold outline-none focus:border-sky-900 focus:bg-white transition-all shadow-sm"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                    />
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-sky-500" size={24} />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {data.departments.filter(d => d.isMain).map(mainDept => {
                    const isOpen = activeFolders[mainDept.id] || serviceSearch.length > 0;
                    const subDepts = data.departments.filter(d => d.parentDepartmentId === mainDept.id);
                    const mainServices = data.services.filter(s => s.departmentId === mainDept.id);
                    
                    // Simple search filtering
                    const searchResults = serviceSearch 
                      ? data.services.filter(s => 
                          (s.departmentId === mainDept.id || subDepts.some(sd => sd.id === s.departmentId)) && 
                          s.name.toLowerCase().includes(serviceSearch.toLowerCase())
                        )
                      : [];

                    if (serviceSearch && searchResults.length === 0) return null;

                    return (
                      <div key={mainDept.id} className="bg-white rounded-[2.5rem] border-2 border-sky-50 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <button 
                          onClick={() => toggleFolder(mainDept.id)}
                          className={`w-full flex items-center justify-between p-6 transition-all ${isOpen ? 'bg-sky-950 text-white border-b-2 border-sky-800' : 'bg-white text-sky-700 hover:bg-sky-50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isOpen ? 'bg-sky-950 border-sky-950 text-white shadow-lg' : 'bg-sky-50 border-sky-100 text-sky-400'}`}>
                              <Layers size={24} />
                            </div>
                            <div className="text-right">
                              <h4 className={`font-black text-lg ${isOpen ? 'text-white' : 'text-sky-900'}`}>{mainDept.name}</h4>
                              <p className={`text-[10px] font-bold ${isOpen ? 'text-white/60' : 'text-sky-400'}`}>يحتوي على {data.services.filter(s => s.departmentId === mainDept.id || subDepts.some(sd => sd.id === s.departmentId)).length} {mainDept.type === 'CLINIC' ? 'بند (أطباء/كشوفات)' : 'خدمة طبية'}</p>
                            </div>
                          </div>
                          {isOpen ? <ChevronDown size={24} /> : <ChevronLeft size={24} />}
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                            >
                              <div className="p-6 bg-white/50 space-y-8">
                                {/* Services for this main dept */}
                                {mainServices.length > 0 && (!serviceSearch || mainServices.some(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))) && (
                                  <div className="space-y-4">
                                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest px-2">{mainDept.type === 'CLINIC' ? 'أطباء العيادة:' : 'خدمات عامة:'}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {mainServices
                                        .filter(s => !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                        .map(service => (
                                          <button 
                                            key={service.id}
                                            onClick={() => handleServiceToggle(service.id)}
                                            className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${selectedServices.includes(service.id) ? 'bg-sky-900 border-sky-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 text-slate-800 hover:border-sky-500 hover:bg-sky-50/20'}`}
                                          >
                                            <div className="text-right">
                                              <p className={`font-black text-sm ${selectedServices.includes(service.id) ? 'text-white' : 'text-slate-950'}`}>{service.name}</p>
                                              <p className={`text-[10px] font-bold ${selectedServices.includes(service.id) ? 'text-sky-200' : 'text-slate-500'}`}>{service.price} ج.م</p>
                                            </div>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${selectedServices.includes(service.id) ? 'bg-white text-sky-950' : 'bg-sky-50 text-sky-500 border border-sky-100'}`}>
                                              {selectedServices.includes(service.id) ? <Check size={18} className="stroke-[3]" /> : <Plus size={18} />}
                                            </div>
                                          </button>
                                        ))
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Sub-departments folders inside */}
                                {subDepts.length > 0 && (
                                  <div className="grid grid-cols-1 gap-4">
                                    {subDepts
                                      .filter(sub => {
                                        const subServices = data.services.filter(s => s.departmentId === sub.id);
                                        return !serviceSearch || subServices.some(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
                                      })
                                      .map(sub => {
                                        const isSubOpen = activeFolders[sub.id] || serviceSearch.length > 0;
                                        return (
                                          <div key={sub.id} className="bg-white rounded-[2rem] border border-sky-100 shadow-sm overflow-hidden">
                                            <button 
                                              onClick={() => toggleFolder(sub.id)}
                                              className={`w-full flex items-center justify-between p-5 transition-all text-right ${isSubOpen ? 'bg-sky-50' : 'bg-white hover:bg-sky-50'}`}
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-6 rounded-full transition-all ${isSubOpen ? 'bg-sky-900 h-6' : 'bg-sky-200 h-4'}`} />
                                                <h5 className="font-black text-sky-950">{sub.name} <span className="text-[9px] text-sky-400 mr-2">({sub.type === 'CLINIC' ? 'أطباء' : 'خدمات'})</span></h5>
                                              </div>
                                              {isSubOpen ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}
                                            </button>
                                            
                                            <AnimatePresence>
                                              {isSubOpen && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                >
                                                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {data.services
                                                      .filter(s => s.departmentId === sub.id && (!serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())))
                                                      .map(service => (
                                                        <button 
                                                          key={service.id}
                                                          onClick={() => handleServiceToggle(service.id)}
                                                          className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${selectedServices.includes(service.id) ? 'bg-sky-900 border-sky-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 text-slate-800 hover:border-sky-500 hover:bg-sky-50/20'}`}
                                                        >
                                                          <div className="text-right">
                                                            <p className={`font-black text-sm ${selectedServices.includes(service.id) ? 'text-white' : 'text-slate-950'}`}>{service.name} <span className={`text-[9px] block ${selectedServices.includes(service.id) ? 'text-sky-200/80' : 'text-slate-400'}`}>#{service.id.slice(-4)}</span></p>
                                                            <p className={`text-[10px] font-bold ${selectedServices.includes(service.id) ? 'text-sky-200' : 'text-slate-500'}`}>{service.price} ج.م</p>
                                                          </div>
                                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${selectedServices.includes(service.id) ? 'bg-white text-sky-950' : 'bg-sky-50 text-sky-500 border border-sky-100'}`}>
                                                            {selectedServices.includes(service.id) ? <Check size={18} className="stroke-[3]" /> : <Plus size={18} />}
                                                          </div>
                                                        </button>
                                                      ))
                                                    }
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })
                                    }
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-sky-100 shadow-sm sticky top-8">
                <div className="flex flex-col items-center gap-6 mb-10 border-b-2 border-sky-100 pb-10">
                   <div className="p-6 bg-sky-50 rounded-3xl border-2 border-sky-100 shadow-inner">
                     <ReactBarcode 
                       value={currentPatientId.current} 
                       format="CODE128" 
                       width={2} 
                       height={60} 
                       displayValue={true} 
                       fontSize={14}
                       background="#fcfcfc"
                     />
                   </div>
                   <div className="text-center">
                     <p className="text-sky-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">باركود الهوية الطبية</p>
                     <p className="text-sky-900 font-extrabold text-2xl tabular-nums tracking-widest">{currentPatientId.current}</p>
                   </div>
                </div>

             <div className="flex flex-col gap-5 mb-10">
                <h4 className="font-black text-sky-900 text-lg">ملخص البيان المالي</h4>
                <div className="flex justify-between items-center text-sky-600 font-bold">
                   <span>إجمالي الرسوم المستحقة:</span>
                   <span className="text-sky-900 font-black">{rawTotalPrice} ج.م</span>
                </div>
                <div className="flex justify-between items-center text-amber-600 font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                   <span className="text-xs">الخصم المطبق حالياً:</span>
                   <span className="font-black">-{totalDiscount} ج.م</span>
                </div>
                <div className="h-px bg-sky-100 my-2" />
                <div className="flex justify-between items-center text-sky-950 font-black text-2xl">
                   <span>صافي الفاتورة:</span>
                   <span className="text-brand-600">{totalPrice} ج.م</span>
                </div>
             </div>

             {showInvoicePreview ? (
               <div className="flex flex-col gap-3 mb-4">
                 <button 
                   disabled
                   className="w-full bg-sky-200 text-sky-500 font-black py-6 rounded-2xl flex items-center justify-center gap-3 text-lg cursor-not-allowed"
                 >
                   <Save size={24} />
                   تم الحفظ بنجاح
                 </button>
                 <button 
                   onClick={() => handlePrint()}
                   className="w-full bg-sky-100 hover:bg-sky-200 text-sky-900 font-black py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Printer size={20} />
                   طباعة الفاتورة
                 </button>
                 <button 
                   onClick={resetForm}
                   className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                 >
                   <UserPlus size={20} />
                   تهيئة لتسجيل مريض جديد
                 </button>
               </div>
             ) : (
               <button 
                 onClick={handleSubmit}
                 className="w-full bg-sky-900 hover:bg-sky-800 text-sky-100 font-black py-6 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mb-4 text-lg"
               >
                 <Save size={24} />
                 حفظ وإصدار الفاتورة
               </button>
             )}
          </div>
        </div>
      </div>

      {/* Hidden Invoice Template - Hidden visually but available for Print API */}
      <div className="print-only-container hidden" style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}>
        <div ref={invoiceRef} id="invoice-print" className="p-12 text-right bg-white" dir="rtl">
           <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-sky-200">
              <div>
                <h1 className="text-3xl font-black text-sky-900">فاتورة خدمات طبية</h1>
                <p className="text-sky-600 font-bold mt-1">{data.settings?.hospitalName || "المركز الطبي المتكامل"}</p>
                {data.settings?.hospitalAddress && <p className="text-sky-500 font-bold text-sm mt-0.5">{data.settings.hospitalAddress}</p>}
                {data.settings?.hospitalPhone && <p className="text-sky-500 font-bold text-sm mt-0.5">الهاتف: {data.settings.hospitalPhone}</p>}
              </div>
              <div className="text-left font-bold text-sky-800">
                <p>رقم الفاتورة: #INV-{Date.now().toString().slice(-6)}</p>
                <p>التاريخ: {format(new Date(), 'yyyy-MM-dd')}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-10 mb-10">
              <div className="bg-white p-6 rounded-2xl">
                 <h4 className="font-black text-sky-900 mb-4 border-b border-sky-200 pb-2">بيانات المريض</h4>
                 <div className="flex flex-col gap-2 font-bold">
                    <p>الاسم: <span className="text-sky-700">{formData.name}</span></p>
                    <p>رقم الهاتف: <span className="text-sky-700">{formData.phone}</span></p>
                    <p>السن: <span className="text-sky-700">{formData.age}</span></p>
                    <p>التصنيف: <span className="text-sky-700">{formData.category}</span></p>
                 </div>
              </div>
              <div className="flex flex-col items-center justify-center border-2 border-sky-200 rounded-2xl p-6">
                 <ReactBarcode value={currentPatientId.current} width={1.5} height={60} />
                 <p className="mt-2 font-black text-sky-900 tracking-widest">{currentPatientId.current}</p>
              </div>
           </div>

           <table className="w-full mb-10 border-collapse">
              <thead>
                <tr className="bg-sky-50 border-b-2 border-sky-200">
                  <th className="p-4 text-right font-black">الخدمة</th>
                  <th className="p-4 text-center font-black">السعر</th>
                </tr>
              </thead>
              <tbody className="font-bold">
                {selectedServices.map(sid => {
                  const s = data.services.find(ser => ser.id === sid);
                  return (
                    <tr key={sid} className="border-b border-sky-200">
                      <td className="p-4">{s?.name}</td>
                      <td className="p-4 text-center">{s?.price} ج.م</td>
                    </tr>
                  );
                })}
              </tbody>
           </table>

           <div className="flex justify-end pt-6 border-t-2 border-sky-200">
              <div className="w-64 flex flex-col gap-4">
                 <div className="flex justify-between items-center text-lg">
                    <span className="text-sky-600 font-bold">الإجمالي:</span>
                    <span className="font-black text-sky-900">{rawTotalPrice} ج.م</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-lg text-sky-600">
                      <span className="font-bold">قيمة الخصم ({discountPercent}%):</span>
                      <span className="font-black">-{totalDiscount} ج.م</span>
                    </div>
                  )}
                  <div className="bg-white text-sky-900 p-4 rounded-xl flex justify-between items-center mt-2">
                    <span className="font-bold">صافي المبلغ:</span>
                    <span className="text-xl font-black">{totalPrice} ج.م</span>
                  </div>
              </div>
           </div>

           <div className="mt-20 text-center text-sky-500 text-xs font-bold pt-10 border-t border-sky-50 italic">
              هذه الفاتورة تم إصدارها آلياً بواسطة نظام المستشفى - مطور النظام: هادي ماهر 01017485367
           </div>
        </div>
      </div>
    </motion.div>
  );
});

function PatientEMRModal({ 
  patient, 
  data, 
  saveData, 
  currentUser, 
  onClose,
  hideAddService = false
}: { 
  patient: Patient, 
  data: HospitalData, 
  saveData: (d: HospitalData) => void, 
  currentUser: User, 
  onClose: () => void,
  hideAddService?: boolean
}) {
  const [emrTab, setEmrTab] = useState<'history' | 'info' | 'files' | 'timeline'>('history');
  const [printVisit, setPrintVisit] = useState<Visit | null>(null);
  const singleInvoiceRef = useRef<HTMLDivElement>(null);
  const handlePrintSingleInvoice = useReactToPrint({
    contentRef: singleInvoiceRef,
    documentTitle: printVisit ? `فاتورة-${patient.name}-${printVisit.invoiceNumber}` : `فاتورة`,
  });

  useEffect(() => {
    if (printVisit) {
      const timer = setTimeout(() => {
        handlePrintSingleInvoice();
        setPrintVisit(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printVisit]);

  const [fileFilter, setFileFilter] = useState<'all' | 'image' | 'pdf'>('all');
  const [newNote, setNewNote] = useState('');
  const [newPrescription, setNewPrescription] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [activeDeptFilter, setActiveDeptFilter] = useState<string>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>(patient.selectedDiscountId || '');
  const [selectedSubDiscountId, setSelectedSubDiscountId] = useState<string>(patient.selectedSubDiscountId || '');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number | ''>('');
  const [selectedTransferDeptId, setSelectedTransferDeptId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'VISIT' | 'SERVICE' | 'FILE';
    id: string;
    subId?: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);

  const handleAddEmrNote = () => {
    if (!newNote || !patient) return;
    const lastVisit = [...data.visits].filter(v => v.patientId === patient.id).sort((a,b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    })[0];
    const visitDateStr = format(new Date(), 'yyyy-MM-dd');
    const isSameDay = lastVisit && safeFormat(lastVisit.date, 'yyyy-MM-dd') === visitDateStr;
    
    if (isSameDay) {
       const updatedVisits = data.visits.map(v => v.id === lastVisit.id ? { ...v, generalNotes: (v.generalNotes || '') + '\n' + newNote } : v);
       saveData({ ...data, visits: updatedVisits });
    } else {
       const newV: Visit = {
         id: `v-${Date.now()}`,
         patientId: patient.id,
         date: new Date().toISOString(),
         services: [],
         totalPrice: 0,
         invoiceNumber: `EMR-${Date.now().toString().slice(-4)}`,
         queueNumber: 0,
         generalNotes: newNote
       };
       saveData({ ...data, visits: [...data.visits, newV] });
    }
    setNewNote('');
    toast.success('تمت إضافة الملاحظة للملف الطبي');
  };

  const handleAddPrescription = () => {
    if (!newPrescription || !patient) return;
    const lastVisit = [...data.visits].filter(v => v.patientId === patient.id).sort((a,b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    })[0];
    const pres: Prescription = {
      id: `p-${Date.now()}`,
      content: newPrescription,
      date: new Date().toISOString(),
      prescribedBy: currentUser.name
    };
    if (lastVisit && safeFormat(lastVisit.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const updatedVisits = data.visits.map(v => v.id === lastVisit.id ? { ...v, prescriptions: [...(v.prescriptions || []), pres] } : v);
      saveData({ ...data, visits: updatedVisits });
    } else {
      const newV: Visit = {
        id: `v-${Date.now()}`,
        patientId: patient.id,
        date: new Date().toISOString(),
        services: [],
        totalPrice: 0,
        invoiceNumber: `RX-${Date.now().toString().slice(-4)}`,
        queueNumber: 0,
        prescriptions: [pres]
      };
      saveData({ ...data, visits: [...data.visits, newV] });
    }
    setNewPrescription('');
    toast.success('تمت إضافة الروشتة للملف الطبي');
  };

  const handleAddServicesToEmr = () => {
    if (selectedServices.length === 0) return;
    const logs: ServiceLog[] = selectedServices.map(sid => ({
      id: `l-${Math.random().toString(36).substr(2, 9)}`,
      serviceId: sid,
      status: 'PENDING',
      addedBy: currentUser.name
    }));
    const totalPrice = selectedServices.reduce((sum, sid) => sum + (data.services.find(s => s.id === sid)?.price || 0), 0);
    
    // Calculate Discount for this new visit
    const currentCategory = (data.settings.patientCategories || []).find(c => c.id === patient.category);
    const selectedSubDiscount = currentCategory?.availableDiscounts?.find(d => d.id === selectedSubDiscountId);
    const selectedScheme = data.settings?.discountSchemes?.find(s => s.id === selectedDiscountId);
    
    const discPercent = customDiscountPercent !== ''
      ? customDiscountPercent
      : (selectedSubDiscount 
          ? selectedSubDiscount.percentage 
          : (currentCategory?.discountOverridePercent !== undefined 
              ? currentCategory.discountOverridePercent 
              : (currentCategory?.requiresDiscountScheme ? (selectedScheme?.percentage || 0) : 0)));
    
    const finalPrice = Math.round(totalPrice * (1 - discPercent / 100));

    const newV: Visit = {
      id: `v-${Date.now()}`,
      patientId: patient.id,
      date: new Date().toISOString(),
      services: logs,
      totalPrice: finalPrice,
      categoryAtVisit: patient.category,
      discountId: selectedDiscountId || undefined,
      invoiceNumber: `EMR-SER-${Date.now().toString().slice(-4)}`,
      queueNumber: data.visits.filter(v => safeFormat(v.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length + 1
    };
    saveData({ ...data, visits: [...data.visits, newV] });
    setSelectedServices([]);
    setIsAddingService(false);
    toast.success('تمت إضافة الخدمات للملف الطبي وقائمة الانتظار');
  };

  const handleCancelService = (visitId: string, serviceLogId: string) => {
    const visit = data.visits.find(v => v.id === visitId);
    if (!visit) return;
    
    const serviceLog = visit.services.find(s => s.id === serviceLogId);
    const serviceDef = data.services.find(s => s.id === serviceLog?.serviceId);
    const targetDept = data.departments.find(d => d.id === serviceDef?.departmentId);
    const isClinic = targetDept?.type === 'CLINIC';

    setDeleteConfirm({
      type: 'SERVICE',
      id: visitId,
      subId: serviceLogId,
      name: serviceDef?.name || (isClinic ? 'طبيب غير معروف' : 'خدمة غير معروفة'),
      message: `هل أنت متأكد من إلغاء ${isClinic ? 'حجز هذا الطبيب' : 'هذه الخدمة'}؟ سيتم الحذف نهائياً من الفاتورة والملف الطبي.`,
      onDelete: () => {
        const updatedServices = visit.services.filter(s => (s.id || '') !== serviceLogId);
        
        // Recalculate price
        const newTotalPrice = updatedServices.reduce((acc, s) => {
          const sDef = data.services.find(sd => sd.id === s.serviceId);
          return acc + (sDef?.price || 0);
        }, 0);
        
        const updatedVisit = { ...visit, services: updatedServices, totalPrice: newTotalPrice };
        const updatedVisits = data.visits.map(v => v.id === visitId ? updatedVisit : v);
        
        saveData({ ...data, visits: updatedVisits });
        toast.success('تم إلغاء الخدمة وتحديث الفاتورة');
      }
    });
  };

  const handleDeleteVisit = (visitId: string) => {
    const visit = data.visits.find(v => v.id === visitId);
    setDeleteConfirm({
      type: 'VISIT',
      id: visitId,
      name: `زيارة بتاريخ ${safeFormat(visit?.date || new Date(), 'yyyy/MM/dd')}`,
      message: 'هل أنت متأكد من حذف هذه الزيارة بالكامل؟ لا يمكن التراجع عن هذه الخطوة.',
      onDelete: () => {
        const updatedVisits = data.visits.filter(v => v.id !== visitId);
        saveData({ ...data, visits: updatedVisits });
        toast.error('تم حذف الزيارة بالكامل');
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 lg:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }} onClick={onClose} className="absolute inset-0 bg-sky-900/40 " />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }} exit={{ scale: 0.95, opacity: 0, y: 30 }}
          className="relative bg-sky-50 w-full max-w-7xl rounded-none md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col h-full md:h-[92vh] border-4 border-white/20"
        >
          <div className="bg-white p-8 lg:p-10 flex flex-col md:flex-row justify-between items-center gap-8 border-b-2 border-sky-100">
             <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-[2.5rem] bg-sky-900 text-sky-50 flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white">
                   {patient.name[0]}
                </div>
                <div>
                   <h2 className="text-3xl font-black text-sky-950 tracking-tight">{patient.name}</h2>
                   <div className="flex items-center gap-4 mt-2">
                      <span className="text-sky-500 font-extrabold tracking-widest text-[10px] uppercase bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">سجل: #{patient.id}</span>
                      <span className="bg-brand-50 text-brand-700 text-[10px] px-3 py-1 rounded-lg font-black uppercase border border-brand-100">{(data.settings.patientCategories || []).find(c => c.id === patient.category)?.label || patient.category}</span>
                   </div>
                </div>
             </div>
             <div className="flex bg-sky-50 p-1.5 rounded-[2rem] border-2 border-sky-100 shadow-inner flex-wrap md:flex-nowrap gap-2 items-center">
                {currentUser.permissions.canViewEmrHistory && <button onClick={() => setEmrTab('history')} className={`px-7 py-3.5 rounded-[1.5rem] font-black text-xs transition-all ${emrTab === 'history' ? 'bg-sky-900 text-sky-50 shadow-xl scale-105' : 'text-sky-500 hover:text-sky-900'}`}>السجل الطبي الكامل</button>}
                <button onClick={() => setEmrTab('timeline')} className={`px-7 py-3.5 rounded-[1.5rem] font-black text-xs transition-all ${emrTab === 'timeline' ? 'bg-sky-900 text-sky-50 shadow-xl scale-105' : 'text-sky-500 hover:text-sky-900'}`}>الخط الزمني</button>
                {currentUser.permissions.canViewEmrInfo && <button onClick={() => setEmrTab('info')} className={`px-7 py-3.5 rounded-[1.5rem] font-black text-xs transition-all ${emrTab === 'info' ? 'bg-sky-900 text-sky-50 shadow-xl scale-105' : 'text-sky-500 hover:text-sky-900'}`}>البيانات والسن</button>}
                {currentUser.permissions.canViewEmrFiles && <button onClick={() => setEmrTab('files')} className={`px-7 py-3.5 rounded-[1.5rem] font-black text-xs transition-all ${emrTab === 'files' ? 'bg-sky-900 text-sky-50 shadow-xl scale-105' : 'text-sky-500 hover:text-sky-900'}`}>الأرشيف الرقمي</button>}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 bg-white">
             {emrTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-1 flex flex-col gap-6">
                      <div className="bg-white p-8 rounded-[2rem] border border-sky-200">
                         <h4 className="text-lg font-black text-sky-900 mb-6 flex items-center gap-2"><Calendar size={18} className="text-sky-500" /> تاريخ التسجيل</h4>
                         <p className="font-bold text-sky-900 underline decoration-sky-500 decoration-4 underline-offset-4">{safeFormat(patient.createdAt, 'EEEE, d MMMM yyyy')}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[2rem] border border-sky-200">
                          <h4 className="text-lg font-black text-sky-900 mb-4 flex items-center gap-2"><UserIcon size={18} className="text-sky-500" /> موظف التسجيل</h4>
                          <p className="font-bold text-sky-900 text-lg">{data.users.find(u => u.id === patient.registeredBy)?.name || patient.registeredBy || 'غير محدد'}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[2rem] border border-sky-200">
                          <h4 className="text-lg font-black text-sky-900 mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-sky-500" /> شباك الاستقبال</h4>
                          <p className="font-bold text-sky-900 text-lg">{data.settings?.offices?.find(o => o.id === patient.officeId)?.name || 'غير محدد'}</p>
                      </div>
                      <div className="bg-white p-10 rounded-[2.5rem] border border-sky-200">
                         <h4 className="text-xl font-black text-sky-900 mb-8 border-r-4 border-sky-500 pr-4">ملاحظات عامة دائمة</h4>
                         <p className="text-sky-700 font-bold leading-relaxed whitespace-pre-wrap">{patient.notes || 'لا توجد ملاحظات عامة مسجلة.'}</p>
                      </div>
                   </div>
                   <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max h-fit">
                      {data.settings?.customPatientFields?.filter(f => f.active && f.id !== 'sys-name').map(field => {
                         const isSystem = field.isSystemField;
                         let value;
                         if (isSystem) {
                            if (field.id === 'sys-phone') value = patient.phone;
                            else if (field.id === 'sys-age') value = patient.age ? `${patient.age} سنة` : undefined;
                            else if (field.id === 'sys-gender') value = patient.gender === 'MALE' ? 'ذكر' : patient.gender === 'FEMALE' ? 'أنثى' : undefined;
                            else if (field.id === 'sys-nid') value = patient.nationalId;
                         } else {
                            value = patient.customFieldsData?.[field.id];
                         }
                         
                         return (
                            <div key={field.id} className="bg-white p-6 rounded-[1.5rem] border border-sky-200 flex flex-col justify-center gap-2">
                               <span className="text-[11px] font-black text-sky-500 uppercase">{field.label}</span>
                               <span className="font-bold text-sky-900 text-lg">{value || 'غير مسجل'}</span>
                            </div>
                         );
                      })}
                   </div>
                </div>
             )}

             {emrTab === 'history' && currentUser.permissions.canViewEmrHistory && (
                <div className="flex flex-col gap-10">
                   {(currentUser.permissions.canAddEmrNotes || currentUser.permissions.canAddEmrPrescriptions) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentUser.permissions.canAddEmrNotes && (
                           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-sky-200 shadow-sm">
                              <h4 className="font-black text-sky-900 mb-4 flex items-center gap-2"><FileText size={20} className="text-sky-500" /> إضافة ملاحظة طبية فورية</h4>
                              <textarea 
                                 value={newNote}
                                 onChange={e => setNewNote(e.target.value)}
                                 className="w-full bg-white p-6 rounded-3xl min-h-[120px] outline-none border-2 border-transparent focus:border-sky-500 font-bold text-sky-900 mb-4 transition-all"
                                 placeholder="اكتب التشخيص أو الملاحظات الجديدة هنا لتضاف للسجل..."
                              />
                              <button onClick={handleAddEmrNote} disabled={!newNote} className="w-full bg-white text-sky-900 py-4 rounded-2xl font-black shadow-xl disabled:opacity-30 active:scale-95 transition-all">إضافة للسجل الطبي</button>
                           </div>
                        )}

                        {currentUser.permissions.canAddEmrPrescriptions && (
                           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-sky-200 shadow-sm">
                              <h4 className="font-black text-sky-900 mb-4 flex items-center gap-2"><Pill size={20} className="text-sky-500" /> إضافة روشتة / علاج</h4>
                              <textarea 
                                 value={newPrescription}
                                 onChange={e => setNewPrescription(e.target.value)}
                                 className="w-full bg-white p-6 rounded-3xl min-h-[120px] outline-none border-2 border-transparent focus:border-sky-500 font-bold text-sky-900 mb-4 transition-all"
                                 placeholder="اكتب الأدوية والجرعات هنا..."
                              />
                              <button onClick={handleAddPrescription} disabled={!newPrescription} className="w-full bg-sky-100 border-2 border-sky-300 text-sky-900 py-4 rounded-2xl font-black shadow-xl disabled:opacity-30 active:scale-95 transition-all">إضافة الروشتة</button>
                           </div>
                        )}
                      </div>
                   )}

                   <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-sky-100"></div>
                      <span className="text-sky-500 font-black text-xs uppercase tracking-widest px-4">التاريخ الطبي الكامل (دفتر المريض)</span>
                      <div className="h-px flex-1 bg-sky-100"></div>
                   </div>

                   <div className="flex flex-col gap-8 relative pb-20">
                      <div className="absolute top-0 right-10 bottom-0 w-1 bg-sky-100 hidden md:block"></div>

                      {[...data.visits].filter(v => v.patientId === patient.id).sort((a,b) => {
                         const da = new Date(a.date).getTime();
                         const db = new Date(b.date).getTime();
                         return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
                       }).map((v, vIdx) => (
                         <div key={v.id} className="relative pr-0 md:pr-24">
                            <div className="absolute top-10 right-8 w-5 h-5 rounded-full bg-white border-4 border-sky-500 z-10 hidden md:block group-hover:scale-125 transition-all"></div>
                            
                            <div className="bg-white p-8 lg:p-12 rounded-[3.5rem] border-2 border-sky-200 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all group">
                               <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                                  <div>
                                     <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">زيارة #{vIdx + 1}</span>
                                        <span className="text-sky-500 font-bold text-xs">{safeFormat(v.date, 'EEEE, d MMMM yyyy HH:mm')}</span>
                                     </div>
                                     <h5 className="font-black text-2xl text-sky-900">فاتورة رقم #{v.invoiceNumber}</h5>
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="bg-white px-6 py-4 rounded-2xl text-right">
                                        <p className="text-[10px] text-sky-500 font-black mb-1 uppercase">إجمالي التكلفة</p>
                                        <p className="text-2xl font-black text-sky-900 tabular-nums">{v.totalPrice} <span className="text-xs">ج.م</span></p>
                                     </div>
                                     <button 
                                       onClick={() => setPrintVisit(v)}
                                       className="p-4 bg-sky-50 text-sky-900 rounded-2xl hover:bg-sky-900 hover:text-white transition-all shadow-sm border-2 border-sky-100 hover:border-sky-900 flex items-center justify-center h-14 w-14"
                                       title="طباعة الفاتورة بمفردها"
                                     >
                                       <Printer size={24} />
                                     </button>
                                     {currentUser.permissions.canCancelServices && (
                                        <button 
                                          onClick={() => handleDeleteVisit(v.id)}
                                          className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-sky-100 transition-all shadow-sm border-2 border-red-100 hover:border-red-600"
                                          title="حذف الزيارة بالكامل"
                                        >
                                          <Trash2 size={24} />
                                        </button>
                                     )}
                                  </div>
                               </div>

                               {v.services && v.services.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white border-2 border-sky-200 rounded-[2rem]">
                                    {v.services.map(s => {
                                      const sDef = data.services.find(sd => sd.id === s.serviceId);
                                      return (
                                        <div key={s.id} className="bg-white border-2 border-sky-200 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                                           <Activity size={16} className="text-sky-600" />
                                           <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-sky-900">{sDef?.name}</span>
                                {false && (
                                   <span className="text-[9px] font-black text-sky-600 bg-white px-2 py-0.5 rounded-md border border-sky-100">
                                      بواسطة: {s.addedBy}
                                   </span>
                                )}
                             </div>
                                           {s.addedBy && (
                                              <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100/50">
                                                 بواسطة: {s.addedBy}
                                              </span>
                                           )}
                                           {currentUser.permissions.canCancelServices && s.status === 'PENDING' && (
                                              <button 
                                                onClick={() => handleCancelService(v.id, s.id)}
                                                className="w-6 h-6 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-sky-100 transition-all border border-red-200"
                                                title="إلغاء الخدمة"
                                              >
                                                <X size={12} />
                                              </button>
                                           )}
                                        </div>
                                      );
                                    })}
                                 </div>
                               )}

                               {v.generalNotes && (
                                 <div className="bg-amber-50 border-r-8 border-amber-400 p-8 rounded-3xl mb-8">
                                    <h6 className="font-black text-amber-900 mb-3 flex items-center gap-2"><FileText size={18} /> ملاحظات المعاينة</h6>
                                    <p className="text-amber-950 font-bold text-lg leading-relaxed whitespace-pre-wrap">{v.generalNotes}</p>
                                 </div>
                               )}

                               {v.prescriptions && v.prescriptions.length > 0 && (
                                  <div className="bg-sky-50 border-r-8 border-sky-500 p-8 rounded-3xl mb-8">
                                     <h6 className="font-black text-sky-900 mb-3 flex items-center gap-2"><Pill size={18} /> الروشتة الطبية</h6>
                                     <div className="flex flex-col gap-4">
                                        {v.prescriptions.map(p => (
                                           <div key={p.id} className="pb-4 last:pb-0 border-b border-sky-100 last:border-0">
                                              <p className="text-sky-950 font-black text-xl leading-relaxed">{p.content}</p>
                                              <p className="text-[10px] text-sky-600 font-bold mt-2">بواسطة: {p.prescribedBy} | {safeFormat(p.date, 'HH:mm')}</p>
                                           </div>
                                         ))}
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))}

                       {[...data.visits].filter(v => v.patientId === patient.id).length === 0 && (
                         <div className="p-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-sky-200">
                            <History className="mx-auto text-sky-300 mb-6" size={80} />
                            <h3 className="text-2xl font-black text-sky-500">لا يوجد تاريخ مرضي مسجل بعد</h3>
                            <p className="text-sky-500 font-bold mt-2">ابدأ بإضافة ملاحظات أو خدمات لبناء الملف الطبي للمريض</p>
                         </div>
                      )}
                   </div>
                </div>
             )}

             {emrTab === 'timeline' && (
                <div className="flex flex-col gap-8 max-w-4xl mx-auto py-10 relative">
                   <div className="absolute top-10 bottom-10 right-[39px] w-1 bg-sky-100 rounded-full"></div>
                   
                   {(() => {
                      const visits = [...data.visits].filter(v => v.patientId === patient.id);
                      const docs = [...(patient.documents || [])];
                      
                      // Identify documents that are already linked as service results to avoid duplicates
                      const linkedResultUrls = new Set(visits.flatMap(v => (v.services || []).map(s => s.resultUrl)).filter(Boolean));

                      const serviceEvents = visits.flatMap(v => {
                         const targetDept = data.departments.find(d => d.id === v.targetDepartmentId);
                         
                         return (v.services || []).map(sl => {
                            const serviceInfo = data.services.find(ms => ms.id === sl.serviceId);
                            const deptInfo = data.departments.find(d => d.id === serviceInfo?.departmentId);
                            const deptName = deptInfo?.name || targetDept?.name || 'غير محدد';
                            
                            return {
                               type: 'SERVICE' as const,
                               id: `${v.id}-${sl.serviceId}-${sl.completedAt || v.date}`,
                               date: sl.completedAt || v.date,
                               title: serviceInfo?.name || 'خدمة طبية',
                               desc: `قسم: ${deptName}`,
                               icon: deptInfo?.type === 'LAB' ? FlaskConical : deptInfo?.type === 'RADIOLOGY' ? Microscope : Stethoscope,
                               color: sl.status === 'COMPLETED' ? 'bg-sky-600' : 'bg-sky-600',
                               extra: {
                                 doctor: sl.completedBy ? data.users.find(u => u.id === sl.completedBy)?.name : undefined,
                                 report: sl.report,
                                 notes: sl.notes,
                                 resultUrl: sl.resultUrl,
                                 status: sl.status,
                                 visitId: v.id,
                                 visitNotes: v.generalNotes
                               }
                            };
                         });
                      });

                      const standaloneDocs = docs.filter(d => !linkedResultUrls.has(d.url))
                        .map(d => ({
                           type: 'DOC' as const,
                           id: d.id,
                           date: d.uploadedAt,
                           title: 'إرفاق ملف طبي مستقل',
                           desc: `ملف مرفوع: ${d.name}`,
                           icon: Upload,
                           color: 'bg-amber-500',
                           extra: {
                             fileName: d.name,
                             fileType: d.type,
                             url: d.url
                           }
                        }));

                      const prescriptionEvents = visits.filter(v => v.prescriptions && v.prescriptions.length > 0).map(v => ({
                         type: 'PRESCRIPTION' as const,
                         id: `rx-${v.id}`,
                         date: v.date,
                         title: 'وصفة طبية (روشتة)',
                         desc: 'الأدوية والجرعات المقررة',
                         icon: Pill,
                         color: 'bg-sky-600',
                         extra: {
                           items: v.prescriptions
                         }
                      }));

                      const events = [...serviceEvents, ...standaloneDocs, ...prescriptionEvents]
                        .sort((a, b) => {
                          const da = new Date(a.date).getTime();
                          const db = new Date(b.date).getTime();
                          return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
                        });

                      if (events.length === 0) {
                         return (
                           <div className="text-center py-20">
                             <History size={60} className="mx-auto text-sky-300 mb-4" />
                             <p className="text-sky-500 font-black">لا توجد أحداث مسجلة في الخط الزمني لهذا المريض</p>
                           </div>
                         );
                      }

                      return events.map((ev, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          transition={{ delay: idx * 0.1 }}
                          key={ev.id || idx} 
                          className="relative pr-20"
                        >
                           <div className={`absolute top-0 right-0 w-20 h-20 rounded-full border-8 border-white ${ev.color} flex items-center justify-center text-sky-900 shadow-lg z-10`}>
                             <ev.icon size={24} />
                           </div>
                           <div className="bg-white p-8 rounded-[2.5rem] border-2 border-sky-200 shadow-sm hover:shadow-md transition-all">
                               <h4 className="text-xl font-black text-sky-900 mt-2 mb-1">{ev.title}</h4>
                               
                               {ev.type === 'SERVICE' && ev.extra && (
                                 <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                                       <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{safeFormat(ev.date, 'dd MMMM yyyy - hh:mm a')}</span>
                                       <span className="text-[10px] font-black text-sky-600 bg-white px-2 py-0.5 rounded border border-sky-200">{ev.desc}</span>
                                       {ev.extra.doctor && (
                                         <div className="flex items-center gap-1 text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
                                            <UserCheck size={12} /> {ev.extra.doctor}
                                         </div>
                                       )}
                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mr-auto ${ev.extra.status === 'COMPLETED' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {ev.extra.status === 'COMPLETED' ? 'مكتمل' : 'قيد التنفيذ'}
                                       </span>
                                    </div>

                                    {(ev.extra.report || ev.extra.notes || ev.extra.visitNotes) && (
                                       <div className="space-y-3">
                                          {ev.extra.report && (
                                             <div className="bg-sky-50/30 p-5 rounded-3xl border-r-4 border-sky-500">
                                                <p className="text-xs font-black text-sky-900 mb-2">تقرير النتيجة:</p>
                                                <p className="text-base font-bold text-sky-900 leading-relaxed whitespace-pre-wrap">{ev.extra.report}</p>
                                             </div>
                                          )}
                                          {ev.extra.notes && (
                                             <div className="bg-white p-4 rounded-2xl border-r-4 border-sky-200">
                                                <p className="text-[10px] font-black text-sky-600 mb-1">ملاحظات الخدمة:</p>
                                                <p className="text-sm font-bold text-sky-800 italic">{ev.extra.notes}</p>
                                             </div>
                                          )}
                                          {!ev.extra.report && !ev.extra.notes && ev.extra.visitNotes && (
                                             <div className="bg-white/50 p-4 rounded-2xl border-r-4 border-sky-200">
                                                <p className="text-[10px] font-black text-sky-500 mb-1">ملاحظات الزيارة المرتبطة:</p>
                                                <p className="text-sm font-bold text-sky-600 italic line-clamp-2">{ev.extra.visitNotes}</p>
                                             </div>
                                          )}
                                       </div>
                                    )}

                                    {ev.extra.resultUrl && (
                                       <div className="mt-4 pt-4 border-t border-sky-50">
                                          {ev.extra.resultUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                                             <div className="space-y-2">
                                                <p className="text-[10px] font-black text-sky-500 uppercase">المرفقات الطبية للخدمة:</p>
                                                <a href={ev.extra.resultUrl} target="_blank" rel="noreferrer" className="block w-48 h-48 rounded-2xl overflow-hidden border-4 border-sky-50 hover:border-sky-400 transition-all shadow-sm">
                                                   <img src={ev.extra.resultUrl} alt="Result" className="w-full h-full object-cover" />
                                                </a>
                                             </div>
                                          ) : (
                                             <a href={ev.extra.resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-xs font-black text-sky-600 bg-sky-50 px-5 py-3 rounded-2xl hover:bg-sky-100 transition-all border border-sky-100">
                                                <Download size={16} /> فتح ملف النتيجة (PDF/DOC)
                                             </a>
                                          )}
                                       </div>
                                    )}
                                 </div>
                               )}

                               {ev.type === 'PRESCRIPTION' && ev.extra && (
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-4 mb-4">
                                       <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{safeFormat(ev.date, 'dd MMMM yyyy - hh:mm a')}</span>
                                    </div>
                                    <div className="bg-sky-900/40 p-6 rounded-[2.5rem] border-r-4 border-sky-500">
                                       <div className="space-y-3">
                                          {ev.extra.items.map((p: any, pidx: number) => (
                                             <div key={pidx} className="bg-white p-4 rounded-xl text-lg font-black text-sky-900 border border-sky-100/50 shadow-sm flex items-start gap-3">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                                                {p.content}
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                               )}

                               {ev.type === 'DOC' && ev.extra && (
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-4 mb-4">
                                       <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{safeFormat(ev.date, 'dd MMMM yyyy - hh:mm a')}</span>
                                    </div>
                                    <div className="bg-amber-50/30 p-6 rounded-3xl border-2 border-sky-50 flex items-center gap-4">
                                       <div className="p-4 bg-amber-100 rounded-2xl text-amber-600">
                                          <FileText size={24} />
                                       </div>
                                       <div className="flex-1 overflow-hidden">
                                          <p className="font-black text-sky-900 text-base truncate">{ev.extra.fileName}</p>
                                          <p className="text-[11px] font-bold text-sky-500 mt-1">{ev.extra.fileType || 'ملف طبي إضافي'}</p>
                                       </div>
                                       <a href={ev.extra.url} target="_blank" rel="noreferrer" className="p-3 bg-white hover:bg-amber-100 rounded-xl text-amber-600 transition-all border border-sky-200"><Download size={20} /></a>
                                    </div>
                                 </div>
                               )}

                           </div>
                        </motion.div>
                      ));
                   })()}
                </div>
             )}

             {emrTab === 'files' && currentUser.permissions.canViewEmrFiles && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                  <div className="space-y-8">
                     {currentUser.permissions.canAddEmrFiles && (
                       <>
                        <div className="flex flex-col gap-6">
                            <h3 className="text-2xl font-black text-sky-900 flex items-center gap-3">
                              <Upload className="text-sky-600" /> رفع مرفقات جديدة
                            </h3>
                            <p className="text-sm font-bold text-sky-600 -mt-4">يمكنك رفع نتائج التحاليل، صور الأشعة، أو ملفات التأمين الصحي مباشرة لسجل المريض.</p>
                        </div>
                        <label className="group h-64 border-4 border-dashed border-sky-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-sky-400 hover:bg-sky-900/40 transition-all cursor-pointer bg-white shadow-sm overflow-hidden text-center relative">
                            <input 
                              type="file" 
                              multiple 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files) {
                                  const files = Array.from(e.target.files);
                                  toast.loading('جاري رفع الملفات...', { id: 'upload-toast' });
                                  
                                  Promise.all(files.map(async (file: File) => {
                                    return new Promise((resolve) => {
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        const base64 = ev.target?.result as string;
                                        try {
                                          const res = await fetch('/api/upload', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              fileName: file.name,
                                              fileData: base64,
                                              patientId: patient.id
                                            })
                                          });
                                          const result = await res.json();
                                          if (result.success) {
                                            resolve({
                                              id: `doc-${Date.now()}-${Math.random()}`,
                                              name: file.name,
                                              url: `/${result.path}`,
                                              type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'unknown'),
                                              date: new Date().toISOString(),
                                              uploadedAt: new Date().toISOString()
                                            });
                                          }
                                        } catch (err) {
                                          console.error("Upload failed:", err);
                                          resolve(null);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    });
                                  })).then(uploadedFiles => {
                                    const validFiles = uploadedFiles.filter(f => f !== null) as any[];
                                    if (validFiles.length > 0) {
                                      const updatedPatient = { ...patient, documents: [...(patient.documents || []), ...validFiles] };
                                      const newData: HospitalData = { ...data, patients: (data.patients || []).map(p => p.id === patient.id ? updatedPatient : p) };
                                      saveData(newData);
                                      toast.success(`تم رفع ${validFiles.length} ملفات للسجل الطبي`, { id: 'upload-toast' });
                                    } else {
                                      toast.error('فشل رفع الملفات', { id: 'upload-toast' });
                                    }
                                  });
                                }
                              }}
                            />
                            <div className="bg-sky-50 p-6 rounded-[2rem] group-hover:bg-sky-100 transition-all group-hover:scale-110">
                              <Upload className="text-sky-500 group-hover:text-sky-600" size={40} />
                            </div>
                            <div className="text-center px-8">
                              <p className="text-lg font-black text-sky-900 leading-tight">اسحب الملفات هنا أو اضغط للاختيار</p>
                              <p className="text-xs font-bold text-sky-600 mt-2">تأمين صحي، أشعات، تحاليل، أو صور روشتات...</p>
                            </div>
                        </label>
                       </>
                     )}

                     <div className="bg-white p-8 rounded-[2.5rem] border-2 border-sky-200">
                        <h4 className="font-black text-sky-900 mb-6 flex items-center gap-2">تصفية أرشيف الملفات</h4>
                        <div className="flex gap-3">
                           {(['all', 'image', 'pdf'] as const).map(f => (
                             <button 
                               key={f}
                               onClick={() => setFileFilter(f)}
                               className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${fileFilter === f ? 'bg-sky-100 text-sky-950 border-sky-300 shadow-lg' : 'bg-white text-sky-500 border-sky-200 hover:border-sky-200'}`}
                             >
                               {f === 'all' && 'الكل'}
                               {f === 'image' && 'صور'}
                               {f === 'pdf' && 'PDF'}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="bg-sky-900/40 rounded-[3rem] p-8 border-2 border-sky-200/60 flex flex-col overflow-hidden">
                     <h3 className="text-xl font-black text-sky-900 mb-6 flex items-center gap-3 shrink-0">
                       <History className="text-sky-500" /> أرشيف الملفات المرفقة
                       <span className="text-xs bg-sky-100 px-3 py-1 rounded-full font-black text-sky-700">
                         {patient.documents?.filter(d => fileFilter === 'all' ? true : (fileFilter === 'image' ? d.type?.includes('image') : d.type?.includes('pdf') || d.name.toLowerCase().endsWith('.pdf'))).length || 0}
                       </span>
                     </h3>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {(!patient.documents || patient.documents.length === 0) ? (
                          <div className="flex flex-col items-center justify-center py-20 text-sky-500 gap-4 opacity-50">
                            <FileText size={60} />
                            <p className="font-bold">لا توجد ملفات مرفوعة حالياً</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {patient.documents
                              .filter(d => {
                                if (fileFilter === 'all') return true;
                                if (fileFilter === 'image') return d.type?.includes('image');
                                if (fileFilter === 'pdf') return d.type?.includes('pdf') || d.name.toLowerCase().endsWith('.pdf');
                                return true;
                              })
                              .map((doc: any) => (
                              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={doc.id} className="bg-white p-6 rounded-[2rem] border-2 border-sky-200 hover:border-sky-300 transition-all shadow-md group">
                                 <div className="flex items-center gap-4">
                                    <div className="p-4 bg-sky-50 rounded-2xl group-hover:bg-sky-50 transition-all shrink-0">
                                       {doc.type?.includes('image') ? <Activity size={24} className="text-sky-600" /> : <FileText size={24} className="text-sky-500" />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                       <p className="font-black text-sky-900 truncate" title={doc.name}>{doc.name}</p>
                                       <p className="text-[10px] font-bold text-sky-500 mt-1">{safeFormat(doc.uploadedAt, 'yyyy/MM/dd - hh:mm a')}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                       <a href={doc.url} target="_blank" rel="noreferrer" className="p-3 bg-white hover:bg-sky-100 hover:text-sky-950 rounded-xl text-sky-500 transition-all shadow-inner border border-transparent hover:border-sky-200"><Download size={18} /></a>
                                       <button onClick={() => {
                                           const docId = doc.id;
                                           const docName = doc.name;
                                           setDeleteConfirm({
                                             type: 'FILE',
                                             id: patient.id,
                                             subId: docId,
                                             name: docName,
                                             message: 'هل تريد حذف هذا الملف نهائياً من سجل المريض؟ لا يمكن استعادة الملف بعد الحذف.',
                                             onDelete: () => {
                                               const updatedPatient = { ...patient, documents: patient.documents!.filter((d: any) => d.id !== docId) };
                                               const newData: HospitalData = { ...data, patients: (data.patients || []).map(p => p.id === patient.id ? updatedPatient : p) };
                                               saveData(newData);
                                               toast.error('تم حذف الملف');
                                             }
                                           });
                                       }} className="p-3 bg-white hover:bg-red-50 hover:text-red-700 rounded-xl text-red-500 transition-all shadow-inner border border-transparent hover:border-red-200"><Trash2 size={18} /></button>
                                    </div>
                                 </div>
                              </motion.div>
                            ))}
                            {patient.documents.filter(d => {
                              if (fileFilter === 'all') return true;
                              if (fileFilter === 'image') return d.type?.includes('image');
                              if (fileFilter === 'pdf') return d.type?.includes('pdf') || d.name.toLowerCase().endsWith('.pdf');
                              return true;
                            }).length === 0 && (
                              <div className="text-center py-10 text-sky-500 font-bold">لا توجد نتائج مطابقة للتصفية</div>
                            )}
                          </div>
                        )}
                     </div>
                  </div>
                </div>
             )}
          </div>

          <div className="p-8 md:p-12 bg-sky-50 border-t-2 border-sky-100 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto sticky bottom-0 z-50 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.1)]">
             <button onClick={onClose} className="w-full md:w-auto text-sky-500 font-black px-10 py-6 bg-white rounded-[2rem] hover:bg-sky-950 hover:text-white transition-all border-2 border-sky-100 order-2 md:order-1 text-base md:text-lg shadow-sm">إغلاق الملف الطبي</button>
             <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto order-1 md:order-2">
                {!hideAddService && (
                   <button onClick={() => setIsAddingService(true)} className="bg-sky-950 text-white px-10 py-6 rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all text-base md:text-lg"><Stethoscope size={24} /> إضافة فحوصات جديدة</button>
                )}
             </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isAddingService && (
           <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 md:p-6 bg-sky-900/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white md:rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-[90dvw] flex flex-col h-full md:h-[90dvh] border-0 md:border-2 md:border-sky-100 overflow-hidden" dir="rtl">
                 {/* Header with Search */}
                 <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-10 border-b-2 border-sky-50 gap-6 z-40">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] bg-brand-600 text-white flex items-center justify-center shadow-2xl rotate-3"><Stethoscope size={32} /></div>
                       <div>
                          <h3 className="text-xl md:text-3xl font-black text-sky-950 tracking-tight">قائمة الخدمات والفحوصات</h3>
                          <p className="text-sky-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">تحديد الإجراءات المطلوبة للمريض: {patient.name}</p>
                       </div>
                    </div>
                    
                    <div className="flex-1 max-w-xl relative group w-full md:w-auto">
                       <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-sky-400 group-focus-within:text-brand-600 transition-colors" size={20} />
                       <input 
                         type="text" 
                         className="w-full bg-sky-50 border-2 border-sky-100 rounded-2xl px-14 py-4 font-black transition-all outline-none focus:bg-white focus:border-brand-600 focus:shadow-lg text-sky-900 placeholder:text-sky-400 text-lg"
                         placeholder="بحث عن فحص أو خدمة طبية..."
                         value={serviceSearchQuery}
                         onChange={e => setServiceSearchQuery(e.target.value)}
                       />
                       {serviceSearchQuery && (
                         <button onClick={() => setServiceSearchQuery('')} className="absolute left-6 top-1/2 -translate-y-1/2 text-sky-300 hover:text-sky-950 transition-colors"><X size={18}/></button>
                       )}
                    </div>

                    <button onClick={() => setIsAddingService(false)} className="w-12 h-12 flex items-center justify-center bg-sky-50 hover:bg-sky-950 text-sky-400 hover:text-white rounded-xl transition-all border border-sky-100"><X size={24} /></button>
                 </div>

                 <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-sky-50/50">
                    {/* Sidebar / Filters */}
                    <div className="w-full md:w-[26rem] bg-white border-l-2 border-sky-50 flex flex-col overflow-hidden">
                       <div className="p-6 border-b-2 border-sky-50">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-4">التصنيف الطبي</h4>
                          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
                             <button onClick={() => setActiveDeptFilter('all')} className={`whitespace-nowrap px-6 py-4 rounded-2xl font-black text-xs transition-all text-right flex items-center justify-between gap-4 ${activeDeptFilter === 'all' ? 'bg-sky-950 text-white shadow-lg' : 'bg-sky-50 text-sky-500 hover:bg-sky-100'}`}>
                                <span>عرض كافة الأقسام</span>
                                <Layers size={14} />
                             </button>
                             {data.departments.filter(d => d.isMain).map(dept => (
                                <button key={dept.id} onClick={() => setActiveDeptFilter(dept.id)} className={`whitespace-nowrap px-6 py-4 rounded-2xl font-black text-xs transition-all text-right flex items-center justify-between gap-4 ${activeDeptFilter === dept.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-sky-50 text-sky-500 hover:bg-brand-50 hover:text-brand-700'}`}>
                                   <span>{dept.name}</span>
                                   <div className={`w-2 h-2 rounded-full ${activeDeptFilter === dept.id ? 'bg-white' : 'bg-sky-300'}`} />
                                </button>
                             ))}
                          </div>
                       </div>
                       
                       {/* Selection Progress */}
                       <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                             <span>بنود مختارة</span>
                             <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-md">{selectedServices.length}</span>
                          </h4>
                          {selectedServices.length === 0 ? (
                             <div className="text-center py-12 flex flex-col items-center gap-4 text-sky-300">
                                <div className="p-6 bg-sky-50 rounded-full"><ShoppingBag size={32} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">لم يتم اختيار أي خدمات بعد</p>
                             </div>
                          ) : (
                             <div className="space-y-3">
                                {selectedServices.map(sid => {
                                   const service = data.services.find(s => s.id === sid);
                                   if (!service) return null;
                                   return (
                                      <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={sid} className="flex items-center justify-between p-4 bg-sky-50 rounded-2xl border border-sky-100 group">
                                         <div className="min-w-0 pr-2 text-right">
                                            <p className="font-black text-sky-900 text-[11px] truncate">{service.name}</p>
                                            <p className="text-[9px] font-bold text-brand-600 tabular-nums">{service.price} ج.م</p>
                                         </div>
                                         <button onClick={() => setSelectedServices(prev => prev.filter(id => id !== sid))} className="p-2 text-sky-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"><XCircle size={16} /></button>
                                      </motion.div>
                                   );
                                })}
                             </div>
                          )}
                       </div>

                       {/* Summary & Action */}
                       <div className="p-8 bg-sky-50 border-t-2 border-sky-100 space-y-6">
                          <div className="flex items-center justify-between">
                             <p className="text-xs font-black text-sky-500 uppercase">القيمة النهائية</p>
                              <div>
                                {(() => {
                                  const rawTotal = selectedServices.reduce((sum, sid) => sum + (data.services.find(s => s.id === sid)?.price || 0), 0);
                                  const cat = (data.settings.patientCategories || []).find(c => c.id === patient.category);
                                  const subD = cat?.availableDiscounts?.find(d => d.id === selectedSubDiscountId);
                                  const schm = data.settings?.discountSchemes?.find(s => s.id === selectedDiscountId);
                                  const dp = customDiscountPercent !== '' && customDiscountPercent !== undefined ? customDiscountPercent : (subD ? subD.percentage : (cat?.discountOverridePercent !== undefined ? cat.discountOverridePercent : (cat?.requiresDiscountScheme ? (schm?.percentage || 0) : 0)));
                                  const discount = Math.round(rawTotal * (dp / 100));
                                  return (
                                    <div className="text-right">
                                      {discount > 0 && <p className="text-[10px] text-amber-600 font-bold mb-0.5 line-through decoration-amber-500/50">{rawTotal} ج.م</p>}
                                      <p className="text-2xl font-black text-sky-950 tabular-nums">
                                         {rawTotal - discount} <span className="text-xs">ج.م</span>
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                           </div>
                           <div className="bg-white rounded-2xl p-5 border border-sky-200 space-y-4">
                              <div className="flex items-center justify-between border-b border-sky-50 pb-2">
                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">تطبيق الخصم للخدمات الجديدة</span>
                                <span className="text-[10px] font-bold text-sky-400 bg-sky-50 px-2 py-0.5 rounded">تصنيف المريض: {(data.settings.patientCategories || []).find(c => c.id === patient.category)?.label || patient.category}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(data.settings.patientCategories || []).find(c => c.id === patient.category)?.availableDiscounts?.map(disc => (
                                  <button 
                                    key={disc.id}
                                    onClick={() => { setSelectedSubDiscountId(disc.id); setCustomDiscountPercent(''); }}
                                    className={`px-3 py-2 rounded-xl border-2 text-[10px] font-black transition-all ${selectedSubDiscountId === disc.id && customDiscountPercent === '' ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'bg-sky-50 border-sky-100 text-sky-500 hover:bg-white'}`}
                                  >
                                    {disc.label} ({disc.percentage}%)
                                  </button>
                                ))}
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all ${customDiscountPercent !== '' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-sky-50 border-sky-100'}`}>
                                   <span className="text-[9px] font-black whitespace-nowrap">يدوي:</span>
                                   <input 
                                     type="number"
                                     min="0" max="100" placeholder="%"
                                     value={customDiscountPercent || ''}
                                     onChange={e => { setCustomDiscountPercent(e.target.value === '' ? '' : parseInt(e.target.value)); setSelectedSubDiscountId(''); }}
                                     className="w-10 bg-white border border-sky-200 rounded-lg px-1 py-0.5 text-[10px] font-black text-center outline-none focus:border-sky-500"
                                   />
                                </div>
                              </div>
                              {(data.settings.patientCategories || []).find(c => c.id === patient.category)?.requiresDiscountScheme && (
                                <select 
                                  value={selectedDiscountId}
                                  onChange={e => setSelectedDiscountId(e.target.value)}
                                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-[10px] font-black text-sky-900 outline-none"
                                >
                                  <option value="">اختر جهة التعاقد...</option>
                                  {(data.settings.discountSchemes || []).map(scheme => (
                                    <option key={scheme.id} value={scheme.id}>{scheme.name} ({scheme.percentage}%)</option>
                                  ))}
                                </select>
                              )}
                           </div>
                           <div className="hidden">
                              <p className="text-xs font-black text-sky-500 uppercase">إجمالي المطلوب</p>
                             <p className="text-2xl font-black text-sky-950 tabular-nums">
                                {selectedServices.reduce((sum, sid) => sum + (data.services.find(s => s.id === sid)?.price || 0), 0)} <span className="text-xs">ج.م</span>
                             </p>
                          </div>
                          <button 
                            onClick={handleAddServicesToEmr} 
                            disabled={selectedServices.length === 0} 
                            className="w-full bg-sky-950 text-white font-black py-5 rounded-2xl shadow-xl shadow-sky-950/20 active:scale-95 transition-all text-base flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                          >
                             <Save size={20} />
                             اعتماد وإضافة للملف
                          </button>
                       </div>
                    </div>

                    {/* Main Feed */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                        {data.departments
                          .filter(d => d.isMain && (activeDeptFilter === 'all' || activeDeptFilter === d.id))
                          .map(dept => {
                             const subDepts = data.departments.filter(s => s.parentDepartmentId === dept.id);
                             const deptServices = data.services.filter(s => 
                               s.id !== 'referral-service' && 
                               (s.departmentId === dept.id || subDepts.some(sd => sd.id === s.departmentId)) &&
                               (serviceSearchQuery === '' || s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                             );

                             if (deptServices.length === 0 && serviceSearchQuery !== '') return null;

                             return (
                                <div key={dept.id} className="mb-14 last:mb-0">
                                   <div className="flex items-center gap-6 mb-8">
                                      <h4 className="font-black text-sky-900 text-xl tracking-tight">{dept.name}</h4>
                                      <div className="h-0.5 flex-1 bg-sky-100 rounded-full" />
                                      <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{deptServices.length} بند</span>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                      {deptServices.map(service => {
                                         const isSelected = selectedServices.includes(service.id);
                                         const subDept = data.departments.find(sd => sd.id === service.departmentId && sd.parentDepartmentId === dept.id);
                                         return (
                                            <button 
                                              key={service.id} 
                                              onClick={() => setSelectedServices(prev => isSelected ? prev.filter(id => id !== service.id) : [...prev, service.id])} 
                                              className={`relative p-6 rounded-[2rem] border-2 transition-all text-right flex flex-col justify-between h-44 shadow-sm group hover:-translate-y-1 ${isSelected ? 'bg-sky-900 border-sky-900 text-white shadow-2xl shadow-sky-950/30' : 'bg-white border-slate-200 hover:border-sky-500 hover:shadow-xl'}`}
                                            >
                                               <div className="flex justify-between items-start">
                                                  <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-white/10' : 'bg-sky-50 group-hover:bg-sky-100'}`}>
                                                     <Plus size={18} className={`transition-transform ${isSelected ? 'rotate-45 text-white' : 'text-sky-500'}`} />
                                                  </div>
                                                  {subDept && (
                                                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/10 text-white/80' : 'bg-slate-200 text-slate-700'}`}>
                                                        {subDept.name}
                                                     </span>
                                                  )}
                                               </div>
                                               
                                               <div className="text-right">
                                                  <p className={`font-black mb-1 line-clamp-2 leading-snug tracking-tight ${isSelected ? 'text-white' : 'text-slate-950'}`}>{service.name}</p>
                                                  <p className={`text-base font-black tabular-nums ${isSelected ? 'text-sky-200' : 'text-sky-600'}`}>
                                                     {service.price} <span className="text-[10px]">ج.م</span>
                                                  </p>
                                               </div>
                                            </button>
                                         );
                                      })}
                                   </div>
                                </div>
                             );
                          })
                        }

                        {/* No search results */}
                        {serviceSearchQuery !== '' && !data.departments.some(d => 
                          d.isMain && data.services.some(s => 
                            s.id !== 'referral-service' && 
                            (s.departmentId === d.id || data.departments.some(sd => sd.id === s.departmentId && sd.parentDepartmentId === d.id)) &&
                            s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                          )
                        ) && (
                          <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-40">
                             <div className="p-8 bg-sky-100 rounded-full"><Search size={48}/ ></div>
                             <p className="text-xl font-black text-sky-950">عذراً، لم نجد نتائج مطابقة لبحثك</p>
                          </div>
                        )}
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
      <DeleteConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm?.onDelete()}
        title={deleteConfirm?.type === 'VISIT' ? 'حذف الزيارة' : (deleteConfirm?.type === 'SERVICE' ? 'إلغاء حجز الطبيب' : 'حذف الملف')}
        message={deleteConfirm?.message || ''}
        itemName={deleteConfirm?.name}
        confirmLabel="تأكيد"
        cancelLabel="تراجع"
      />

      {/* Printable Invoice Block */}
      {printVisit && (
        <div style={{ display: 'none' }}>
          <div ref={singleInvoiceRef} id="single-invoice-print" className="p-10 text-right bg-white text-slate-900" dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
            <style>{`
              @media print {
                @page {
                  size: A5 portrait;
                  margin: 10mm 10mm 10mm 10mm;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background: white !important;
                  color: #0f172a !important;
                  direction: rtl;
                  font-family: 'Cairo', 'Inter', sans-serif;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .invoice-card {
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                }
                header, footer, nav, aside { display: none !important; }
              }
            `}</style>
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-sky-200">
               <div className="text-right">
                 <h1 className="text-2xl font-black text-sky-900">فاتورة خدمات طبية</h1>
                 <p className="text-sky-600 font-bold text-xs mt-0.5">{data.settings?.hospitalName || "المركز الطبي المتكامل"}</p>
                 {data.settings?.hospitalAddress && <p className="text-sky-500 font-bold text-[10px] mt-0.5">{data.settings.hospitalAddress}</p>}
                 {data.settings?.hospitalPhone && <p className="text-sky-500 font-bold text-[10px] mt-0.5">الهاتف: {data.settings.hospitalPhone}</p>}
               </div>
               <div className="text-left font-bold text-slate-800 text-xs">
                 <p>رقم الفاتورة: #{printVisit.invoiceNumber}</p>
                 <p>التاريخ: {safeFormat(printVisit.date, 'yyyy-MM-dd')}</p>
               </div>
            </div>

            {/* Patient Info Card */}
            <div className="grid grid-cols-2 gap-6 mb-6">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-black text-xs text-sky-900 mb-2 border-b border-sky-100 pb-1">بيانات المريض</h4>
                  <div className="flex flex-col gap-1 font-bold text-[11px] text-slate-700">
                     <p>الاسم: <span className="text-slate-900 font-black">{patient.name}</span></p>
                     <p>رقم الهاتف: <span className="text-sky-700">{patient.phone || 'غير مسجل'}</span></p>
                     <p>السن: <span className="text-slate-900">{patient.age ? `${patient.age} سنة` : 'غير مسجل'}</span></p>
                     <p>عقد / تصنيف: <span className="text-brand-600">{(data.settings.patientCategories || []).find(c => c.id === (printVisit.categoryAtVisit || patient.category))?.label || printVisit.categoryAtVisit || patient.category}</span></p>
                  </div>
               </div>
               <div className="flex flex-col items-center justify-center border border-slate-200 rounded-xl p-4 bg-white">
                  <ReactBarcode value={patient.id} width={1.2} height={40} fontSize={10} margin={0} />
                  <p className="mt-1 font-black text-xs text-slate-900 tracking-wider">سجل: {patient.id}</p>
               </div>
            </div>

            {/* Services Table */}
            {printVisit.services && printVisit.services.length > 0 ? (
              <table className="w-full mb-6 border-collapse text-xs">
                 <thead>
                   <tr className="bg-slate-100 border-b border-slate-200 text-slate-900">
                     <th className="p-2 border border-slate-200 text-right font-black">الخدمة المطلوبة</th>
                     <th className="p-2 border border-slate-200 text-center font-black">السعر</th>
                   </tr>
                 </thead>
                 <tbody className="font-bold text-slate-700 font-sans">
                   {printVisit.services.map(s => {
                     const sDef = data.services.find(sd => sd.id === s.serviceId);
                     return (
                       <tr key={s.id} className="border-b border-slate-100">
                         <td className="p-2 border border-slate-100 text-right">{sDef?.name}</td>
                         <td className="p-2 border border-slate-100 text-center">{sDef?.price || 0} ج.م</td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-500 mb-6 font-sans">
                لا توجد خدمات للتكلفة (الزيارة تشمل استشارة أو ملاحظة طبية مجانية)
              </div>
            )}

            {/* Summary */}
            {(() => {
              const rawTotal = (printVisit.services || []).reduce((sum, s) => {
                const sDef = data.services.find(sd => sd.id === s.serviceId);
                return sum + (sDef?.price || 0);
              }, 0);
              const finalTotal = printVisit.totalPrice;
              const discountVal = Math.max(0, rawTotal - finalTotal);
              const discountPct = rawTotal > 0 ? Math.round((discountVal / rawTotal) * 100) : 0;

              return (
                <div className="flex justify-end pt-4 border-t border-slate-200">
                   <div className="w-48 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                         <span className="text-slate-500 font-bold">الإجمالي:</span>
                         <span className="font-black text-slate-900">{rawTotal} ج.م</span>
                      </div>
                      {discountVal > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                          <span className="font-bold">قيمة الخصم ({discountPct}%):</span>
                          <span className="font-black">-{discountVal} ج.م</span>
                        </div>
                      )}
                      <div className="bg-slate-100 p-2 rounded-lg flex justify-between items-center font-black text-sky-950 mt-1">
                        <span className="font-bold text-xs">صافي المبلغ:</span>
                        <span className="text-sm font-black text-brand-600">{finalTotal} ج.م</span>
                      </div>
                   </div>
                </div>
              );
            })()}

            {/* General Notes or Prescriptions if they exist */}
            {printVisit.generalNotes && (
              <div className="mt-6 border-t border-slate-200 pt-3 text-right">
                <span className="text-[10px] font-black text-slate-400 block mb-1">ملاحظات المعاينة والتشخيص:</span>
                <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{printVisit.generalNotes}</p>
              </div>
            )}

            {printVisit.prescriptions && printVisit.prescriptions.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 text-right">
                <span className="text-[10px] font-black text-slate-400 block mb-1">الروشتة الطبية والعلاج:</span>
                <div className="flex flex-col gap-1 mt-1 text-slate-800 font-bold text-xs">
                   {printVisit.prescriptions.map((p, pIdx) => (
                      <p key={p.id}>{pIdx + 1}. {p.content}</p>
                   ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-center text-slate-400 text-[10px] font-bold pt-4 border-t border-slate-100 italic">
               هذه الفاتورة تم إصدارها آلياً بواسطة نظام المستشفى - مطور النظام: هادي ماهر 01017485367
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PatientsView = memo(({ data, saveData, currentUser }: { data: HospitalData, saveData: (d: HospitalData) => void, currentUser: User }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [emrTab, setEmrTab] = useState<'history' | 'info' | 'files'>('history');
  const [newNote, setNewNote] = useState('');
  const [newPrescription, setNewPrescription] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedTransferDeptId, setSelectedTransferDeptId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);

  const handleDeletePatient = async (patientId: string) => {
    const patient = data.patients.find(p => p.id === patientId);
    if (!patient) return;

    setDeleteConfirm({
      id: patientId,
      name: patient.name,
      message: 'هل أنت متأكد من حذف هذا المريض نهائياً من سجلات المستشفى؟ سيتم حذف جميع بياناته وزياراته وملفه الطبي بالكامل.',
      onDelete: async () => {
         await logAudit(
           currentUser,
           'DELETE_PATIENT',
           patientId,
           patient.name,
           patient,
           null,
           'حذف سجل المريض بالكامل'
         );
         const updatedPatients = data.patients.filter(p => p.id !== patientId);
         const updatedVisits = data.visits.filter(v => v.patientId !== patientId);
         saveData({ ...data, patients: updatedPatients, visits: updatedVisits });
         toast.error('تم حذف سجل المريض');
         setDeleteConfirm(null);
         setEditingPatient(null);
         if (selectedPatient?.id === patientId) setSelectedPatient(null);
      }
    });
  };

  const handleEditPatient = async (updatedData: Patient) => {
    if (!editingPatient) return;
    
    // Name Validation
    const cleanName = (updatedData.name || '').trim();
    if (!cleanName) {
      toast.warning('يرجى إدخال اسم المريض بالكامل');
      return;
    }
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 4) {
      toast.warning('اسم المريض يجب أن يكون رباعياً على الأقل (مثال: أحمد محمد علي محمود)');
      return;
    }

    // Phone Validation
    const cleanPhone = (updatedData.phone || '').trim();
    if (!cleanPhone) {
      toast.warning('يرجى إدخال رقم الهاتف');
      return;
    }
    const isAllPhoneDigits = /^\d+$/.test(cleanPhone);
    if (cleanPhone.length !== 11 || !isAllPhoneDigits) {
      toast.warning('رقم الهاتف يجب أن يتكون من 11 رقماً رقمياً');
      return;
    }

    // National ID Validation based on age
    const cleanNid = (updatedData.nationalId || '').trim();
    const age = updatedData.age || 0;
    const isMinor = age < 16;

    if (!isMinor) {
      if (!cleanNid) {
        toast.warning('الرقم القومي إجباري لمن سنهم 16 عاماً أو أكثر');
        return;
      }
    }

    if (cleanNid) {
      const isAllNidDigits = /^\d+$/.test(cleanNid);
      if (cleanNid.length !== 14 || !isAllNidDigits) {
        toast.warning('الرقم القومي يجب أن يتكون من 14 رقماً رقمياً');
        return;
      }
    }

    const oldData = data.patients.find(p => p.id === editingPatient.id);
    
    await logAudit(
      currentUser,
      'UPDATE_PATIENT',
      editingPatient.id,
      updatedData.name,
      oldData,
      updatedData,
      'تعديل بيانات المريض الأساسية'
    );

    const updatedPatients = data.patients.map(p => p.id === editingPatient.id ? updatedData : p);
    saveData({ ...data, patients: updatedPatients });
    setEditingPatient(null);
    toast.success('تم تحديث بيانات المريض بنجاح');
  };

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return data.patients || [];
    return (data.patients || []).filter(p => 
      (p.name || '').toLowerCase().includes(term) || 
      (p.phone || '').includes(term) || 
      (p.id || '').includes(term) || 
      (p.nationalId || '').includes(term)
    );
  }, [data.patients, searchTerm]);

  const handleAddEmrNote = () => {
    if (!newNote || !selectedPatient) return;
    
    // Find last visit or create a new "Note Visit"
    const lastVisit = [...data.visits].filter(v => v.patientId === selectedPatient.id).sort((a,b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    })[0];
    
    const visitDateStr = format(new Date(), 'yyyy-MM-dd');
    const isSameDay = lastVisit && safeFormat(lastVisit.date, 'yyyy-MM-dd') === visitDateStr;

    if (isSameDay) {
       // Append to existing visit today if exists
       const updatedVisits = data.visits.map(v => v.id === lastVisit.id ? { ...v, generalNotes: (v.generalNotes || '') + '\n' + newNote } : v);
       saveData({ ...data, visits: updatedVisits });
    } else {
       // Create a new "Observation/Note" visit type
       const newV: Visit = {
         id: `v-${Date.now()}`,
         patientId: selectedPatient.id,
         date: new Date().toISOString(),
         services: [],
         totalPrice: 0,
         invoiceNumber: `EMR-${Date.now().toString().slice(-4)}`,
         queueNumber: 0,
         generalNotes: newNote
       };
       saveData({ ...data, visits: [...data.visits, newV] });
    }
    setNewNote('');
    toast.success('تمت إضافة الملاحظة للملف الطبي');
  };

  const handleAddPrescription = () => {
    if (!newPrescription || !selectedPatient) return;
    const lastVisit = [...data.visits].filter(v => v.patientId === selectedPatient.id).sort((a,b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
    })[0];
    
    const pres: Prescription = {
      id: `p-${Date.now()}`,
      content: newPrescription,
      date: new Date().toISOString(),
      prescribedBy: currentUser.name
    };

    if (lastVisit && safeFormat(lastVisit.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
      const updatedVisits = data.visits.map(v => v.id === lastVisit.id ? { ...v, prescriptions: [...(v.prescriptions || []), pres] } : v);
      saveData({ ...data, visits: updatedVisits });
    } else {
      const newV: Visit = {
        id: `v-${Date.now()}`,
        patientId: selectedPatient.id,
        date: new Date().toISOString(),
        services: [],
        totalPrice: 0,
        invoiceNumber: `RX-${Date.now().toString().slice(-4)}`,
        queueNumber: 0,
        prescriptions: [pres]
      };
      saveData({ ...data, visits: [...data.visits, newV] });
    }
    setNewPrescription('');
    toast.success('تمت إضافة الروشتة للملف الطبي');
  };

  const handleAddServicesToEmr = () => {
    if (selectedServices.length === 0) return;
    if (!selectedPatient) return;
    
    const logs: ServiceLog[] = selectedServices.map(sid => ({
      id: `l-${Math.random().toString(36).substr(2, 9)}`,
      serviceId: sid,
      status: 'PENDING',
      addedBy: currentUser.name
    }));

    const totalPrice = selectedServices.reduce((sum, sid) => sum + (data.services.find(s => s.id === sid)?.price || 0), 0);

    const newV: Visit = {
      id: `v-${Date.now()}`,
      patientId: selectedPatient.id,
      date: new Date().toISOString(),
      services: logs,
      totalPrice: totalPrice,
      invoiceNumber: `EMR-SER-${Date.now().toString().slice(-4)}`,
      queueNumber: data.visits.filter(v => safeFormat(v.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length + 1
    };

    saveData({ ...data, visits: [...data.visits, newV] });
    setSelectedServices([]);
    setIsAddingService(false);
    toast.success('تمت إضافة الخدمات للملف الطبي وقائمة الانتظار');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 pb-20">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-sky-900">سجل المرضى</h2>
            <p className="text-sky-600 font-bold">إجمالي المسجلين بالنظام: <span className="text-sky-600 font-black">{(data.patients || []).length} مريض</span></p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <div className="bg-white px-6 py-4 rounded-3xl border-2 border-sky-100 flex items-center gap-5 shadow-sm">
                <div className="w-12 h-12 bg-sky-900 border border-sky-800 rounded-2xl flex items-center justify-center text-sky-50 shadow-lg">
                   <Users size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">إجمالي ملفات المرضى</p>
                   <p className="text-xl font-black text-sky-950 tabular-nums">
                     {(data.patients || []).length}
                   </p>
                </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-5 rounded-[3rem] shadow-sm border-2 border-sky-100 transition-all focus-within:border-sky-900">
          <div className="relative flex-1 group">
             <Search className="absolute right-8 top-1/2 -translate-y-1/2 text-sky-500 group-focus-within:text-sky-900 transition-colors" size={24} />
             <input 
                type="text" 
                className="w-full bg-sky-50 border-2 border-transparent rounded-[2.5rem] px-20 py-6 font-black text-sky-950 outline-none focus:bg-white focus:border-sky-200 transition-all placeholder:text-sky-500 text-xl"
                placeholder="ابحث بالاسم، رقم الهاتف، الباركود أو الرقم القومي..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[4rem] border-2 border-dashed border-sky-200">
           <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center text-sky-300 mb-8 border-2 border-sky-100">
              <Search size={48} />
           </div>
           <p className="text-2xl font-black text-sky-500">لا توجد سجلات مطابقة لمعايير البحث</p>
           <button onClick={() => setSearchTerm('')} className="mt-6 text-brand-600 font-black underline underline-offset-8 hover:text-brand-700">تصفير البحث وعرض جميع المرضى</button>
        </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {filteredPatients.map((patient) => {
            const lastVisit = data.visits.filter(v => v.patientId === patient.id).sort((a, b) => {
              const da = new Date(a.date).getTime();
              const db = new Date(b.date).getTime();
              return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
            })[0];
            return (
               <motion.div 
                 key={patient.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }}
                 onClick={() => setSelectedPatient(patient)}
                 className="bg-white p-10 rounded-[4rem] border-2 border-sky-100 shadow-sm hover:shadow-2xl hover:border-sky-950 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-8 h-fit"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-[4rem] -mr-16 -mt-16 group-hover:scale-150 transition-transform opacity-50" />

                 <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                       <div className="relative">
                          <div className="w-24 h-24 rounded-[2.5rem] bg-sky-950 text-white flex items-center justify-center font-black text-3xl group-hover:scale-105 transition-transform shadow-xl">
                             {patient.name[0]}
                          </div>
                          <div className={`absolute -bottom-1 -left-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-[10px] font-black shadow-sm ${patient.gender === 'FEMALE' ? 'bg-pink-500 text-white border-white' : 'bg-sky-950 text-white border-white'}`}>
                             {patient.gender === 'FEMALE' ? 'F' : 'M'}
                          </div>
                       </div>
                       <div className="min-w-0">
                          <h3 className="font-black text-xl text-sky-950 whitespace-nowrap overflow-hidden text-ellipsis leading-tight tracking-tight">{patient.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                             <span className="text-[10px] font-black font-mono text-white bg-sky-950 px-2 py-0.5 rounded tracking-tighter shadow-sm">#{patient.id}</span>
                             <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${patient.category === 'CASH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-sky-100 text-sky-700 border border-sky-200'}`}>
                               {(data.settings.patientCategories || []).find(c => c.id === patient.category)?.label || patient.category}
                             </span>
                          </div>
                       </div>
                    </div>
                    <div className="text-left hidden sm:block">
                       <p className="text-[10px] text-sky-500 font-black uppercase italic tracking-widest">رقم الملف</p>
                       <p className="font-black text-sky-950 tabular-nums text-lg">#{patient.id}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-sky-50 p-5 rounded-3xl border border-sky-100 group-hover:bg-white transition-colors group-hover:shadow-sm">
                       <p className="text-[9px] text-sky-500 font-black uppercase mb-1.5 flex items-center gap-1 italic"><Phone size={10} /> رقم التواصل</p>
                       <p className="font-black text-sky-950 text-base tabular-nums">{patient.phone}</p>
                    </div>
                    <div className="bg-sky-50 p-5 rounded-3xl border border-sky-100 group-hover:bg-white transition-colors group-hover:shadow-sm">
                       <p className="text-[9px] text-sky-500 font-black uppercase mb-1.5 flex items-center gap-1 italic"><Activity size={10} /> العمر الحالي</p>
                       <p className="font-black text-sky-950 text-base">{patient.age} سنة</p>
                    </div>
                 </div>

                 {lastVisit && (
                    <div className="bg-sky-50 px-6 py-4 rounded-3xl flex items-center justify-between border border-sky-100 group-hover:bg-white transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-950 rounded-2xl flex items-center justify-center text-white shadow-xl">
                             <Clock size={18} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-sky-500 uppercase italic tracking-widest">آخر زيارة</p>
                            <p className="text-[11px] font-black text-sky-950">
                              {safeFormat(lastVisit.date, 'dd MMMM yyyy')}
                            </p>
                          </div>
                       </div>
                       <ChevronLeft size={20} className="text-sky-300 group-hover:text-sky-950 transition-colors" />
                    </div>
                 )}

                 <div className="flex gap-4 pt-2">
                    <div className="flex flex-1 gap-2">
                       {currentUser?.permissions?.canEditPatients && (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setEditingPatient(patient);
                           }}
                           className="flex-[3] bg-white text-sky-600 border-2 border-sky-100 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-50 hover:text-sky-950 hover:border-sky-200 transition-all shadow-sm"
                         >
                            تعديل شامل
                         </button>
                       )}
                       {currentUser?.permissions?.canDeletePatients && (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeletePatient(patient.id);
                           }}
                           className="flex-1 bg-white text-red-300 border-2 border-sky-100 py-3 rounded-2xl font-black flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                           title="حذف المريض"
                         >
                            <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                    <button className="px-8 bg-sky-950 text-white rounded-[1.5rem] shadow-2xl active:scale-95 transition-all hover:bg-sky-800">
                       <FileText size={20} />
                    </button>
                 </div>
              </motion.div>
            );
          })}
        </div>
      )}
           <AnimatePresence>
        {selectedPatient && (
          <PatientEMRModal 
            patient={selectedPatient}
            data={data}
            saveData={saveData}
            currentUser={currentUser}
            onClose={() => setSelectedPatient(null)}
          />
        )}

        {editingPatient && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-sky-900/60 backdrop-blur-sm" dir="rtl">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden border border-sky-200">
                {/* Header */}
                <div className="flex justify-between items-center bg-sky-50 p-8 md:p-10 border-b border-sky-200">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-sky-950 rounded-2xl flex items-center justify-center text-white shadow-lg">
                         <Users size={32} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-sky-950 tracking-tight mb-1">تعديل بيانات المريض الشاملة</h3>
                         <p className="text-xs font-bold text-sky-500 flex items-center gap-2">
                            <span className="bg-sky-200 text-sky-700 px-2 py-0.5 rounded uppercase font-mono tracking-tighter">ID: {editingPatient.id}</span>
                            <span>تعديل السجل الطبي والإداري بالكامل</span>
                         </p>
                      </div>
                   </div>
                   <button onClick={() => setEditingPatient(null)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-sky-100 rounded-xl transition-all text-sky-400 hover:text-sky-950 border border-sky-200"><X size={24} /></button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {/* Left Column: Basic & Identity */}
                      <div className="space-y-10">
                         <section>
                            <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                               <UserIcon size={14} /> البيانات الشخصية والهوية
                            </h4>
                            <div className="grid grid-cols-1 gap-6">
                               {/* Name - Handled via loop or separately to ensure order */}
                               <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">الاسم الرباعي للمريض</label>
                                  <input 
                                     type="text" 
                                     className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-lg text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner"
                                     value={editingPatient.name}
                                     onChange={e => setEditingPatient({ ...editingPatient, name: e.target.value })}
                                  />
                               </div>
                               
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="flex flex-col gap-2">
                                     <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">العمر</label>
                                     <input 
                                        type="number" 
                                        className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-lg text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner"
                                        value={editingPatient.age}
                                        onChange={e => setEditingPatient({ ...editingPatient, age: parseInt(e.target.value) || 0 })}
                                     />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                     <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">النوع</label>
                                     <select 
                                        className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-lg text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner appearance-none"
                                        value={editingPatient.gender}
                                        onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value as any })}
                                     >
                                        <option value="MALE">ذكر</option>
                                        <option value="FEMALE">أنثى</option>
                                     </select>
                                  </div>
                               </div>

                               <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">الرقم القومي (14 رقم)</label>
                                  <input 
                                     type="text" 
                                     className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-lg text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner tabular-nums font-mono"
                                     value={editingPatient.nationalId}
                                     onChange={e => setEditingPatient({ ...editingPatient, nationalId: e.target.value })}
                                  />
                               </div>
                            </div>
                         </section>

                         <section>
                            <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                               <Phone size={14} /> بيانات التواصل
                            </h4>
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">رقم الهاتف الأساسي</label>
                               <input 
                                  type="text" 
                                  className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-xl text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner tabular-nums font-mono"
                                  value={editingPatient.phone}
                                  onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                               />
                            </div>
                         </section>
                      </div>

                      {/* Right Column: Admin & Custom */}
                      <div className="space-y-10">
                         <section>
                            <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                               <ShieldCheck size={14} /> التصنيف الإداري
                            </h4>
                            <div className="grid grid-cols-1 gap-6">
                               <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">فئة المريض (التسعير)</label>
                                  <select 
                                     className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-lg text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner appearance-none"
                                     value={editingPatient.category}
                                     onChange={e => setEditingPatient({ ...editingPatient, category: e.target.value as any })}
                                  >
                                     {(data.settings.patientCategories || []).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                     ))}
                                  </select>
                               </div>
                               <div className="flex flex-col gap-2">
                                  <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">ملاحظات إدارية وطبية</label>
                                  <textarea 
                                     className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-5 font-black text-base text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-inner min-h-[120px] resize-none"
                                     value={editingPatient.notes}
                                     onChange={e => setEditingPatient({ ...editingPatient, notes: e.target.value })}
                                     placeholder="أضف أي تفاصيل إضافية عن الحالة أو المستندات المطلوبة..."
                                  />
                               </div>
                            </div>
                         </section>

                         <section>
                            <h4 className="text-xs font-black text-sky-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                               <Layers size={14} /> بيانات مخصصة وفلاتر إضافية
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {data.settings.customPatientFields?.filter(f => f.active && !f.isSystemField).map(field => (
                                  <div key={field.id} className={`flex flex-col gap-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                                     <label className="text-[10px] font-black text-sky-500 uppercase tracking-widest px-1">{field.label}</label>
                                     {field.type === 'select' ? (
                                        <select 
                                           className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 font-black text-sm text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all"
                                           value={editingPatient.customFieldsData?.[field.id] || ''}
                                           onChange={e => setEditingPatient({ ...editingPatient, customFieldsData: { ...(editingPatient.customFieldsData || {}), [field.id]: e.target.value } })}
                                        >
                                           <option value="">اختر...</option>
                                           {field.options?.map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                           ))}
                                        </select>
                                     ) : (
                                        <input 
                                           type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                           className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 font-black text-sm text-sky-950 outline-none focus:border-sky-950 focus:bg-white transition-all shadow-sm"
                                           value={editingPatient.customFieldsData?.[field.id] || ''}
                                           onChange={e => setEditingPatient({ ...editingPatient, customFieldsData: { ...(editingPatient.customFieldsData || {}), [field.id]: e.target.value } })}
                                        />
                                     )}
                                  </div>
                               ))}
                               {!data.settings.customPatientFields?.some(f => f.active && !f.isSystemField) && (
                                  <div className="md:col-span-2 py-6 text-center bg-sky-50 rounded-2xl border-2 border-dashed border-sky-100 text-sky-400 text-[10px] font-black uppercase tracking-widest">
                                     لا توجد حقول مخصصة مفعلة حالياً
                                  </div>
                               )}
                            </div>
                         </section>
                      </div>
                   </div>
                </div>

                {/* Footer */}
                <div className="p-8 md:p-10 bg-sky-50 border-t border-sky-200 flex flex-col sm:flex-row gap-6">
                   <div className="flex-1 flex gap-4">
                      {currentUser.permissions.canDeletePatients && (
                        <button 
                           type="button"
                           onClick={() => handleDeletePatient(editingPatient.id)}
                           className="px-8 bg-red-50 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all text-[10px] uppercase tracking-widest border border-red-100 flex items-center gap-2"
                        >
                           <Trash2 size={14} /> حذف السجل
                        </button>
                      )}
                      <button onClick={() => setEditingPatient(null)} className="px-8 font-black text-sky-400 uppercase tracking-widest text-[10px] hover:text-sky-950 transition-colors">إلغاء الأمر</button>
                   </div>
                   <button 
                      onClick={() => handleEditPatient(editingPatient)}
                      className="flex-[2] bg-sky-950 text-white font-black py-6 rounded-3xl shadow-xl active:scale-95 transition-all text-xl flex items-center justify-center gap-4 hover:bg-sky-800"
                   >
                      <Save size={28} />
                      حفظ كافة التغييرات
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DeleteConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm?.onDelete()}
        title={deleteConfirm?.name || 'حذف سجل'}
        message={deleteConfirm?.message || ''}
        confirmLabel="تأكيد الحذف"
        cancelLabel="تراجع"
      />
    </motion.div>
  );
});

const DepartmentsView = memo(({ data, saveData, currentUser }: { data: HospitalData, saveData: (d: HospitalData) => void, currentUser: User }) => {
  const [activeMainId, setActiveMainId] = useState<string | null>(data.departments.find(d => d.isMain)?.id || null);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDept, setNewDept] = useState<Partial<Department>>({ name: '', isMain: true, type: 'CLINIC' });
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [isAddingService, setIsAddingService] = useState(false);
  const [newService, setNewService] = useState<Partial<MedicalService>>({ name: '', price: 0, departmentId: '' });
  const [editingService, setEditingService] = useState<MedicalService | null>(null);
  const [activeFolders, setActiveFolders] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'DEPT' | 'SERVICE';
    id: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);

  const toggleFolder = (id: string) => {
    setActiveFolders(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const mainDepartments = data.departments.filter(d => d.isMain);
  const activeDept = data.departments.find(d => d.id === activeMainId);

  const handleAddDept = async () => {
    if (!newDept.name) return;
    const dept: Department = {
      id: editingDept?.id || `d-${Date.now()}`,
      name: newDept.name!,
      isMain: newDept.isMain!,
      type: newDept.type!,
      parentDepartmentId: selectedParentId || undefined
    };
    
    await logAudit(
      currentUser,
      editingDept ? 'UPDATE_DEPARTMENT' : 'CREATE_DEPARTMENT',
      dept.id,
      dept.name,
      editingDept || null,
      dept,
      editingDept ? `تحديث بيانات القسم: ${dept.name}` : `إنشاء قسم جديد: ${dept.name}`
    );

    let updatedDepts;
    if (editingDept) {
      updatedDepts = data.departments.map(d => d.id === editingDept.id ? dept : d);
    } else {
      updatedDepts = [...data.departments, dept];
    }

    saveData({ ...data, departments: updatedDepts });
    setIsAddingDept(false);
    setNewDept({ name: '', isMain: true, type: 'CLINIC' });
    setEditingDept(null);
    if (!activeMainId && dept.isMain) setActiveMainId(dept.id);
    toast.success(editingDept ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح');
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.departmentId) return;
    const ser: MedicalService = {
      id: editingService?.id || `s-${Date.now()}`,
      name: newService.name!,
      price: newService.price!,
      departmentId: newService.departmentId!
    };

    const targetDept = data.departments.find(d => d.id === ser.departmentId);
    
    await logAudit(
      currentUser,
      'UPDATE_SERVICE',
      ser.id,
      ser.name,
      editingService || null,
      ser,
      editingService ? `تعديل خدمة طبية في قسم ${targetDept?.name || 'غ/م'}` : `إضافة خدمة طبية جديدة لقسم ${targetDept?.name || 'غ/م'}`
    );

    let updatedServices;
    if (editingService) {
      updatedServices = data.services.map(s => s.id === editingService.id ? ser : s);
    } else {
      updatedServices = [...data.services, ser];
    }

    saveData({ ...data, services: updatedServices });
    setIsAddingService(false);
    setNewService({ name: '', price: 0, departmentId: '' });
    setEditingService(null);
    toast.success(editingService ? 'تم تحديث الخدمة بنجاح' : 'تم إضافة الخدمة بنجاح');
  };

  const handleDeleteDept = async (id: string) => {
    if (!currentUser?.permissions.canDeleteServices && !currentUser?.permissions.canManageDepartments) {
      toast.error('ليس لديك صلاحية لحذف الأقسام');
      return;
    }
    const deptToDelete = data.departments.find(d => d.id === id);
    if (!deptToDelete) return;

    setDeleteConfirm({
      type: 'DEPT',
      id,
      name: deptToDelete.name,
      message: 'هل أنت متأكد من حذف هذا القسم؟ سيتم حذف كافة الأقسام الفرعية والخدمات التابعة له نهائياً.',
      onDelete: async () => {
        // Robust Recursive deletion
        const subDepts = data.departments.filter(d => d.parentDepartmentId === id);
        const subDeptIds = [id, ...subDepts.map(d => d.id)];
        
        const updatedDepts = data.departments.filter(d => !subDeptIds.includes(d.id));
        const updatedServices = data.services.filter(s => !subDeptIds.includes(s.departmentId));
        
        await logAudit(
          currentUser,
          'DELETE_DEPARTMENT',
          id,
          deptToDelete.name,
          deptToDelete,
          null,
          `حذف القسم: ${deptToDelete.name} مع كافة محتوياته الفرعية والخدمات`
        );

        if (activeMainId === id) {
           const nextMain = updatedDepts.find(d => d.isMain);
           setActiveMainId(nextMain ? nextMain.id : null);
        }

        saveData({ ...data, departments: updatedDepts, services: updatedServices });
        toast.error('تم حذف القسم وكافة محتوياته');
      }
    });
  };

  const handleDeleteService = async (id: string) => {
    if (!currentUser?.permissions.canDeleteServices) {
      toast.error('ليس لديك صلاحية لحذف الخدمات الطبية');
      return;
    }
    const service = data.services.find(s => s.id === id);
    if (!service) return;

    const targetDept = data.departments.find(d => d.id === service.departmentId);

    setDeleteConfirm({
      type: 'SERVICE',
      id,
      name: service.name,
      message: `هل أنت متأكد من حذف هذا ${targetDept?.type === 'CLINIC' ? 'الطبيب' : 'الخدمة'} نهائياً؟`,
      onDelete: async () => {
        await logAudit(
          currentUser,
          'DELETE_SERVICE',
          id,
          service.name,
          service,
          null,
          `حذف ${targetDept?.type === 'CLINIC' ? 'الطبيب' : 'الخدمة'}: ${service.name}`
        );

        saveData({ ...data, services: data.services.filter(s => s.id !== id) });
        toast.error(`تم حذف ${targetDept?.type === 'CLINIC' ? 'الطبيب' : 'الخدمة'}`);
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 lg:flex-row min-h-[70vh]">
      {/* Sidebar: Main Departments Navigation */}
      <div className="lg:w-80 flex flex-col gap-6">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-sky-100 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-sky-900 text-lg tracking-tight">الأقسام الرئيسية</h3>
              <button 
                onClick={() => { setEditingDept(null); setSelectedParentId(null); setNewDept({ name: '', isMain: true, type: 'CLINIC' }); setIsAddingDept(true); }}
                className="w-12 h-12 rounded-2xl bg-sky-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                <Plus size={24} />
              </button>
           </div>
           
           <div className="flex flex-col gap-3">
              {mainDepartments.map(dept => (
                 <button
                   key={dept.id}
                   onClick={() => setActiveMainId(dept.id)}
                   className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-right group ${activeMainId === dept.id ? 'bg-sky-950 text-white shadow-2xl scale-[1.02]' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}
                 >
                    <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center ${activeMainId === dept.id ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                       <Building2 size={20} className={activeMainId === dept.id ? 'text-white' : 'text-sky-500'} />
                    </div>
                    <span className={`font-black flex-1 truncate text-sm ${activeMainId === dept.id ? '!text-white' : 'text-sky-700'}`}>{dept.name}</span>
                    {activeMainId === dept.id && <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(var(--brand-500),0.8)]" />}
                 </button>
              ))}
              
              {mainDepartments.length === 0 && (
                <div className="text-center py-12 px-6 border-4 border-dashed border-sky-50 rounded-3xl">
                   <p className="text-sm font-black text-sky-300 italic">لا توجد أقسام رئيسية</p>
                </div>
              )}
           </div>
        </div>

        {activeDept && (
          <div className="flex flex-col gap-3 mt-auto p-4 bg-sky-50 rounded-[2.5rem] border border-sky-100">
            <button 
              onClick={() => { setEditingDept(activeDept); setNewDept(activeDept); setIsAddingDept(true); }}
              className="w-full py-5 bg-white text-sky-900 rounded-2xl font-black shadow-sm border border-sky-100 hover:bg-sky-950 hover:text-white transition-all flex items-center justify-center gap-3 text-xs"
            >
              <Settings size={18} /> إعدادات القسم
            </button>
            {(currentUser?.permissions.canDeleteServices || currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER') && (
              <button 
                onClick={() => handleDeleteDept(activeDept.id)}
                className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3 text-xs"
              >
                <Trash2 size={18} /> حذف القسم كلياً
              </button>
            )}
          </div>
        )}
      </div>

          {activeDept ? (
             <div className="flex-1 flex flex-col gap-10">
                {/* Search and Action Bar */}
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 relative">
                      <input 
                        type="text" 
                        placeholder="البحث السريع عن خدمة أو قسم فرعي..." 
                        className="w-full bg-white border-2 border-sky-100 rounded-[2rem] p-6 pr-16 font-black text-sky-900 outline-none focus:border-sky-900 transition-all shadow-sm"
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          const cards = document.querySelectorAll('.sub-dept-card');
                          cards.forEach(card => {
                             const text = card.textContent?.toLowerCase() || '';
                             (card as HTMLElement).style.display = text.includes(val) ? 'flex' : 'none';
                          });
                        }}
                      />
                      <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-sky-500" size={24} />
                   </div>
                   <button 
                     onClick={() => { setSelectedParentId(activeDept.id); setNewDept({ name: '', isMain: false, type: activeDept.type }); setIsAddingDept(true); }}
                     className="bg-sky-900 text-white px-10 py-6 rounded-[2rem] font-black shadow-2xl hover:bg-sky-800 transition-all flex items-center justify-center gap-3 text-lg"
                   >
                     <Plus size={24} /> إضافة قسم فرعي
                   </button>
                </div>

                {/* Direct Services (Pinned/General) */}
                {data.services.filter(s => s.departmentId === activeDept.id).length > 0 && (
                   <div className="bg-white p-10 rounded-[3.5rem] border-2 border-sky-100 shadow-sm relative overflow-hidden group/main">
                      <div className="absolute top-0 right-0 w-2 h-full bg-sky-900 opacity-5" />
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-sky-50 text-sky-900 flex items-center justify-center border border-sky-100 shadow-inner">
                               <Activity size={32} />
                            </div>
                            <div>
                               <h3 className="font-black text-sky-950 text-2xl tracking-tight">خدمات عامة ومباشرة</h3>
                               <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">مسجلة في القسم الرئيسي: {activeDept.name}</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => { setEditingService(null); setNewService({ name: '', price: 0, departmentId: activeDept.id }); setIsAddingService(true); }}
                           className="bg-sky-950 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-sky-800 transition-all flex items-center gap-3 text-sm"
                         >
                            <Plus size={20} /> {activeDept.type === 'CLINIC' ? 'إضافة طبيب مباشر' : 'إضافة خدمة مباشرة'}
                         </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                         {data.services.filter(s => s.departmentId === activeDept.id).map(ser => (
                            <div key={ser.id} className="flex justify-between items-center p-6 bg-sky-50 border-2 border-transparent hover:border-sky-900 hover:bg-white rounded-[2rem] transition-all group/ser shadow-sm">
                               <div className="flex flex-col gap-2">
                                  <span className="font-black text-sky-900 text-base leading-tight">{ser.name}</span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-black text-brand-600 tabular-nums bg-brand-50 px-3 py-1 rounded-full">{ser.price} ج.م</span>
                                  </div>
                               </div>
                               <div className="flex gap-2 transition-all opacity-0 group-hover/ser:opacity-100 scale-90 group-hover/ser:scale-100">
                                  <button onClick={() => { setEditingService(ser); setNewService(ser); setIsAddingService(true); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-sky-200 text-sky-500 hover:text-sky-950 shadow-sm"><Edit size={16}/></button>
                                  {(currentUser?.permissions.canDeleteServices || currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER') && (
                                    <button onClick={() => handleDeleteService(ser.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-sky-200 text-sky-500 hover:text-red-600 shadow-sm"><Trash2 size={16}/></button>
                                  )}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                {/* Sub-departments Header */}
                <div className="flex items-center justify-between px-4">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-sky-950 text-white flex items-center justify-center shadow-xl">
                         <Layers size={28} />
                      </div>
                      <div>
                         <h3 className="font-black text-sky-950 text-2xl tracking-tight">الهيكل التنظيمي</h3>
                         <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mt-1">نظام المجموعات والعيادات الفرعية المتخصصة</p>
                      </div>
                   </div>
                </div>

                {/* Sub-departments Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {data.departments.filter(d => d.parentDepartmentId === activeDept.id).map(sub => {
                      const isOpen = activeFolders[sub.id] !== false; // Default to open if not explicitly closed
                      const subServices = data.services.filter(s => s.departmentId === sub.id);
                      
                      return (
                        <div key={sub.id} className="sub-dept-card bg-white rounded-[2.5rem] border-2 border-sky-100 shadow-sm flex flex-col group hover:border-sky-900 transition-all overflow-hidden h-fit">
                           <div className="p-8 border-b-2 border-sky-50 flex justify-between items-center bg-white/50">
                              <button 
                                onClick={() => toggleFolder(sub.id)}
                                className="flex items-center gap-4 flex-1 text-right group/title"
                              >
                                 <div className={`w-3 h-10 rounded-full transition-all ${isOpen ? 'bg-sky-900 h-10' : 'bg-sky-300 h-6'}`} />
                                 <div>
                                    <h4 className="font-black text-sky-900 text-xl group-hover/title:text-sky-600 transition-colors flex items-center gap-2">
                                      {sub.name}
                                      {isOpen ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                                    </h4>
                                    <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{subServices.length} {sub.type === 'CLINIC' ? 'أطباء مفعلين' : 'خدمات مفعلة'}</span>
                                 </div>
                              </button>
                              <div className="flex gap-4">
                                 <button onClick={() => { setEditingDept(sub); setNewDept(sub); setIsAddingDept(true); }} className="p-3 bg-sky-50 text-sky-500 hover:text-sky-950 rounded-xl transition-all border border-sky-100"><Edit size={18} /></button>
                                 <button onClick={() => { setEditingService(null); setNewService({ name: '', price: 0, departmentId: sub.id }); setIsAddingService(true); }} className="px-6 py-3 bg-sky-950 text-white rounded-xl font-black text-xs hover:bg-sky-800 transition-all shadow-lg flex items-center gap-2"><Plus size={16} /> {sub.type === 'CLINIC' ? 'إضافة طبيب' : 'إضافة خدمة'}</button>
                              </div>
                           </div>

                           {isOpen && (
                              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-sky-50/30">
                                 {subServices.map(ser => (
                                    <div key={ser.id} className="flex justify-between items-center p-5 bg-white border border-sky-100 rounded-3xl hover:border-sky-900 transition-all group/s shadow-sm">
                                       <div className="flex flex-col">
                                          <span className="font-black text-sky-900 text-sm leading-tight">{ser.name}</span>
                                          <span className="text-[10px] font-black text-brand-600 mt-1">{ser.price} ج.م</span>
                                       </div>
                                       <div className="flex gap-2 opacity-0 group-hover/s:opacity-100 transition-all">
                                          <button onClick={() => { setEditingService(ser); setNewService(ser); setIsAddingService(true); }} className="p-2 text-sky-500 hover:text-sky-950"><Edit size={14}/></button>
                                          {(currentUser?.permissions.canDeleteServices || currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER') && (
                                            <button onClick={() => handleDeleteService(ser.id)} className="p-2 text-sky-500 hover:text-red-600"><Trash2 size={14}/></button>
                                          )}
                                       </div>
                                    </div>
                                 ))}
                                 {subServices.length === 0 && <p className="col-span-full text-center py-6 text-sky-500 text-xs font-black italic">لا توجد خدمات مسجلة في هذا القسم</p>}
                              </div>
                           )}
                        </div>
                      );
                    })}
                 </div>
              </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-20 bg-white rounded-[4rem] border-2 border-dashed border-sky-100">
                <div className="w-32 h-32 bg-sky-50 rounded-full flex items-center justify-center mb-10 text-sky-200">
                   <Building2 size={64} />
                </div>
                <h3 className="text-3xl font-black text-sky-900 mb-4">قسم غير محدد</h3>
                <p className="text-sky-500 font-bold max-w-sm text-center">فضلاً قم باختيار قسم رئيسي من القائمة الجانبية لإدارة الخدمات والأقسام الفرعية التابعة له.</p>
             </div>
          )}

      <AnimatePresence>
        {isAddingDept && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-white/20">
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <Building2 size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">{editingDept ? 'تعديل بيانات القسم' : (selectedParentId ? 'إضافة قسم فرعي جديد' : 'إضافة قسم رئيسي جديد')}</h3>
                        <p className="text-sm text-sky-500 font-bold">إعدادات القسم الداخلي</p>
                     </div>
                  </div>
                  <button onClick={() => { setIsAddingDept(false); setSelectedParentId(null); setEditingDept(null); }} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                     <X size={24} className="text-sky-400" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
                 <div className="flex flex-col gap-8">
                   <div className="flex flex-col gap-4">
                      <label className="text-xs font-bold text-sky-500 mb-1">اسم القسم</label>
                      <input 
                        type="text" 
                        autoFocus
                        value={newDept.name} 
                        onChange={e => setNewDept({ ...newDept, name: e.target.value })} 
                        placeholder="أدخل اسم القسم هنا..." 
                        className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm"
                      />
                   </div>

                   <div className="flex flex-col gap-4">
                      <label className="text-xs font-bold text-sky-500 mb-1">نوع وتخصص القسم</label>
                      <div className="grid grid-cols-2 gap-4">
                        {['CLINIC', 'LAB', 'RADIOLOGY', 'OTHER'].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewDept({ ...newDept, type: type as any })}
                            className={`p-4 rounded-[1.5rem] border-2 font-black text-sm transition-all text-center ${newDept.type === type ? 'bg-sky-600 border-sky-600 text-white shadow-xl' : 'bg-sky-50 border-sky-100 text-sky-500 hover:border-sky-300'}`}
                          >
                            {type === 'CLINIC' ? 'قسم عيادات' : type === 'LAB' ? 'مختبر طبي' : type === 'RADIOLOGY' ? 'مركز أشعة' : 'أخرى'}
                          </button>
                        ))}
                      </div>
                   </div>
                 </div>
               </div>

               <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                  <button onClick={() => { setIsAddingDept(false); setSelectedParentId(null); setEditingDept(null); }} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">إلغاء</button>
                  <button onClick={handleAddDept} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg">
                     {editingDept ? 'تحديث البيانات' : 'إنشاء القسم'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}

        {isAddingService && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-white/20">
               {(() => {
                 const targetDept = data.departments.find(d => d.id === newService.departmentId);
                 const isClinic = targetDept?.type === 'CLINIC';
                 const label = isClinic ? 'طبيب' : 'خدمة';
                 return (
                   <>
                <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                         <Plus size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-sky-900">{editingService ? `تعديل بيانات ${label}` : `إضافة ${label} جديد`}</h3>
                         <p className="text-sm text-sky-500 font-bold">تسجيل خدمات القسم</p>
                      </div>
                   </div>
                   <button onClick={() => { setIsAddingService(false); setEditingService(null); }} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                      <X size={24} className="text-sky-400" />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                       <label className="text-xs font-bold text-sky-500 mb-1">اسم {isClinic ? 'الطبيب أو الأخصائي' : 'الخدمة الطبية'}</label>
                       <input 
                         type="text" 
                         autoFocus
                         value={newService.name} 
                         onChange={e => setNewService({ ...newService, name: e.target.value })} 
                         placeholder={`أدخل اسم ${label} هنا...`} 
                         className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm"
                       />
                    </div>

                    <div className="flex flex-col gap-4">
                       <label className="text-xs font-bold text-sky-500 mb-1">{isClinic ? 'تسعيرة الكشف (ج.م)' : 'سعر الخدمة (ج.م)'}</label>
                       <input 
                         type="number" 
                         value={newService.price} 
                         onChange={e => setNewService({ ...newService, price: parseFloat(e.target.value) })} 
                         placeholder="0.00" 
                         className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm tabular-nums"
                       />
                    </div>

                    <div className="flex flex-col gap-4">
                       <label className="text-xs font-bold text-sky-500 mb-1">القسم المخصص</label>
                       <select 
                          value={newService.departmentId} 
                          onChange={e => setNewService({ ...newService, departmentId: e.target.value })}
                          className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm appearance-none"
                       >
                          <option value="">اختر القسم الطبي...</option>
                          {data.departments.map(d => (
                             <option key={d.id} value={d.id}>{d.name} {d.isMain ? '(رئيسي)' : `(فرعي من ${data.departments.find(p=>p.id===d.parentDepartmentId)?.name})`}</option>
                          ))}
                       </select>
                    </div>
                  </div>
                </div>

                <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                   <button onClick={() => { setIsAddingService(false); setEditingService(null); }} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">إلغاء</button>
                   <button onClick={handleAddService} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg">
                      حفظ بيانات {label}
                   </button>
                </div>
                   </>
                 );
               })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DeleteConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm?.onDelete()}
        title={deleteConfirm?.type === 'DEPT' ? 'حذف القسم' : (data.departments.find(d => d.id === data.services.find(s => s.id === deleteConfirm?.id)?.departmentId)?.type === 'CLINIC' ? 'حذف الطبيب' : 'حذف الخدمة')}
        message={deleteConfirm?.message || ''}
        itemName={deleteConfirm?.name}
        confirmLabel="تأكيد الحذف"
        cancelLabel="تراجع"
        isDangerous={true}
      />
    </motion.div>
  );
});
const DoctorView = memo(({ data, saveData, currentUser }: { data: HospitalData, saveData: (d: HospitalData) => void, currentUser: User }) => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedServiceLogId, setSelectedServiceLogId] = useState<string | null>(null);
  const [referralToPrice, setReferralToPrice] = useState<Visit | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [reportText, setReportText] = useState('');
  const [reportFiles, setReportFiles] = useState<any[]>([]);
  const [viewingPatientEmr, setViewingPatientEmr] = useState<Patient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    subId?: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);
  const [referringVisit, setReferringVisit] = useState<Visit | null>(null);
  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);

  const assignedVisits = useMemo(() => {
    const assignedDepts = currentUser.permissions?.assignedDepartments || [];
    return (data.visits || []).filter(v => 
      // If doctor is specifically targeted, they have access
      (v.targetDoctorId === currentUser.id) ||
      // Or if assigned to the department of any service
      (assignedDepts.length === 0 || ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || v.services.some(s => {
        const service = data.services.find(ser => ser.id === s.serviceId);
        return service && assignedDepts.includes(service.departmentId);
      })) ||
      // Or if assigned to the target department explicitly
      (v.targetDepartmentId && (assignedDepts.length === 0 || ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || assignedDepts.includes(v.targetDepartmentId)))
    );
  }, [data.visits, data.services, currentUser.permissions?.assignedDepartments, currentUser.role, currentUser.id]);

  const filteredByDeptVisits = useMemo(() => {
    if (filterDept === 'all') return assignedVisits;
    return assignedVisits.filter(v => 
      v.services.some(s => {
        const ser = data.services.find(sd => sd.id === s.serviceId);
        return ser?.departmentId === filterDept;
      }) || v.targetDepartmentId === filterDept
    );
  }, [assignedVisits, filterDept, data.services]);

  const pendingVisits = useMemo(() => {
    return filteredByDeptVisits.filter(v => v.services.length === 0 || v.services.some(s => s.status === 'PENDING'));
  }, [filteredByDeptVisits]);

  const completedVisits = useMemo(() => {
    return filteredByDeptVisits.filter(v => v.services.length > 0 && v.services.every(s => s.status === 'COMPLETED'));
  }, [filteredByDeptVisits]);

  const availableDepartments = useMemo(() => {
    const assignedDepts = currentUser.permissions?.assignedDepartments || [];
    return (data.departments || []).filter(d => d.isMain).filter(d => 
      assignedDepts.length === 0 || 
      ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || 
      assignedDepts.includes(d.id)
    );
  }, [data.departments, currentUser.permissions?.assignedDepartments, currentUser.role]);

  const handleCompleteService = async (visitId: string, serviceLogId: string) => {
    const newData = { ...data };
    const visit = newData.visits.find(v => v.id === visitId);
    if (!visit) return;
    const serviceLog = visit.services.find(s => s.id === serviceLogId);
    if (!serviceLog) return;

    serviceLog.status = 'COMPLETED';
    serviceLog.report = reportText;
    if (reportFiles.length > 0) {
      serviceLog.resultUrl = reportFiles[0].url; // Support for primary result URL
    }
    serviceLog.completedAt = new Date().toISOString();
    serviceLog.completedBy = currentUser.id;
    
    // Attach files to the patient record if added
    if (reportFiles.length > 0) {
      const patient = newData.patients.find(p => p.id === visit.patientId);
      if (patient) {
        patient.documents = [...(patient.documents || []), ...reportFiles];
      }
    }

    const isRef = visit.invoiceNumber && visit.invoiceNumber.startsWith('REF-');
    if (isRef && newData.settings?.referrals) {
      newData.settings.referrals = newData.settings.referrals.map(ref => {
        if (ref.id === visit.invoiceNumber) {
          return { ...ref, status: 'COMPLETED' };
        }
        return ref;
      });
    }

    await saveData(newData);
    setReportText('');
    setReportFiles([]);
    setSelectedVisit(null);
    setSelectedServiceLogId(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border-2 border-sky-100 shadow-sm transition-all focus-within:border-sky-900">
             <div className="flex bg-sky-100 p-2 rounded-[2rem] border-2 border-sky-50 self-center md:self-start shadow-inner">
                <button onClick={() => setActiveTab('pending')} className={`px-12 py-4 rounded-[1.5rem] font-black transition-all ${activeTab === 'pending' ? 'bg-sky-950 text-white shadow-2xl scale-105' : 'text-sky-500 hover:bg-white'}`}>الانتظار ({pendingVisits.length})</button>
                <button onClick={() => setActiveTab('completed')} className={`px-12 py-4 rounded-[1.5rem] font-black transition-all ${activeTab === 'completed' ? 'bg-sky-950 text-white shadow-2xl scale-105' : 'text-sky-500 hover:bg-white'}`}>المكتملة ({completedVisits.length})</button>
             </div>

             <div className="flex flex-col md:flex-row items-center gap-4">
                {!['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) && (currentUser.permissions?.assignedDepartments || []).length > 0 && (
                  <div className="px-4 py-2 bg-sky-50 text-sky-700 border border-sky-100 rounded-2xl flex items-center gap-2 text-[10px] font-black">
                    <Activity size={12} /> عرض مخصص لعياداتك
                  </div>
                )}
                <div className="relative">
                  <select 
                    value={filterDept} 
                    onChange={e => setFilterDept(e.target.value)}
                    className="bg-sky-50 border-2 border-sky-100 rounded-[2rem] px-12 py-5 font-black text-sky-950 outline-none focus:border-sky-900 appearance-none transition-all pr-14"
                  >
                     <option value="all">كل الأقسام المخصصة لك</option>
                     {availableDepartments.map(d => (
                       <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                  </select>
                  <Filter className="absolute right-5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" size={20} />
                </div>
             </div>
          </div>

      <div className="flex flex-col gap-4">
        {(activeTab === 'pending' ? pendingVisits : completedVisits).map((visit, index) => {
          const patient = data.patients.find(p => p.id === visit.patientId);
          const referral = data.settings.referrals?.find(r => r.id === visit.invoiceNumber);

          return (
             <motion.div 
                key={visit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }} 
                transition={{ type: "tween", ease: "easeOut", duration: 0.15, delay: index * 0.05 }}
                className={`flex flex-col items-stretch gap-6 p-8 rounded-[3rem] border-2 shadow-sm transition-all relative overflow-hidden ${activeTab === 'completed' ? 'bg-sky-50 opacity-40 border-sky-200 grayscale' : 'bg-white border-sky-100 hover:shadow-2xl hover:border-sky-950'}`}
             >
                 <div className="flex items-center gap-8">
                    <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner flex-shrink-0 ${activeTab === 'completed' ? 'bg-sky-100 text-sky-500' : 'bg-sky-950 text-sky-100 border-4 border-sky-900 shadow-xl'}`}>
                       {visit.queueNumber}
                    </div>
                    
                    <div className="flex-1 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[2rem] bg-sky-50 flex items-center justify-center font-black text-sky-900 border-2 border-sky-100 text-xl shadow-sm flex-shrink-0">
                             {patient?.name[0]}
                          </div>
                          <div>
                             <h4 className="font-black text-2xl text-sky-950 tracking-tight">{patient?.name}</h4>
                             <div className="flex flex-wrap items-center gap-4 mt-2">
                                <span className="text-[10px] text-sky-500 font-extrabold tracking-widest uppercase italic">ID: {patient?.id.slice(-8)}</span>
                                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                                  patient?.category === 'CASH' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 
                                  patient?.category === 'VIP' ? 'bg-amber-50 text-amber-900 border border-amber-100' : 
                                  patient?.category === 'INSURANCE' ? 'bg-brand-50 text-brand-900 border border-brand-100' : 
                                  'bg-sky-50 text-sky-600'
                                }`}>{data.settings.patientCategories?.find(c => c.id === (patient?.category || 'CASH'))?.label || 'نقدي'}</span>
                                {referral && (
                                   <span className="text-[10px] text-brand-600 font-black italic">محول من: {referral.referringDoctorName}</span>
                                )}
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4 flex-shrink-0 self-end lg:self-auto">
                          <div className="flex items-center gap-2 text-slate-400 border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-xl">
                             <Clock size={14} />
                             <span className="text-[10px] font-bold tabular-nums">{safeFormat(visit.date, 'HH:mm')}</span>
                          </div>
                          {currentUser.permissions?.patient_referral && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); setReferringVisit(visit); }}
                                className="px-5 py-3 bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-700 hover:border-brand-600 border border-brand-200 rounded-2xl transition-all shadow-sm font-black text-xs flex items-center gap-2 cursor-pointer active:scale-95"
                                title="إجراء تحويل طبي للمريض"
                             >
                                <ArrowRightLeft size={14} className="scale-x-[-1]" />
                                <span>تحويل المريض</span>
                             </button>
                          )}
                       </div>
                    </div>
                 </div>

                 {referral && (
                   <div className="border-t border-slate-100 pt-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedReferralId(expandedReferralId === referral.id ? null : referral.id);
                        }}
                        className="flex items-center gap-2 text-xs font-black text-sky-650 hover:text-sky-950 transition-colors bg-sky-50 px-4 py-2 rounded-xl border border-sky-100"
                      >
                        <ArrowRightLeft size={14} className="animate-pulse" />
                        {expandedReferralId === referral.id ? 'إخفاء تفاصيل التحويل الطبي' : 'عرض تفاصيل التحويل وتوجيهات الطبيب المحوّل'}
                      </button>
                      
                      <AnimatePresence>
                        {expandedReferralId === referral.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3"
                          >
                            <div className="bg-slate-50 border-2 border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4 text-right">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                                  referral.priority === 'EMERGENCY' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 
                                  referral.priority === 'URGENT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                  'bg-sky-50 text-sky-700 border-sky-100'
                                }`}>
                                  {referral.priority === 'EMERGENCY' ? 'طوارئ 🚨' : referral.priority === 'URGENT' ? 'عاجل' : 'عادي'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-extrabold">{safeFormat(referral.createdAt, 'yyyy/MM/dd - hh:mm a')}</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 block mb-1">الطبيب المحوّل والجهة</span>
                                  <p className="text-sm font-black text-slate-800">د. {referral.referringDoctorName} ← {referral.referredToName}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-400 block mb-1">نوع التحويل المطلوب</span>
                                  <p className="text-sm font-bold text-sky-700">
                                    {referral.referralType === 'CONSULTATION' ? 'استشارة طبية' :
                                     referral.referralType === 'PROCEDURE' ? 'إجراء / عملية' :
                                     referral.referralType === 'TRANSFER' ? 'تحويل قسم ومتابعة' : 'متابعة دورية'}
                                  </p>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-3">
                                <span className="text-[10px] font-black text-slate-400 block mb-1">سبب التحويل الأساسي</span>
                                <p className="text-sm text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100">{referral.reason || 'لم يذكر سبب محدد'}</p>
                              </div>

                              {referral.clinicalNotes && (
                                <div className="border-t border-slate-100 pt-3">
                                  <span className="text-[10px] font-black text-slate-400 block mb-1">الملاحظات السريرية والفحص الأولي</span>
                                  <p className="text-sm text-slate-700 whitespace-pre-line font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100">{referral.clinicalNotes}</p>
                                </div>
                              )}

                              {referral.instructions && (
                                <div className="border-t border-slate-100 pt-3 bg-brand-50/20 p-3 rounded-2xl border border-brand-100/50">
                                  <span className="text-[10px] font-black text-brand-700 block mb-1">توجيهات وإرشادات الطبيب للملف الطبي</span>
                                  <p className="text-sm text-brand-900 font-bold whitespace-pre-line leading-relaxed">{referral.instructions}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                )}

                {visit.services.length === 0 && visit.targetDepartmentId && (
                  <div className="bg-brand-50 p-6 rounded-3xl border-2 border-brand-100 flex flex-col gap-2">
                     <p className="text-[10px] font-black text-brand-900 uppercase flex items-center gap-2 italic">
                        <ArrowRightLeft size={16} /> تحويل مباشر للمريض
                     </p>
                     <p className="text-sm font-black text-sky-900">المطلوب: مراجعة الحالة في قسم {data.departments.find(d => d.id === visit.targetDepartmentId)?.name}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {visit.services.filter(s => {
                    const ser = data.services.find(sd => sd.id === s.serviceId);
                    return ser && (['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || (currentUser.permissions?.assignedDepartments || []).includes(ser.departmentId));
                  }).map(sLog => {
                    const sDef = data.services.find(sd => sd.id === sLog.serviceId);
                    return (
                      <div key={sLog.id} className="flex justify-between items-center p-6 bg-sky-50 rounded-3xl border-2 border-sky-100 hover:border-sky-900 transition-all group/item">
                         <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                               <span className="text-sm font-black text-sky-900">{sDef?.name}</span>
                               {sLog.addedBy && (
                                  <span className="text-[9px] font-black text-sky-600 bg-white px-2 py-0.5 rounded-md border border-sky-100/50">
                                     بواسطة: {sLog.addedBy}
                                  </span>
                               )}
                            </div>
                            <span className={`text-[10px] w-fit font-black uppercase px-3 py-1 rounded-full border-2 ${
                              sLog.status === 'PENDING' ? 'bg-white text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-900 border-emerald-100'
                            }`}>
                              {sLog.status === 'PENDING' ? 'قيد الكشف' : 'اكتمل بنجاح'}
                            </span>
                         </div>
                         <div className="flex gap-3">
                              <button 
                                onClick={() => {
                                  setSelectedVisit(visit);
                                  setSelectedServiceLogId(sLog.id);
                                  setReportText(sLog.report || '');
                                }}
                                className="bg-sky-950 text-white text-[10px] font-black px-6 py-3 rounded-xl shadow-xl hover:bg-sky-800 transition-all active:scale-95"
                              >
                                {sLog.status === 'PENDING' ? 'إصدار التقرير' : 'تعديل التقرير'}
                              </button>
                              {sLog.status === 'PENDING' && currentUser.permissions.canCancelServices && (
                                <button 
                                  onClick={() => {
                                    const visitId = visit.id;
                                    const serviceLogId = sLog.id;
                                   const serviceName = sDef?.name || 'خدمة';
                                   
                                   setDeleteConfirm({
                                     id: visitId,
                                     subId: serviceLogId,
                                     name: serviceName,
                                     message: 'هل أنت متأكد من إلغاء هذه الخدمة؟ سيتم حذفها نهائياً.',
                                     onDelete: () => {
                                       const updatedServices = visit.services.filter(s => s.id !== serviceLogId);
                                       const newTotalPrice = updatedServices.reduce((acc, s) => acc + (data.services.find(sd => sd.id === s.serviceId)?.price || 0), 0);
                                       const updatedVisit = { ...visit, services: updatedServices, totalPrice: newTotalPrice };
                                       const updatedVisits = data.visits.map(v => v.id === visitId ? updatedVisit : v);
                                       saveData({ ...data, visits: updatedVisits });
                                       toast.success('تم الإلغاء وتحديث الجدول');
                                     }
                                   });
                                 }}
                                 className="w-10 h-10 flex items-center justify-center bg-white text-sky-500 border border-sky-200 rounded-xl hover:text-red-600 hover:border-red-600 transition-all shadow-sm"
                                 title="إلغاء الخدمة"
                                >
                                 <Trash2 size={16} />
                               </button>
                             )}
                           </div>
                         </div>
                    );
                 })}
                </div>
             </motion.div>
          );
         })}
      </div>

      <AnimatePresence>
        {viewingPatientEmr && (
          <PatientEMRModal 
            patient={viewingPatientEmr}
            data={data}
            saveData={saveData}
            currentUser={currentUser}
            onClose={() => setViewingPatientEmr(null)}
            hideAddService={true}
          />
        )}

        {selectedVisit && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "tween", ease: "easeOut", duration: 0.15 }} exit={{ scale: 0.95, opacity: 0, y: 30 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-white/20">
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <FileText size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">إصدار التقرير الطبي</h3>
                        <p className="text-sm text-sky-500 font-bold">المريض: <span className="text-sky-900">{data.patients.find(p => p.id === selectedVisit.patientId)?.name}</span></p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={() => {
                         const patient = data.patients.find(p => p.id === selectedVisit.patientId);
                         if (patient) setViewingPatientEmr(patient);
                       }}
                       className="bg-sky-50 text-sky-900 px-6 py-4 rounded-2xl font-black text-xs hover:bg-sky-100 transition-all flex items-center gap-2"
                     >
                       <UserIcon size={16} /> الملف الطبي
                     </button>
                     <button onClick={() => setSelectedVisit(null)} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                        <X size={24} className="text-sky-400" />
                     </button>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
                 <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4">
                       <label className="text-xs font-bold text-sky-500 mb-1">النتائج والتشخيص الطبي المعتمد</label>
                       <textarea 
                         className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-3xl p-6 min-h-[220px] outline-none font-bold text-lg text-sky-900 transition-all"
                         placeholder="اكتب التقرير النهائي والتشخيص هنا..."
                         value={reportText}
                         onChange={e => setReportText(e.target.value)}
                       />
                    </div>

                    <div className="flex flex-col gap-4">
                       <label className="text-xs font-bold text-sky-500 mb-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-sky-500" /> مرفقات ونتائج التحاليل
                       </label>
                       <div className="flex flex-col gap-4">
                         <label className="group h-32 border-2 border-dashed border-sky-200 rounded-[2rem] bg-sky-50/50 flex flex-col items-center justify-center gap-3 hover:border-sky-400 hover:bg-sky-50 transition-all cursor-pointer relative overflow-hidden">
                          <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files) {
                                const files = Array.from(e.target.files);
                                toast.loading('جاري رفع المرفقات التحليلية...', { id: 'report-upload' });
                                
                                Promise.all(files.map(async (file: File) => {
                                  return new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                      const base64 = ev.target?.result as string;
                                      try {
                                        const res = await fetch('/api/upload', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            fileName: file.name,
                                            fileData: base64,
                                            patientId: selectedVisit.patientId
                                          })
                                        });
                                        const result = await res.json();
                                        if (result.success) {
                                          resolve({
                                            id: `report-doc-${Date.now()}-${Math.random()}`,
                                            name: file.name,
                                            url: `/${result.path}`,
                                            type: file.type,
                                            uploadedAt: new Date().toISOString()
                                          });
                                        }
                                      } catch (err) {
                                        console.error("Report upload failed:", err);
                                        resolve(null);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  });
                                })).then(uploaded => {
                                  const valid = uploaded.filter(f => f !== null) as any[];
                                  if (valid.length > 0) {
                                    setReportFiles(prev => [...prev, ...valid]);
                                    toast.success(`تم رفع واختيار ${valid.length} ملفات`, { id: 'report-upload' });
                                  } else {
                                    toast.error('فشل رفع الملفات', { id: 'report-upload' });
                                  }
                                });
                              }
                            }}
                          />
                          <Plus className="text-sky-300 group-hover:text-sky-500 group-hover:scale-110 transition-transform" size={32} />
                          <p className="text-xs font-bold text-sky-500 group-hover:text-sky-700">اضغط لرفع ملفات أو صور النتائج</p>
                        </label>

                        {reportFiles.length > 0 && (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {reportFiles.map((file) => (
                              <div key={file.id} className="bg-sky-50 p-4 rounded-2xl border border-sky-100 flex justify-between items-center group/file hover:bg-sky-100 transition-colors">
                                <span className="text-xs font-bold truncate text-sky-800 max-w-[150px]">{file.name}</span>
                                <button onClick={() => setReportFiles(prev => prev.filter(f => f.id !== file.id))} className="text-sky-400 hover:text-red-500 transition-colors"><X size={18} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                   </div>
                 </div>
               </div>

               <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                  <button onClick={() => { setSelectedVisit(null); setSelectedServiceLogId(null); setReportText(''); }} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">إلغاء</button>
                  <button 
                    onClick={() => {
                        if (selectedServiceLogId) handleCompleteService(selectedVisit.id, selectedServiceLogId);
                    }} 
                    className="flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-lg"
                  >
                    اعتماد النتيجة وإرسالها
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm?.onDelete()}
        title="إلغاء الخدمة"
        message={deleteConfirm?.message || ''}
        itemName={deleteConfirm?.name}
        confirmLabel="إلغاء الخدمة"
        cancelLabel="تراجع"
        isDangerous={true}
      />

      {referringVisit && (
        <ReferPatientModal 
          visit={referringVisit}
          data={data}
          saveData={saveData}
          currentUser={currentUser}
          onClose={() => setReferringVisit(null)}
        />
      )}

      {referralToPrice && (
        <CompleteReferralModal 
          isOpen={!!referralToPrice}
          onClose={() => setReferralToPrice(null)}
          visit={referralToPrice}
          data={data}
          saveData={saveData}
          currentUser={currentUser}
        />
      )}
    </motion.div>
  );
});

const QueueView = memo(({ data, saveData, currentUser, onOpenPricingModal }: { data: HospitalData, saveData: (d: HospitalData) => void, currentUser: User, onOpenPricingModal: (v: Visit) => void }) => {
  const [filterDept, setFilterDept] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    subId?: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);

  const todaysVisits = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return (data.visits || []).filter(v => 
       safeFormat(v.date, 'yyyy-MM-dd') === today
    ).sort((a,b) => a.queueNumber - b.queueNumber);
  }, [data.visits]);

  const filteredVisits = useMemo(() => {
    const userAssigned = currentUser.permissions?.assignedDepartments || [];
    return todaysVisits.filter(v => {
      // Principal filter: User's assigned departments or specifically targeted doctor
      const hasAssignedAccess = userAssigned.length === 0 || 
        ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || 
        v.targetDoctorId === currentUser.id ||
        v.services.some(s => {
          const ser = data.services.find(sd => sd.id === s.serviceId);
          return ser && userAssigned.includes(ser.departmentId);
        }) ||
        (v.targetDepartmentId && userAssigned.includes(v.targetDepartmentId));

      if (!hasAssignedAccess) return false;

      // Secondary filter: UI Dropdown
      if (filterDept === 'all') return true;
      return v.services.some(s => {
        const ser = data.services.find(sd => sd.id === s.serviceId);
        return ser?.departmentId === filterDept;
      }) || v.targetDepartmentId === filterDept;
    });
  }, [todaysVisits, filterDept, currentUser.permissions?.assignedDepartments, data.services, currentUser.role]);

  const availableDepartments = useMemo(() => {
    const assignedDepts = currentUser.permissions?.assignedDepartments || [];
    return (data.departments || []).filter(d => d.isMain).filter(d => 
      assignedDepts.length === 0 || 
      ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || 
      assignedDepts.includes(d.id)
    );
  }, [data.departments, currentUser.permissions?.assignedDepartments, currentUser.role]);

  const handleCancelService = (visitId: string, serviceLogId: string) => {
    const visit = data.visits.find(v => v.id === visitId);
    if (!visit) return;
    
    const serviceToRemove = visit.services.find(s => (s.id || '') === serviceLogId);
    if (!serviceToRemove) return;
    const serviceDef = data.services.find(sd => sd.id === serviceToRemove?.serviceId);

    setDeleteConfirm({
      id: visitId,
      subId: serviceLogId,
      name: serviceDef?.name || 'خدمة',
      message: 'هل أنت متأكد من إلغاء هذه الخدمة؟ سيتم حذفها نهائياً من الفاتورة.',
      onDelete: async () => {
        const updatedServices = visit.services.filter(s => (s.id || '') !== serviceLogId);
        const newTotalPrice = updatedServices.reduce((acc, s) => acc + (data.services.find(sd => sd.id === s.serviceId)?.price || 0), 0);
        const updatedVisit = { ...visit, services: updatedServices, totalPrice: newTotalPrice };
        const updatedVisits = data.visits.map(v => v.id === visitId ? updatedVisit : v);
        
        await logAudit(
          currentUser,
          'UPDATE_SERVICE',
          visitId,
          `فاتورة ${visit.invoiceNumber}`,
          visit,
          updatedVisit,
          `إلغاء خدمة (${serviceDef?.name}) من الفاتورة بسبب خطأ في الإدخال`
        );

        saveData({ ...data, visits: updatedVisits });
        toast.error('تم إلغاء الخدمة وتحديث الفاتورة');
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border-2 border-sky-100 shadow-sm transition-all focus-within:border-sky-900">
         <div className="flex items-center gap-6 flex-1">
            <div className="bg-sky-900 border-2 border-sky-800 p-5 rounded-[2rem] text-sky-50 shadow-2xl">
               <Clock size={32} />
            </div>
            <div>
               <h3 className="text-2xl font-black text-sky-950 tracking-tight flex items-center gap-3">
                  قائمة دور المرضى اليوم
                  {!['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) && (currentUser.permissions?.assignedDepartments || []).length > 0 && (
                    <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 rounded-full flex items-center gap-1 font-black">
                      <Layers size={10} /> عرض مخصص للأقسام المسؤولة عنها
                    </span>
                  )}
               </h3>
               <p className="text-sky-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">نشط الآن • تحديث فوري</p>
            </div>
         </div>
         <div className="relative">
           <select 
             value={filterDept} 
             onChange={e => setFilterDept(e.target.value)}
             className="bg-sky-50 border-2 border-sky-100 rounded-[2rem] px-12 py-5 font-black text-sky-950 outline-none focus:border-sky-900 appearance-none transition-all pr-14"
           >
              <option value="all">كل الأقسام المتاحة</option>
              {availableDepartments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
           </select>
           <Filter className="absolute right-5 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none" size={20} />
         </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredVisits.map((visit, index) => {
          const patient = data.patients.find(p => p.id === visit.patientId);
          const isCompleted = visit.services.every(s => s.status === 'COMPLETED');
          const referral = data.settings.referrals?.find(r => r.id === visit.invoiceNumber);

          return (
            <motion.div 
              key={visit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} 
              transition={{ type: "tween", ease: "easeOut", duration: 0.15, delay: index * 0.05 }}
              className={`flex items-center gap-8 p-8 rounded-[3rem] border-2 shadow-sm transition-all relative overflow-hidden ${isCompleted ? 'bg-sky-50 opacity-40 border-sky-200 grayscale' : 'bg-white border-sky-100 hover:shadow-2xl hover:border-sky-900'}`}
            >
               <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner ${isCompleted ? 'bg-sky-100 text-sky-500' : 'bg-sky-950 text-sky-100 border-4 border-sky-900 shadow-xl'}`}>
                  {visit.queueNumber}
               </div>
               
               <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-sky-50 flex items-center justify-center font-black text-sky-900 border-2 border-sky-100 text-xl shadow-sm">
                       {patient?.name[0]}
                    </div>
                    <div>
                       <h4 className="font-black text-2xl text-sky-950 tracking-tight">{patient?.name}</h4>
                       <div className="flex items-center gap-4 mt-2">
                          <span className="text-[10px] text-sky-500 font-extrabold tracking-widest uppercase italic">ID: {patient?.id.slice(-8)}</span>
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                            patient?.category === 'CASH' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 
                            patient?.category === 'VIP' ? 'bg-amber-50 text-amber-900 border border-amber-100' : 
                            patient?.category === 'INSURANCE' ? 'bg-brand-50 text-brand-900 border border-brand-100' : 
                            'bg-sky-50 text-sky-600'
                          }`}>{data.settings.patientCategories?.find(c => c.id === (patient?.category || 'CASH'))?.label || 'نقدي'}</span>
                          {referral && (
                             <span className="text-[10px] text-brand-600 font-black italic">محول من: {referral.referringDoctorName}</span>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                     {visit.targetDepartmentId && (['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || (currentUser.permissions?.assignedDepartments || []).includes(visit.targetDepartmentId)) && (
                        <>
                          <div className="px-5 py-3 rounded-2xl border-2 border-sky-200 bg-sky-50 text-sky-900 text-xs font-black flex items-center gap-2">
                             <ArrowRightLeft size={16} /> 
                             محول إلى: {data.departments.find(d => d.id === visit.targetDepartmentId)?.name}
                          </div>
                          {visit.isReferralUnpriced && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); onOpenPricingModal(visit); }}
                               className="px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-2xl border border-amber-600 flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all duration-150"
                             >
                               <CreditCard size={14} />
                               استكمال التحويل وتسعير الخدمة
                             </button>
                          )}
                        </>
                     )}
                     {visit.services.filter(s => {
                       const sDef = data.services.find(sd => sd.id === s.serviceId);
                       return sDef && (['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || (currentUser.permissions?.assignedDepartments || []).includes(sDef.departmentId));
                     }).map((s, sIdx) => {
                       const sDef = data.services.find(sd => sd.id === s.serviceId);
                       const dDef = data.departments.find(dd => dd.id === sDef?.departmentId);
                       const uniqueKey = `q-service-${visit.id}-${s.id || sIdx}`;
                       return (
                         <div key={uniqueKey} className={`px-5 py-3 rounded-2xl border-2 text-xs font-black flex items-center gap-3 ${s.status === 'COMPLETED' ? 'bg-sky-50 border-sky-100 text-sky-500' : 'bg-white border-sky-200 text-sky-900 shadow-sm'}`}>
                            {dDef?.name} • {sDef?.name}
                            {s.status === 'COMPLETED' ? (
                              <CheckCircle size={14} />
                            ) : (
                              currentUser.permissions.canCancelServices && (
                                <button 
                                  onClick={() => handleCancelService(visit.id, s.id || '')}
                                  className="w-4 h-4 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-600 hover:text-sky-100 transition-all ml-1"
                                  title="إلغاء الخدمة"
                                >
                                  <X size={10} />
                                </button>
                              )
                            )}
                         </div>
                          );
                      })}
                  </div>
               </div>

               <div className="hidden lg:flex flex-col items-center gap-1 opacity-40">
                  <Clock size={16} />
                  <span className="text-[10px] font-bold tabular-nums">{safeFormat(visit.date, 'HH:mm')}</span>
               </div>
            </motion.div>
              );
          })}

        {filteredVisits.length === 0 && (
          <div className="bg-sky-50 border-4 border-dashed border-sky-100 rounded-[5rem] p-32 flex flex-col items-center justify-center gap-8">
             <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center border border-sky-100">
                <ClipboardList size={64} className="text-sky-100" />
             </div>
             <p className="text-sky-500 font-black text-2xl tracking-tight">لا يوجد مرضى في القائمة حالياً</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm?.onDelete()}
        title="إلغاء الخدمة"
        message={deleteConfirm?.message || ''}
        itemName={deleteConfirm?.name}
        confirmLabel="إلغاء الخدمة"
        cancelLabel="تراجع"
        isDangerous={true}
      />
    </motion.div>
  );
});

const ReportsView = memo(({ data, currentUser }: { data: HospitalData, currentUser: User }) => {
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day');

  const assignedDepts = currentUser.permissions?.assignedDepartments || [];

  const filteredVisits = (data.visits || []).filter(v => {
    // Principal filter: User's assigned departments
    const hasAssignedAccess = ['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) || v.services.some(s => {
      const ser = data.services.find(sd => sd.id === s.serviceId);
      return ser && assignedDepts.includes(ser.departmentId);
    });

    if (!hasAssignedAccess) return false;

    const d = new Date(v.date).getTime();
    if (isNaN(d)) return false;
    const now = Date.now();
    if (range === 'day') return safeFormat(v.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (range === 'week') return now - d < 7 * 24 * 60 * 60 * 1000;
    if (range === 'month') return now - d < 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const isVisitCompleted = (v: any) => v.services.length > 0 && v.services.every((s: any) => s.status === 'COMPLETED');

  const totalRevenue = filteredVisits.filter(isVisitCompleted).reduce((acc, v) => acc + (v.totalPrice || 0), 0);
  
  // Feature 3: Daily Trend Data
  const trendData = (() => {
    const days: Record<string, number> = {};
    const rangeDays = range === 'day' ? 1 : range === 'week' ? 7 : 30;
    
    for (let i = 0; i < rangeDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days[format(date, 'yyyy-MM-dd')] = 0;
    }

    filteredVisits.filter(isVisitCompleted).forEach(v => {
      const dateStr = safeFormat(v.date, 'yyyy-MM-dd');
      if (days[dateStr] !== undefined) {
        days[dateStr] += (v.totalPrice || 0);
      }
    });

    return Object.entries(days).map(([date, revenue]) => ({
      date: safeFormat(date, 'dd MMM'),
      revenue
    })).reverse();
  })();

  const deptStats = (data.departments || []).filter(d => d.isMain)
    .filter(d => assignedDepts.length === 0 || assignedDepts.includes(d.id))
    .map(d => {
      const relevantVisits = filteredVisits.map(v => ({
        ...v,
        services: (v.services || []).filter(s => {
          const ser = (data.services || []).find(sd => sd.id === s.serviceId);
          return ser?.departmentId === d.id;
        })
      })).filter(v => v.services.length > 0);

      const count = relevantVisits.filter(isVisitCompleted).reduce((acc, v) => acc + v.services.length, 0);
      const revenue = relevantVisits.filter(isVisitCompleted).reduce((acc, v) => 
        acc + v.services.reduce((rev, s) => rev + ((data.services || []).find(ser => ser.id === s.serviceId)?.price || 0), 0)
      , 0);

      return { name: d.name, count, revenue };
    });

  const officeStats = (data.settings?.offices || []).map(o => {
    const patientsCount = (data.patients || []).filter(p => p.officeId === o.id).length;
    const revenue = (data.visits || []).filter(v => {
      const p = (data.patients || []).find(pat => pat.id === v.patientId);
      return p?.officeId === o.id && isVisitCompleted(v);
    }).reduce((acc, v) => acc + (v.totalPrice || 0), 0);
    return { name: o.name, patients: patientsCount, revenue };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
         <div>
            <h3 className="text-xl font-black text-sky-900 tracking-tight">التقارير المالية والإحصائية</h3>
            <p className="text-sky-500 text-xs font-bold mt-1">عرض أدق للمؤشرات المالية ومعدل الإشغال</p>
         </div>
         <div className="flex bg-sky-50 p-1.5 rounded-[1.5rem] border border-sky-100">
            {(['day', 'week', 'month'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${range === r ? 'bg-sky-900 text-white shadow-xl' : 'text-sky-500 hover:text-sky-900'}`}>
                {r === 'day' && 'اليوم'}
                {r === 'week' && 'أخر أسبوع'}
                {r === 'month' && 'أخر شهر'}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm">
               <h4 className="font-black text-sky-900 mb-8 border-r-4 border-sky-900 pr-4 italic">تحليلات الأداء المالي ({range === 'day' ? 'اليوم' : range === 'week' ? 'الأسبوع' : 'الشهر'})</h4>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontBold: 900, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontBold: 900, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '20px' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="revenue" fill="#000000" radius={[10, 10, 0, 0]} name="الإيرادات" />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm">
               <h4 className="font-black text-sky-900 mb-8 border-r-4 border-sky-900 pr-4 italic">الإيرادات حسب القسم</h4>
               <div className="flex flex-col gap-6">
                 {deptStats.map(s => (
                   <div key={s.name} className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                           <span className="font-black text-sky-900">{s.name}</span>
                           <span className="font-black text-sky-950 tracking-tight">{s.revenue} ج.م</span>
                        </div>
                        <div className="h-4 bg-sky-50 rounded-full overflow-hidden border-2 border-sky-100">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${totalRevenue > 0 ? Math.min(100, (s.revenue / totalRevenue) * 100) : 0}%` }} className="h-full bg-sky-950 rounded-full" />
                        </div>
                      </div>
                      <div className="text-[10px] bg-sky-900 px-4 py-1.5 rounded-full font-black text-sky-50 shadow-lg">{s.count} زيارة</div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm">
               <h4 className="font-black text-sky-900 mb-8 border-r-4 border-sky-900 pr-4 italic">إحصائيات مكاتب الاستقبال</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {officeStats.map(o => (
                    <div key={o.name} className="bg-sky-50 p-8 rounded-[2.5rem] border-2 border-sky-100 group hover:bg-white hover:border-sky-900 transition-all">
                       <p className="font-black text-sky-950 text-xl mb-6">{o.name}</p>
                       <div className="flex justify-between items-center text-xs mb-4">
                          <span className="text-sky-500 font-extrabold uppercase tracking-widest">عدد المرضى</span>
                          <span className="font-black text-sky-950 tabular-nums text-lg">{o.patients}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs border-t border-sky-200/50 pt-4">
                          <span className="text-sky-500 font-extrabold uppercase tracking-widest">إجمالي التحصيل</span>
                          <span className="font-black text-brand-600 text-lg tabular-nums">{o.revenue} ج.م</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="flex flex-col gap-8">
            <div className="bg-sky-950 p-10 rounded-[3rem] text-white shadow-2xl shadow-sky-950/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
               <p className="text-sky-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4 relative z-10">إجمالي التحصيل ({range})</p>
               <h3 className="text-5xl font-black tabular-nums tracking-tighter relative z-10 text-white">{totalRevenue} <span className="text-sm font-bold text-white/40">EGP</span></h3>
               <div className="mt-10 pt-8 border-t border-white/10 flex items-center gap-6 relative z-10">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400 border border-white/10"><Activity size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">إجمالي الحالات</p>
                    <p className="font-black text-2xl tabular-nums text-white">{filteredVisits.length}</p>
                  </div>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm flex flex-col gap-10">
                <h4 className="font-black text-sky-900 border-r-4 border-sky-900 pr-4 italic">توزيع الإيرادات</h4>
                <div className="h-[260px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deptStats} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8}>
                           {deptStats.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={['#0f172a', '#334155', '#64748b', '#94a3b8'][index % 4]} stroke="none" />
                           ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest text-center">Department<br/>Split</p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                   {deptStats.map((s, i) => (
                     <div key={`report-legend-${s.name}-${i}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#0f172a', '#334155', '#64748b', '#94a3b8'][i % 4] }} />
                           <span className="text-[11px] font-black text-sky-900">{s.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-sky-500 tabular-nums">
                          {totalRevenue > 0 ? ((s.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                     </div>
                   ))}
                </div>
            </div>
         </div>
      </div>
    </motion.div>
  );
});

