import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Users,
  Building2,
  LayoutDashboard,
  Key,
  Database,
  Download,
  Info,
  UserPlus,
  X,
  Trash2,
  Plus,
  Lock,
  Tag,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Check,
  Save,
  Stethoscope,
  UserCheck,
  ClipboardList,
  BarChart3,
  History,
  Search,
  Printer,
  FileSpreadsheet,
  FileJson,
  FolderOpen,
  AlertCircle,
  Edit,
  Pencil,
  Folder,
  FolderPlus,
  ArrowUp,
  ChevronRight,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { logAudit } from "../lib/audit";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import {
  User,
  UserRole,
  ReceptionOffice,
  CustomField,
  HospitalData,
  ViewType,
  Permissions,
  DiscountScheme,
  PatientCategoryDefinition,
} from "../types";

interface SettingsViewProps {
  data: HospitalData;
  currentUser: User;
  saveData: (newData: HospitalData) => void;
  setActiveView?: (view: ViewType) => void;
  onLogout?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير النظام",
  DOCTOR: "طبيب",
  NURSE: "ممرض/ممرضة",
  STAFF: "موظف استقبال",
  DEVELOPER: "مطور النظام",
};

const PERMISSIONS_LIST = [
  { id: "canEditPatients", label: "تعديل بيانات المرضى" },
  { id: "canDeletePatients", label: "حذف المرضى" },
  { id: "canManageDepartments", label: "إدارة الأقسام والخدمات" },
  { id: "canEditPrices", label: "تعديل أسعار الكشوفات" },
  { id: "canCreateAccounts", label: "إنشاء حسابات مستخدمين" },
  { id: "canCancelServices", label: "إلغاء/حذف خدمات من الفاتورة" },
  { id: "canDeleteServices", label: "حذف الخدمات الطبية نهائياً من النظام" },
  { id: "canViewReports", label: "الوصول للتقارير المالية" },
  { id: "canViewAudit", label: "رؤية سجل الحركات" },
  { id: "canViewEmrHistory", label: "رؤية التاريخ المرضي (EMR)" },
  { id: "canViewEmrInfo", label: "رؤية البيانات الحيوية للمريض" },
  { id: "canViewEmrFiles", label: "رؤية المرفقات والملفات الطبية" },
  { id: "canAddEmrNotes", label: "إضافة ملاحظات طبية وزيارات" },
  { id: "canAddEmrPrescriptions", label: "إضافة الروشتات الطبية" },
  { id: "canAddEmrFiles", label: "رفع ملفات ومرفقات طبية" },
  { id: "canPrintInvoices", label: "طباعة الفواتير والسجلات" },
  { id: "patient_referral", label: "صلاحية تحويل المرضى (patient_referral)" },
  { id: "patient_referral_delete", label: "صلاحية حذف التحويلات (patient_referral_delete)" },
];

const PERMISSION_GROUPS = [
  {
    id: "patients",
    title: "إدارة بيانات وملفات المرضى",
    icon: Users,
    color: "text-sky-600 bg-sky-50 border-sky-200",
    permissions: [
      {
        id: "canEditPatients",
        label: "تعديل بيانات المرضى",
        desc: "تعديل الاسم والسن والهاتف والملفات والحقول الطبية المخصصة للمرضى",
      },
      {
        id: "canDeletePatients",
        label: "حذف المرضى",
        desc: "حذف سجلات وحسابات المرضى من النظام بشكل نهائي",
      },
      {
        id: "canPrintInvoices",
        label: "طباعة الفواتير والسجلات",
        desc: "إمكانية طباعة فواتير الحساب وملخصات المرضى وتذاكر الكشف",
      },
    ],
  },
  {
    id: "emr",
    title: "الملف الطبي والتاريخ المرضي (EMR)",
    icon: Stethoscope,
    color: "text-sky-600 bg-sky-50 border-sky-200",
    permissions: [
      {
        id: "canViewEmrHistory",
        label: "رؤية التاريخ المرضي (EMR)",
        desc: "عرض ملف الزيارات السابقة والتشخيصات والروشتات والملف الشامل",
      },
      {
        id: "canViewEmrInfo",
        label: "رؤية البيانات الحيوية للمريض",
        desc: "مشاهدة المؤشرات كضغط الدم والنبض والوزن والحرارة",
      },
      {
        id: "canViewEmrFiles",
        label: "رؤية المرفقات والملفات الطبية",
        desc: "تصفح وعرض صور الأشعة والتحاليل والملفات الطبية المرفوعة",
      },
      {
        id: "canAddEmrNotes",
        label: "إضافة ملاحظات طبية وزيارات",
        desc: "حفظ التشخيص الجديد، تفاصيل الحالة والملاحظات الطبية التقريرية",
      },
      {
        id: "canAddEmrPrescriptions",
        label: "إضافة الروشتات الطبية",
        desc: "كتابة وصياغة الروشتات العلاجية ووصفات الدواء للزيارة الحالية",
      },
      {
        id: "canAddEmrFiles",
        label: "رفع ملفات ومرفقات طبية",
        desc: "رفع ملفات أو صور أشعة أو تحاليل طبية تابعة لملفات المرضى",
      },
      {
        id: "patient_referral",
        label: "صلاحية تحويل المرضى",
        desc: "تسمح للطبيب بتحويل المرضى للأقسام الأخرى أو لأطباء العيادات وتتبعها ماليًا وإحصائيًا",
      },
      {
        id: "patient_referral_delete",
        label: "حذف التحويلات الطبية",
        desc: "حذف تحويل المريض بشكل نهائي من قسم التحويلات",
      },
    ],
  },
  {
    id: "finance",
    title: "الإدارة المالية والرقابة والإلغاء",
    icon: BarChart3,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    permissions: [
      {
        id: "canViewReports",
        label: "الوصول للتقارير المالية",
        desc: "الاطلاع على الإيرادات، الأرباح، وفواتير الأقسام والتحليلات البيانية",
      },
      {
        id: "canViewAudit",
        label: "رؤية سجل الحركات والأمان",
        desc: "الوصول لصفحة مراقبة حركات الموظفين وتتبع كافة العمليات الحساسة",
      },
      {
        id: "canCancelServices",
        label: "إلغاء/حذف خدمات من الفاتورة",
        desc: "سحب خدمة مخصصة، استراحة أو كشف من فاتورة المريض بعد كتابتها",
      },
      {
        id: "canDeleteServices",
        label: "حذف الخدمات الطبية نهائياً",
        desc: "حذف الخدمات الطبية أو الكشوفات بشكل نهائي من قاعدة بيانات النظام الكلية",
      },
    ],
  },
  {
    id: "system",
    title: "إدارة وإشراف إعدادات النظام",
    icon: Settings,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    permissions: [
      {
        id: "canManageDepartments",
        label: "إدارة الأقسام والخدمات",
        desc: "إضافة عيادات وأقسام جديدة أو تعديل الحالية وتعيين الكادر الطبي أو جدول الخدمات",
      },
      {
        id: "canEditPrices",
        label: "تعديل أسعار الكشوفات والخدمات",
        desc: "تعديل قائمة الأسعار والعقود الطبية ونسب الاستحقاق والاستقطاع",
      },
      {
        id: "canCreateAccounts",
        label: "إدارة حسابات المستخدمين",
        desc: "إنشاء حساب مستخدم جديد، تعيين كلمات المرور وتحديث الصلاحيات",
      },
    ],
  },
];

const getRemainingDays = (dateStr: string) => {
  if (!dateStr) return 0;
  const exp = new Date(dateStr).getTime();
  if (isNaN(exp)) return 0;
  const diff = exp - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const UserPermissionsConfigurator: React.FC<{
  userForm: Partial<User>;
  setUserForm: React.Dispatch<React.SetStateAction<Partial<User>>>;
  data: HospitalData;
  getDefaultPermissions: (role: UserRole) => Permissions;
}> = ({ userForm, setUserForm, data, getDefaultPermissions }) => {
  return (
    <div className="flex flex-col gap-10">
      {/* First: Operational Permissions Group */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-black text-sky-900 mb-1 flex items-center gap-3">
              <ShieldAlert className="text-sky-400" /> أولاً: صلاحيات الوظائف
              التشغيلية والوصول للمعلومات
            </h4>
            <p className="text-xs font-bold text-sky-500 mr-9 leading-relaxed">
              قم بتعيين الصلاحيات الفرعية والتشغيلية لوظائف الموظف أو الطبيب
              بدقة
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border-2 border-sky-100 shrink-0">
            <button
              type="button"
              onClick={() => {
                const defaultPerms = getDefaultPermissions(
                  userForm.role || "STAFF",
                );
                setUserForm((prev) => ({
                  ...prev,
                  permissions: {
                    ...prev.permissions!,
                    ...defaultPerms,
                  },
                }));
                toast.info("تم تطبيق صلاحيات الرتبة الافتراضية");
              }}
              className="px-3 py-1.5 bg-white border border-sky-200 hover:border-sky-300 rounded-xl text-[11px] font-black text-sky-800 flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <UserCheck size={13} className="text-sky-400" />
              إعادة تعيين للرتبة
            </button>

            <button
              type="button"
              onClick={() => {
                const allTruePerms = {} as any;
                PERMISSIONS_LIST.forEach((perm) => {
                  allTruePerms[perm.id] = true;
                });
                setUserForm((prev) => ({
                  ...prev,
                  permissions: {
                    ...prev.permissions!,
                    ...allTruePerms,
                  },
                }));
                toast.success("تم تفعيل كافة صلاحيات النظام الحالية");
              }}
              className="px-3 py-1.5 bg-sky-100 border border-sky-200 hover:bg-sky-200 rounded-xl text-[11px] font-black text-sky-900 flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <ShieldCheck size={13} />
              تفعيل الكل
            </button>

            <button
              type="button"
              onClick={() => {
                const allFalsePerms = {} as any;
                PERMISSIONS_LIST.forEach((perm) => {
                  allFalsePerms[perm.id] = false;
                });
                setUserForm((prev) => ({
                  ...prev,
                  permissions: {
                    ...prev.permissions!,
                    ...allFalsePerms,
                  },
                }));
                toast.warning("تم إلغاء كافة صلاحيات الحساب");
              }}
              className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-[11px] font-black text-rose-700 flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <X size={13} className="text-rose-500" />
              تعطيل الكل
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {PERMISSION_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const groupPermIds = group.permissions.map((p) => p.id);
            const isAllGroupChecked = groupPermIds.every(
              (id) => !!userForm.permissions?.[id as keyof Permissions],
            );

            return (
              <div
                key={group.id}
                className="bg-sky-50/50 border-2 border-sky-100 rounded-[2rem] p-6 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between border-b border-sky-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${group.color}`}>
                      <GroupIcon size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-sky-900">
                        {group.title}
                      </h5>
                      <span className="text-[10px] font-bold text-sky-500">
                        تحتوي على {group.permissions.length} صلاحيات فرعية
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newPerms = { ...userForm.permissions } as any;
                      const targetValue = !isAllGroupChecked;
                      groupPermIds.forEach((id) => {
                        newPerms[id] = targetValue;
                      });
                      setUserForm((prev) => ({
                        ...prev,
                        permissions: newPerms,
                      }));
                      toast.success(
                        targetValue
                          ? `تم تمكين مجموعة ${group.title}`
                          : `تم تعطيل مجموعة ${group.title}`,
                      );
                    }}
                    className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${
                      isAllGroupChecked
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200"
                    }`}
                  >
                    {isAllGroupChecked
                      ? "تعطيل المجموعة"
                      : "تمكين المجموعة كاملة"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.permissions.map((perm) => {
                    const isChecked = !!(userForm.permissions?.[
                      perm.id as keyof Permissions
                    ] as boolean);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => {
                          const newPerms = { ...userForm.permissions } as any;
                          newPerms[perm.id] = !newPerms[perm.id];
                          setUserForm((prev) => ({
                            ...prev,
                            permissions: newPerms,
                          }));
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-3 h-full relative group ${
                          isChecked
                            ? "bg-sky-950 border-sky-950 text-white shadow-xl shadow-sky-200"
                            : "bg-white border-sky-100 text-sky-400 hover:border-sky-200 hover:shadow-sm"
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-white/20 border-white/40 text-white shadow-sm"
                                : "border-sky-200 bg-white"
                            }`}
                          >
                            {isChecked && <Check size={14} />}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span
                            className={`font-black text-xs transition-colors ${isChecked ? "text-white" : "text-sky-700"}`}
                          >
                            {perm.label}
                          </span>
                          <span className={`text-[10px] font-bold leading-relaxed ${isChecked ? "text-sky-400" : "text-sky-500"}`}>
                            {perm.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Second: Sidebar View Permissions */}
      <div className="pt-8 border-t-2 border-sky-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-xl font-black text-sky-900 mb-1 flex items-center gap-3">
              <LayoutDashboard className="text-sky-400" /> ثانياً: الشاشات
              والصفحات المتاحة في القائمة الجانبية
            </h4>
            <p className="text-xs font-bold text-sky-500 mr-9">
              حدد الصفحات التي تظهر وتُتاح للمستخدم في شريط التنقل الجانبي
              للبرنامج
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setUserForm((prev) => ({
                  ...prev,
                  permissions: {
                    ...prev.permissions!,
                    visibleMainSections: [
                      "dashboard",
                      "registration",
                      "patients",
                      "departments",
                      "doctor",
                      "queue",
                      "reports",
                      "settings",
                      "audit",
                    ],
                  },
                }));
                toast.info("تم عرض كافة شاشات النظام بالقائمة الجانبية");
              }}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl text-[10px] font-black text-sky-800 transition-all active:scale-95 whitespace-nowrap"
            >
              تحديد كافة الشاشات
            </button>

            <button
              type="button"
              onClick={() => {
                setUserForm((prev) => ({
                  ...prev,
                  permissions: {
                    ...prev.permissions!,
                    visibleMainSections: [],
                  },
                }));
                toast.warning("تم إخفاء كافة شاشات القائمة الجانبية");
              }}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-[10px] font-black text-rose-700 transition-all active:scale-95 whitespace-nowrap"
            >
              إخفاء الجميع
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              id: "dashboard",
              label: "الرئيسية (Dashboard)",
              desc: "مؤشرات الأداء العامة وإحصائيات المستشفى والعيادات المباشرة",
              icon: LayoutDashboard,
              color: "text-sky-700 bg-sky-50",
            },
            {
              id: "registration",
              label: "تسجيل مريض جدید (Registration)",
              desc: "تسجيل بيانات المرضى وإضافة حقول مخصصة واستحقاقات وطباعة أساور التعريف",
              icon: UserPlus,
              color: "text-sky-700 bg-sky-50",
            },
            {
              id: "patients",
              label: "قاعدة بيانات المرضى (Patients)",
              desc: "البحث عن بيانات المرضى، التعديل الشامل، والملفات الطبية والزيارات السابقة",
              icon: Users,
              color: "text-sky-700 bg-sky-50",
            },
            {
              id: "departments",
              label: "الأقسام والخدمات (Departments)",
              desc: "إدارة العيادات والأطباء، أو الأقسام الفنية والخدمات الطبية والتسعير",
              icon: Building2,
              color: "text-amber-700 bg-amber-50",
            },
            {
              id: "doctor",
              label: "شاشة الطبيب والتشخيص (Doctor)",
              desc: "غرفة وبوابة الأطباء، الفحص الإكلينيكي المباشر، ملف الروشتات والأشعة ومرفقات EMR",
              icon: Stethoscope,
              color: "text-sky-700 bg-sky-50",
            },
            {
              id: "queue",
              label: "شاشات شباك الانتظار والانتظار العام (Queue)",
              desc: "متابعة شاشات الانتظار للمرضى ونقلهم بين العيادات وإصدار تذاكر الدخول وطباعتها",
              icon: ClipboardList,
              color: "text-fuchsia-700 bg-fuchsia-50",
            },
            {
              id: "reports",
              label: "التقارير المالية والتحليلات (Reports)",
              desc: "رؤية مداخيل المستشفى، الأرباح التفصيلية، فواتير الأقسام وشجرة تدفقات الصندوق الأساسية",
              icon: BarChart3,
              color: "text-brand-700 bg-brand-50",
            },
            {
              id: "settings",
              label: "الإعدادات العامة للنظام (Settings)",
              desc: "تغيير الحقول، تنظيف قاعدة البيانات، التراخيص والمستخدمين وتخصيص الفواتير",
              icon: Settings,
              color: "text-sky-700 bg-sky-50",
            },
            {
              id: "audit",
              label: "سجل حركات النظام والأمان (Audit Log)",
              desc: "سجلات تتبع الأمان لمراقبة حركات التسجيل والتعديل والحذف التي يقوم بها الموظفون بحساب الإدارة والمصادقة",
              icon: History,
              color: "text-violet-700 bg-violet-50",
            },
          ].map((screen) => {
            const isVisible = (
              userForm.permissions?.visibleMainSections || []
            ).includes(screen.id);
            const ScreenIcon = screen.icon;

            return (
              <div
                key={screen.id}
                onClick={() => {
                  const currentSections =
                    userForm.permissions?.visibleMainSections || [];
                  const newSections = currentSections.includes(screen.id)
                    ? currentSections.filter((id) => id !== screen.id)
                    : [...currentSections, screen.id];

                  setUserForm((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions!,
                      visibleMainSections: newSections,
                    },
                  }));
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 group ${
                  isVisible
                    ? "bg-sky-950 border-sky-950 shadow-xl shadow-sky-200 text-white"
                    : "bg-white border-sky-100 text-sky-400 hover:border-sky-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center md:items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${screen.color} shrink-0`}>
                      <ScreenIcon size={16} />
                    </div>
                    <span
                      className={`font-black text-xs ${isVisible ? "text-white" : "text-sky-700"}`}
                    >
                      {screen.label}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isVisible ? "bg-white/20 border-white/40 text-white" : "border-sky-200"}`}
                  >
                    {isVisible && <Check size={12} />}
                  </div>
                </div>
                <span className={`text-[10px] font-bold leading-relaxed text-right ${isVisible ? "text-sky-400" : "text-sky-500"}`}>
                  {screen.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Third: Department Assignment */}
      <div className="pt-8 border-t-2 border-sky-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-xl font-black text-sky-900 mb-1 flex items-center gap-3">
              <Stethoscope className="text-sky-400" /> ثالثاً: العيادات
              والأقسام الطبية المخصصة للمستخدم
            </h4>
            <p className="text-xs font-bold text-sky-500 mr-9">
              حدد العيادات/الأقسام الطبية المخصصة لعمل هذا الحساب (لرؤية تذاكر
              المرضى الخاصة بقسمه وطبيبه فقط)
            </p>
          </div>

          {data.departments && data.departments.length > 0 && (
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const allDeptIds = data.departments.map((d) => d.id);
                  setUserForm((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions!,
                      assignedDepartments: allDeptIds,
                    },
                  }));
                  toast.success("تم تحديد جميع العيادات والأقسام للعمل عليها");
                }}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl text-[10px] font-black text-sky-800 transition-all active:scale-95 whitespace-nowrap"
              >
                تحديد جميع العيادات
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserForm((prev) => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions!,
                      assignedDepartments: [],
                    },
                  }));
                  toast.info("تم إلغاء التخصيص الحصري (متاح تلقائياً للكل)");
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-[10px] font-black text-rose-700 transition-all active:scale-95 whitespace-nowrap"
              >
                إلغاء التخصيص للقسم (مفتوح للكل)
              </button>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl mb-6 text-xs font-black text-amber-950 leading-relaxed text-right flex items-start gap-2">
          <span className="shrink-0 font-bold">⚠️</span>
          <span>
            تنبيه هام: إذا لم تقم بتحديد أي قسم من القائمة بالأسفل، فسيتم اعتبار
            أن الحساب له الصلاحية الكاملة "العامة المفتوحة تلقائيًا" لمشاهدة
            والعمل على جميع العيادات والأقسام الطبية بالكامل (Default).
          </span>
        </div>

        {!data.departments || data.departments.length === 0 ? (
          <div className="p-8 bg-white border-2 border-dashed border-sky-200 rounded-[2rem] text-center text-sky-400 font-bold text-xs flex flex-col items-center justify-center gap-2">
            <Stethoscope size={30} className="text-sky-300" />
            لا توجد أي أقسام طبية مضافة بعد في شاشة (الأقسام والخدمات). يرجى
            إضافة عيادة أو قسم أولاً لتخصيص الوصول.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.departments.map((dept) => {
              const isAssigned = (
                userForm.permissions?.assignedDepartments || []
              ).includes(dept.id);
              return (
                <div
                  key={dept.id}
                  onClick={() => {
                    const currentDepts =
                      userForm.permissions?.assignedDepartments || [];
                    const newDepts = currentDepts.includes(dept.id)
                      ? currentDepts.filter((id) => id !== dept.id)
                      : [...currentDepts, dept.id];

                    setUserForm((prev) => ({
                      ...prev,
                      permissions: {
                        ...prev.permissions!,
                        assignedDepartments: newDepts,
                      },
                    }));
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isAssigned
                      ? "bg-sky-950 border-sky-950 text-white shadow-xl shadow-sky-200"
                      : "bg-white border-sky-100 text-sky-400 hover:border-sky-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isAssigned ? "bg-white/20 border-white/40 text-white" : "border-sky-200"}`}
                    >
                      {isAssigned && <Check size={14} />}
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-xs block ${isAssigned ? "text-white" : "text-sky-950"}`}>
                        {dept.name}
                      </span>
                      <span className={`text-[10px] font-black font-mono mt-0.5 block ${isAssigned ? "text-sky-400" : "text-sky-500"}`}>
                        {dept.type === "CLINIC"
                          ? "🏢 عيادة كشف"
                          : dept.type === "LAB"
                            ? "🔬 معمل تحاليل"
                            : dept.type === "RADIOLOGY"
                              ? "🩻 مركز أشعة"
                              : "⚙️ أخرى"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Optimized Internal Input Component
const OptimizedInput: React.FC<{
  initialValue: string | number;
  onSave: (val: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}> = ({
  initialValue,
  onSave,
  type = "text",
  placeholder,
  className,
  icon,
}) => {
  const [val, setVal] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setVal(initialValue);
    setIsDirty(false);
  }, [initialValue]);

  const handleBlur = () => {
    if (isDirty) {
      onSave(val.toString());
      setIsDirty(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(val.toString());
      setIsDirty(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="relative flex-1">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={val}
        placeholder={placeholder}
        onChange={(e) => {
          setVal(e.target.value);
          setIsDirty(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${className} ${isDirty ? "border-amber-400" : ""} transition-colors pr-10`}
      />
      {isDirty && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-4 top-1/2 -translate-y-1/2"
        >
          <div className="bg-amber-100 border border-amber-200 text-amber-900 p-1 rounded-md text-[10px] font-black uppercase">
            التعديل يحتاج حفظ
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  currentUser,
  saveData,
  onLogout,
}) => {
  const [activeTab, setActiveTabInternal] = useState<
    "general" | "users" | "offices" | "fields" | "developer"
  >(() => {
    const saved = localStorage.getItem("hospital_settings_active_tab");
    if (saved === "developer" && currentUser.role !== "DEVELOPER") {
      return "general";
    }
    return (saved as any) || "general";
  });

  const setActiveTab = (tab: "general" | "users" | "offices" | "fields" | "developer") => {
    setActiveTabInternal(tab);
    localStorage.setItem("hospital_settings_active_tab", tab);
  };
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({ basic: true, custom: true });

  // Hospital Info states
  const [isHospitalInfoCollapsed, setIsHospitalInfoCollapsed] = useState(true);
  const [hName, setHName] = useState(data.settings?.hospitalName || "");
  const [hAddress, setHAddress] = useState(data.settings?.hospitalAddress || "");
  const [hPhone, setHPhone] = useState(data.settings?.hospitalPhone || "");

  const [availableBackups, setAvailableBackups] = useState<any[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setHName(data.settings?.hospitalName || "");
    setHAddress(data.settings?.hospitalAddress || "");
    setHPhone(data.settings?.hospitalPhone || "");
  }, [data.settings?.hospitalName, data.settings?.hospitalAddress, data.settings?.hospitalPhone]);

  // Office management states
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ReceptionOffice | null>(
    null,
  );
  const [officeFormName, setOfficeFormName] = useState("");

  // Custom fields option adder temporary state
  const [newOptionValue, setNewOptionValue] = useState<Record<string, string>>(
    {},
  );

  const getDefaultPermissions = (role: UserRole): Permissions => {
    if (role === "DEVELOPER") {
      return {
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
        visibleMainSections: [
          "dashboard",
          "registration",
          "patients",
          "departments",
          "doctor",
          "queue",
          "reports",
          "settings",
          "audit",
        ],
        assignedDepartments: [],
      };
    }

    const roleDefault = data.settings?.roleDefaults?.find(
      (rd) => rd.role === role,
    );
    if (roleDefault) return { ...roleDefault.defaultPermissions };

    return {
      canEditPatients: role === "ADMIN",
      canDeletePatients: role === "ADMIN",
      canManageDepartments: role === "ADMIN",
      canEditPrices: role === "ADMIN",
      canCreateAccounts: role === "ADMIN",
      canCancelServices: role === "ADMIN",
      canDeleteServices: role === "ADMIN",
      canViewReports: role === "ADMIN",
      canViewAudit: role === "ADMIN",
      canViewEmrHistory:
        role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canViewEmrInfo: role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canViewEmrFiles:
        role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canAddEmrNotes: role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canAddEmrPrescriptions:
        role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canAddEmrFiles: role === "ADMIN" || role === "DOCTOR" || role === "NURSE",
      canPrintInvoices: true,
      visibleMainSections:
        role === "ADMIN"
          ? [
              "dashboard",
              "registration",
              "patients",
              "departments",
              "doctor",
              "queue",
              "reports",
              "settings",
              "audit",
            ]
          : role === "DOCTOR" || role === "NURSE"
            ? ["dashboard", "doctor", "queue"]
            : ["dashboard", "registration", "patients", "queue"],
      assignedDepartments: [],
    };
  };

  const initialUserForm: Partial<User> = {
    username: "",
    name: "",
    role: "STAFF",
    password: "",
    permissions: getDefaultPermissions("STAFF"),
  };

  const [userForm, setUserForm] = useState<Partial<User>>(initialUserForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    subId?: string;
    name: string;
    message: string;
    onDelete: () => void;
  } | null>(null);

  const [newRenewalPass, setNewRenewalPass] = useState("");
  
  // Patient category states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PatientCategoryDefinition | null>(null);
  const [categoryForm, setCategoryForm] = useState<Partial<PatientCategoryDefinition>>({
    label: '',
    color: 'slate',
    availableDiscounts: []
  });
  const [newDiscLabel, setNewDiscLabel] = useState("");
  const [newDiscValue, setNewDiscValue] = useState<number | "">("");
  const [newStoragePath, setNewStoragePath] = useState(
    data.settings?.storagePath || "app_config.json",
  );
  const [isMigrating, setIsMigrating] = useState(false);

  // Directory browser states
  const [showDirBrowser, setShowDirBrowser] = useState(false);
  const [dirCurrentPath, setDirCurrentPath] = useState("");
  const [dirList, setDirList] = useState<string[]>([]);
  const [dirParentPath, setDirParentPath] = useState("");
  const [dirLoading, setDirLoading] = useState(false);
  const [dirNewFolderName, setDirNewFolderName] = useState("");
  const [windowsDrives, setWindowsDrives] = useState<string[]>([]);
  const [dirError, setDirError] = useState<string | null>(null);
  const [testPathResult, setTestPathResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTestingPath, setIsTestingPath] = useState(false);

  const handleOpenDirBrowser = async (startPath?: string) => {
    setShowDirBrowser(true);
    setDirLoading(true);
    setDirError(null);
    try {
      const pathValue = startPath || newStoragePath || "";
      const cleanPath = pathValue.toLowerCase().endsWith(".json")
        ? pathValue.substring(
            0,
            Math.max(pathValue.lastIndexOf("/"), pathValue.lastIndexOf("\\")),
          )
        : pathValue;

      const response = await fetch("/api/browse-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPath: cleanPath }),
      });
      const resData = await response.json();
      if (response.ok) {
        setDirCurrentPath(resData.currentPath);
        setDirList(resData.directories || []);
        setDirParentPath(resData.parentPath || "");
        setWindowsDrives(resData.windowsDrives || []);
        setDirError(resData.error || null);
      } else {
        const fallbackRes = await fetch("/api/browse-directories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPath: "" }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          setDirCurrentPath(fallbackData.currentPath);
          setDirList(fallbackData.directories || []);
          setDirParentPath(fallbackData.parentPath || "");
          setWindowsDrives(fallbackData.windowsDrives || []);
          setDirError(fallbackData.error || null);
        }
      }
    } catch (e) {
      toast.error("أخطاء في جلب قائمة المجلدات");
    } finally {
      setDirLoading(false);
    }
  };

  const handleNavigateDir = async (target: string) => {
    setDirLoading(true);
    setDirError(null);
    try {
      const response = await fetch("/api/browse-directories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPath: target }),
      });
      const resData = await response.json();
      if (response.ok) {
        setDirCurrentPath(resData.currentPath);
        setDirList(resData.directories || []);
        setDirParentPath(resData.parentPath || "");
        setWindowsDrives(resData.windowsDrives || []);
        setDirError(resData.error || null);
      } else {
        toast.error("تعذر فتح المجلد المحدد");
      }
    } catch (e) {
      toast.error("أخطاء في الانتقال بين المجلدات");
    } finally {
      setDirLoading(false);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!dirNewFolderName.trim()) {
      toast.error("يرجى تحديد اسم المجلد الجديد");
      return;
    }
    try {
      const response = await fetch("/api/create-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePath: dirCurrentPath,
          dirName: dirNewFolderName.trim(),
        }),
      });
      const resData = await response.json();
      if (response.ok) {
        toast.success("تم إنشاء المجلد بنجاح");
        setDirNewFolderName("");
        handleNavigateDir(dirCurrentPath);
      } else {
        toast.error(resData.error || "فشل إنشاء المجلد");
      }
    } catch (e) {
      toast.error("خطأ غير متوقع أثناء إنشاء المجلد");
    }
  };

  const handleSelectFolder = () => {
    setNewStoragePath(dirCurrentPath);
    setShowDirBrowser(false);
    toast.success("تم تحديد المسار الجديد");
    setTestPathResult(null);
  };

  const handleTestPath = async (pathToTestInput?: string) => {
    const targetPath = pathToTestInput || newStoragePath;
    if (!targetPath) {
      toast.error("يرجى تحديد مسار أولاً");
      return;
    }
    setIsTestingPath(true);
    setTestPathResult(null);
    try {
      const response = await fetch("/api/test-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathToCheck: targetPath }),
      });
      const resData = await response.json();
      if (resData.success) {
        setTestPathResult({
          success: true,
          message: "المسار متاح للقراءة والكتابة ولديك صلاحيات الوصول الكاملة!",
        });
        toast.success("المسار صالح ومتاح للكتابة!");
      } else {
        setTestPathResult({
          success: false,
          message: `تعذر الوصول للمسار: ${resData.error || "صلاحيات غير كافية أو تنسيق خاطئ"}`,
        });
        toast.error("تعذر الوصول وصلاحيات غير كافية لهذا المجلد");
      }
    } catch (e) {
      setTestPathResult({
        success: false,
        message: "تعذر الاتصال بالخادم لاختبار المسار",
      });
    } finally {
      setIsTestingPath(false);
    }
  };

  const handleSaveUser = () => {
    if (
      !userForm.username ||
      !userForm.name ||
      (!editingUser && !userForm.password)
    ) {
      toast.error("يرجى إكمال البيانات الأساسية");
      return;
    }

    const newUser: User = {
      id: editingUser ? editingUser.id : `u-${Date.now()}`,
      username: userForm.username!,
      name: userForm.name!,
      role: (userForm.role || "STAFF") as UserRole,
      password: userForm.password || editingUser?.password || "",
      permissions: userForm.permissions as Permissions,
      assignedOfficeId: userForm.assignedOfficeId || undefined,
    };

    if (newUser.role === "DEVELOPER" && newUser.id !== "u-dev") {
      toast.error(
        "لا يمكن تعيين هذا الدور للمستخدم أو إنشاء حساب مطور نظام آخر",
      );
      return;
    }

    if (editingUser?.role === "DEVELOPER" || editingUser?.id === "u-dev") {
      toast.error("غير مسموح بتعديل حساب المطور عبر واجهة الإدارة العادية");
      return;
    }

    const currentUsers = Array.isArray(data.users) ? data.users : [];
    let newUsers = [...currentUsers];

    if (editingUser) {
      newUsers = newUsers.map((u) => (u.id === editingUser.id ? newUser : u));
      logAudit(
        currentUser,
        "SYSTEM_SETTINGS_CHANGE",
        newUser.id,
        newUser.name,
        editingUser,
        newUser,
        "تعديل حساب مستخدم",
      );
    } else {
      if (currentUsers.some((u) => u.username === newUser.username)) {
        toast.error("اسم المستخدم موجود مسبقاً");
        return;
      }
      newUsers.push(newUser);
      logAudit(
        currentUser,
        "SYSTEM_SETTINGS_CHANGE",
        newUser.id,
        newUser.name,
        null,
        newUser,
        "إنشاء حساب مستخدم جديد",
      );
    }

    saveData({ ...data, users: newUsers });
    setShowUserModal(false);
    setEditingUser(null);
    toast.success(
      editingUser ? "تم تحديث المستخدم" : "تم إضافة المستخدم بنجاح",
    );
  };

  const handleSaveOffice = () => {
    if (!officeFormName.trim()) {
      toast.error("يرجى كتابة اسم مكتب الاستقبال");
      return;
    }

    const currentOffices = data.settings?.offices || [];
    let updatedOffices = [...currentOffices];

    if (editingOffice) {
      updatedOffices = updatedOffices.map((o) =>
        o.id === editingOffice.id ? { ...o, name: officeFormName.trim() } : o,
      );
      logAudit(
        currentUser,
        "SYSTEM_SETTINGS_CHANGE",
        editingOffice.id,
        officeFormName.trim(),
        editingOffice,
        { ...editingOffice, name: officeFormName.trim() },
        "تعديل اسم مكتب استقبال",
      );
      toast.success("تم تعديل مكتب الاستقبال بنجاح");
    } else {
      const isDuplicate = currentOffices.some(
        (o) => o.name.toLowerCase() === officeFormName.trim().toLowerCase(),
      );
      if (isDuplicate) {
        toast.error("مكتب الاستقبال هذا موجود بالفعل");
        return;
      }
      const newOffice: ReceptionOffice = {
        id: `o-${Date.now()}`,
        name: officeFormName.trim(),
      };
      updatedOffices.push(newOffice);
      logAudit(
        currentUser,
        "SYSTEM_SETTINGS_CHANGE",
        newOffice.id,
        newOffice.name,
        null,
        newOffice,
        "إنشاء مكتب استقبال جديد",
      );
      toast.success("تمت إضافة مكتب الاستقبال بنجاح");
    }

    saveData({
      ...data,
      settings: {
        ...data.settings,
        offices: updatedOffices,
      },
    });

    setOfficeFormName("");
    setEditingOffice(null);
    setShowOfficeModal(false);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.label?.trim()) {
      toast.error("يرجى إدخال مسمى التصنيف");
      return;
    }

    const newData = { ...data };
    if (!newData.settings.patientCategories) newData.settings.patientCategories = [];

    if (editingCategory) {
      newData.settings.patientCategories = newData.settings.patientCategories.map(c => 
        c.id === editingCategory.id ? { 
          ...c, 
          label: categoryForm.label!,
          color: categoryForm.color || 'slate',
          requiresDiscountScheme: categoryForm.requiresDiscountScheme,
          discountOverridePercent: categoryForm.discountOverridePercent,
          availableDiscounts: categoryForm.availableDiscounts || []
        } : c
      );
      toast.success("تم تحديث التصنيف بنجاح");
    } else {
      const newCat: PatientCategoryDefinition = {
        id: `cat-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        label: categoryForm.label!,
        color: categoryForm.color || 'slate',
        isDefault: false,
        requiresDiscountScheme: categoryForm.requiresDiscountScheme,
        discountOverridePercent: categoryForm.discountOverridePercent,
        availableDiscounts: categoryForm.availableDiscounts || []
      };
      newData.settings.patientCategories.push(newCat);
      toast.success("تمت إضافة التصنيف بنجاح");
    }

    saveData(newData);
    setShowCategoryModal(false);
    setCategoryForm({ label: '', color: 'slate', availableDiscounts: [] });
    setEditingCategory(null);
  };

  const handleDeleteOffice = (officeId: string) => {
    const currentOffices = data.settings?.offices || [];

    if (currentOffices.length <= 1) {
      toast.error(
        "لا يمكن حذف آخر مكتب استقبال بقي في النظام. يجب توفر مكتب واحد على الأقل.",
      );
      return;
    }

    const associatedPatients =
      data.patients?.filter((p) => p.officeId === officeId) || [];
    const associatedUsers =
      data.users?.filter((u) => u.assignedOfficeId === officeId) || [];

    if (associatedPatients.length > 0 || associatedUsers.length > 0) {
      toast.error(
        `لا يمكن حذف المسمى لوجود عدد (${associatedPatients.length}) مرضى مسجلين على هذا المكتب، و (${associatedUsers.length}) موظفين معينين عليه. يرجى تعديله بدلاً من حذفه.`,
      );
      return;
    }

    const office = currentOffices.find((o) => o.id === officeId);
    const updatedOffices = currentOffices.filter((o) => o.id !== officeId);

    saveData({
      ...data,
      settings: {
        ...data.settings,
        offices: updatedOffices,
      },
    });

    logAudit(
      currentUser,
      "SYSTEM_SETTINGS_CHANGE",
      officeId,
      office?.name || "",
      office,
      null,
      "حذف مكتب استقبال",
    );
    toast.success("تم حذف مكتب الاستقبال بنجاح");
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({ ...user, permissions: { ...user.permissions } });
    setShowUserModal(true);
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch("/api/create-backup", { method: "POST" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_${new Date().toISOString()}.zip`;
        a.click();
        toast.success("تم إنشاء نسخة احتياطية بنجاح");
      }
    } catch (e) {
      toast.error("فشل إنشاء نسخة احتياطية");
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/list-backups");
      if (res.ok) {
        const list = await res.json();
        setAvailableBackups(list);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === "general") {
      fetchBackups();
    }
  }, [activeTab]);

  const handleRestoreBackup = async (filename: string) => {
    if (
      !window.confirm(
        "تنبيه: استعادة نسخة احتياطية سيؤدي لمسح البيانات الحالية واستبدالها بما في النسخة. هل أنت متأكد؟",
      )
    )
      return;

    setIsRestoring(true);
    try {
      const res = await fetch("/api/restore-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        toast.success("تم استعادة البيانات بنجاح. سيتم تحديث الصفحة.");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("فشل استعادة النسخة الاحتياطية");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء محاولة الاستعادة");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleMigrateData = async () => {
    if (!newStoragePath || newStoragePath === data.settings.storagePath) {
      toast.error("يرجى تحديد مسار جديد مختلف عن المسار الحالي");
      return;
    }

    setIsMigrating(true);
    try {
      const res = await fetch("/api/migrate-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath:
            data.settings.storagePath === "app_config.json"
              ? ""
              : data.settings.storagePath,
          newPath: newStoragePath,
        }),
      });

      if (res.ok) {
        const newData = { ...data };
        newData.settings.storagePath = newStoragePath;
        saveData(newData);
        toast.success("تم نقل البيانات وتحديث المسار بنجاح");
      } else {
        toast.error("فشل نقل البيانات. تأكد من صحة المسار.");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء المحاولة");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-8 pb-20"
    >
      <div className="flex flex-wrap gap-3">
        {[
          { id: "general", label: "عام", icon: Settings },
          { id: "users", label: "المستخدمين", icon: Users },
          { id: "offices", label: "مكاتب الاستقبال", icon: Building2 },
          { id: "fields", label: "تخصيص البيانات", icon: LayoutDashboard },
          {
            id: "developer",
            label: "المطور",
            icon: Key,
            hidden: currentUser.role !== "DEVELOPER",
          },
        ]
          .filter((t) => !t.hidden)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black transition-all ${activeTab === tab.id ? "bg-sky-100 text-sky-950 border-2 border-sky-300 shadow-xl" : "bg-white text-sky-950 hover:bg-white border-2 border-sky-200"}`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-sky-200 shadow-2xl p-6 md:p-10 min-h-[500px]">
        {activeTab === "general" && (
          <div className="flex flex-col gap-10">
            {/* Hospital details section */}
            <section className="flex flex-col gap-4">
              <div
                onClick={() => setIsHospitalInfoCollapsed(!isHospitalInfoCollapsed)}
                className="flex items-center justify-between bg-sky-50 border-2 border-sky-200 p-6 rounded-[2rem] cursor-pointer hover:bg-sky-100/50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-sky-700 rounded-xl border border-sky-200 shadow-inner">
                    <Building2 size={24} />
                  </div>
                  <div className="text-right">
                    <h4 className="text-xl font-black text-sky-950">بيانات وتفاصيل المشفى / المركز</h4>
                    <p className="text-xs font-bold text-sky-600">تعديل الاسم، العنوان، ورقم الهاتف المطبوع على الفواتير والسجلات</p>
                  </div>
                </div>
                <div className="text-sky-500">
                  {isHospitalInfoCollapsed ? <ChevronDown size={28} /> : <ChevronDown size={28} className="rotate-180 transition-transform" />}
                </div>
              </div>

              <AnimatePresence>
                {!isHospitalInfoCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-white border-2 border-sky-100 rounded-[2rem] p-8 flex flex-col gap-6 shadow-md"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-sky-700 text-right">اسم المستشفى / المركز الطبي</label>
                        <input
                          type="text"
                          value={hName}
                          onChange={(e) => setHName(e.target.value)}
                          placeholder="مثال: مركز هادي ماهر الطبي المتكامل"
                          className="bg-sky-50/50 border-2 border-sky-100 rounded-2xl p-4 font-bold text-sky-950 outline-none focus:ring-4 focus:ring-sky-100 text-right text-sm border-box"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black text-sky-700 text-right">رقم هاتف التواصل</label>
                        <input
                          type="text"
                          value={hPhone}
                          onChange={(e) => setHPhone(e.target.value)}
                          placeholder="مثال: 01017485367"
                          className="bg-sky-50/50 border-2 border-sky-100 rounded-2xl p-4 font-bold text-sky-950 outline-none focus:ring-4 focus:ring-sky-100 text-right text-sm border-box"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-black text-sky-700 text-right">العنوان التفصيلي</label>
                      <input
                        type="text"
                        value={hAddress}
                        onChange={(e) => setHAddress(e.target.value)}
                        placeholder="مثال: القاهرة، مصر الجديدة، شارع الميرغني"
                        className="bg-sky-50/50 border-2 border-sky-100 rounded-2xl p-4 font-bold text-sky-950 outline-none focus:ring-4 focus:ring-sky-100 text-right text-sm border-box"
                      />
                    </div>

                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveData({
                            ...data,
                            settings: {
                              ...data.settings,
                              hospitalName: hName.trim(),
                              hospitalAddress: hAddress.trim(),
                              hospitalPhone: hPhone.trim()
                            }
                          });
                          toast.success("تم حفظ بيانات المستشفى بنجاح");
                        }}
                        className="bg-sky-950 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm"
                      >
                        <Save size={18} /> حفظ بيانات المشفى
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="flex flex-col gap-6">
              <h4 className="text-2xl font-black text-sky-950 flex items-center gap-3">
                <Printer className="text-sky-700" /> إعدادات الطباعة
              </h4>
              <div className="p-8 bg-white border-2 border-sky-200 rounded-[2.5rem] flex items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <p className="font-black text-sky-950 text-lg">
                    الطباعة التلقائية للفواتير
                  </p>
                  <p className="text-sm font-bold text-sky-900 opacity-80">
                    تفعيل خيار الطباعة التلقائية فور حفظ بيانات المريض
                  </p>
                </div>
                <button
                  onClick={() => {
                    saveData({
                      ...data,
                      settings: {
                        ...data.settings,
                        autoPrintInvoice: !data.settings?.autoPrintInvoice,
                      },
                    });
                    toast.success(
                      `تم ${!data.settings?.autoPrintInvoice ? "تفعيل" : "إلغاء"} الطباعة التلقائية`,
                    );
                  }}
                  className={`px-10 py-5 rounded-3xl font-black shadow-xl transition-all flex items-center gap-3 ${data.settings?.autoPrintInvoice ? "bg-sky-100 text-sky-950 border-2 border-sky-300 shadow-sky-600/10" : "bg-sky-50 text-sky-700 shadow-sky-800/10 border-2 border-sky-200"}`}
                >
                  {data.settings?.autoPrintInvoice ? (
                    <>
                      <Check size={22} /> مفعّل
                    </>
                  ) : (
                    <>
                      <X size={22} /> معطّل
                    </>
                  )}
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-6">
              <h4 className="text-2xl font-black text-sky-950 flex items-center gap-3">
                <Database className="text-sky-700" /> النسخ الاحتياطي والاستعادة
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Manual Backup Download */}
                <div className="p-8 bg-white border-2 border-sky-200 rounded-[2.5rem] flex flex-col items-stretch justify-between gap-6 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                        <Download size={20} />
                      </div>
                      <p className="font-black text-sky-950 text-lg">
                        تحميل يدوي لنسخة شاملة
                      </p>
                    </div>
                    <p className="text-xs font-bold text-sky-700 opacity-80 leading-relaxed">
                      سيتم تجميع كافة مجلدات المرضى (EMR) والمرفقات وقاعدة البيانات في ملف واحد مضغوط (ZIP) يمكنك تحميله والاحتفاظ به خارجياً.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="bg-sky-100 text-sky-950 border-2 border-sky-200 px-10 py-5 rounded-3xl font-black shadow-xl shadow-sky-700/10 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-sky-200"
                  >
                    <Download size={20} /> تحميل النسخة الآن
                  </button>
                </div>

                {/* Automatic Backups List & Restore */}
                <div className="p-8 bg-sky-50 border-2 border-sky-200 rounded-[2.5rem] flex flex-col gap-6 shadow-md shadow-sky-900/5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm border border-sky-100">
                        <History size={20} />
                      </div>
                      <p className="font-black text-sky-950 text-lg">
                        النسخ الاحتياطية التلقائية للنظام
                      </p>
                    </div>
                    <p className="text-xs font-bold text-sky-700 opacity-80 leading-relaxed">
                      يقوم النظام تلقائياً بحفظ نسخة يومية من قاعدة البيانات. يمكنك العودة لبيانات أي يوم سابق من القائمة أدناه.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableBackups.length > 0 ? (
                      availableBackups.map((bak) => (
                        <div 
                          key={bak.name}
                          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-sky-200 hover:border-sky-400 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-mono text-[10px] font-black group-hover:opacity-80 transition-colors">
                              ZIP
                            </div>
                            <div>
                              <p className="text-sm font-black text-sky-950">{bak.date}</p>
                              <p className="text-[10px] font-bold text-sky-500">نسخة قاعدة البيانات (PostgreSQL)</p>
                            </div>
                          </div>
                          <button
                            disabled={isRestoring}
                            onClick={() => handleRestoreBackup(bak.name)}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black transition-all border border-emerald-100 active:scale-95 disabled:opacity-50"
                          >
                            {isRestoring ? "جاري الاستعادة..." : "استعادة"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-sky-400 gap-2 opacity-60">
                        <AlertCircle size={24} />
                        <p className="text-xs font-black">لا تتوفر نسخ احتياطية تلقائية حالياً</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-6 pt-6 border-t-2 border-sky-200">
              <div className="bg-amber-50 border-4 border-amber-400 p-10 rounded-[3rem] relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-3xl font-black text-amber-950 flex items-center gap-3">
                    <FolderOpen size={30} className="text-amber-600" /> إعدادات التخزين المحلي والقرص الصلب
                  </h4>
                  <p className="text-amber-800 font-bold mt-3 text-lg leading-relaxed">
                    هذا النظام مصمم ليعمل **محلياً بالكامل**. يتم تخزين كل مريض في
                    **مجلد خاص** يحتوي على تاريخه المرضي ومرفقاته الطبية.
                    <br /> يمكنك تغيير "مسار التخزين" لنقل المجلد الرئيسي بالكامل
                    إلى مكان آخر (مثل القرص D أو قرص خارجي) لضمان الأمان وتفادي الفقدان.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-white border-2 border-sky-200 rounded-[2.5rem] flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex-grow">
                    <label className="block text-xs font-black text-sky-500 mb-2 px-2">
                      مسار مجلد حفظ البيانات الفعلي (يدعم جميع برتشنات Windows ومسارات Linux بالكامل)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newStoragePath}
                        onChange={(e) => setNewStoragePath(e.target.value)}
                        placeholder="مثال: D:\HospitalData"
                        className="flex-grow bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none focus:ring-4 focus:ring-amber-100 placeholder-sky-350 text-right"
                      />
                      <div className="flex gap-2 shrink-0 font-black">
                        <button
                          type="button"
                          onClick={() => handleOpenDirBrowser()}
                          className="px-5 bg-white border-2 border-sky-600 hover:bg-white text-sky-950 rounded-2xl font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs sm:text-sm"
                          title="تصفح مجلدات وأقراص الكمبيوتر والبرتشنات"
                        >
                          <FolderOpen size={20} className="text-amber-600" />
                          تصفح وتحديد المسار
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestPath()}
                          disabled={isTestingPath}
                          className={`px-5 bg-sky-50 border-2 border-sky-200 text-sky-800 rounded-2xl font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs sm:text-sm ${isTestingPath ? "opacity-50" : "hover:bg-sky-100"}`}
                          title="اختبار الصلاحية والقراءة/الكتابة على المسار"
                        >
                          <ShieldCheck size={20} className="text-sky-600" />
                          {isTestingPath ? "جاري الفحص..." : "اختبار مسار الحفظ"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {testPathResult && (
                    <div
                      className={`p-4 rounded-2xl border-2 font-bold flex items-center gap-3 ${testPathResult.success ? "bg-sky-50 border-sky-200 text-sky-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}
                    >
                      {testPathResult.success ? (
                        <ShieldCheck className="text-sky-600 shrink-0" size={24} />
                      ) : (
                        <AlertCircle className="text-rose-600 shrink-0" size={24} />
                      )}
                      <div>
                        <p className="text-sm font-black">
                          {testPathResult.success ? "جاهز وصالح للاستخدام الفوري" : "فحص مسار الحفظ غير ناجح"}
                        </p>
                        <p className="text-xs opacity-90 mt-0.5">{testPathResult.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mt-2">
                    <div className="flex items-start gap-2 max-w-xl text-right animate-fade-in">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <p className="text-xs font-bold text-sky-600 leading-relaxed">
                        عند تغيير هذا المسار وتأكيده، سيقوم الخادم تلقائياً بنقل ملف قاعدة البيانات وجميع مجلدات المرضى ومرفقاتهم الطبية السابقة إلى المسار الجديد بأمان كامل دون أي فقدان.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMigrateData}
                      disabled={isMigrating}
                      className={`px-8 py-5 bg-sky-100 text-sky-950 border-2 border-sky-200 rounded-2xl font-black shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 shrink-0 ${isMigrating ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-200"}`}
                    >
                      {isMigrating ? "جاري نقل وتحديث الملفات للبرتشن..." : <><Save size={22} /> اعتماد ونقل مسار الحفظ الجديد</>}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "users" && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-sky-200 gap-4">
              <h4 className="text-2xl font-black text-sky-950">
                إدارة حسابات الموظفين والأطباء
              </h4>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserForm(initialUserForm);
                  setShowUserModal(true);
                }}
                className="w-full md:w-auto bg-sky-100 text-sky-900 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-white transition-all active:scale-95"
              >
                <UserPlus size={22} /> إضافة مستخدم
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data.users || [])
                .filter(
                  (u) =>
                    u.role !== "DEVELOPER" || currentUser.role === "DEVELOPER",
                )
                .map((user) => (
                  <div
                    key={user.id}
                    className="p-8 bg-white rounded-[2.5rem] border-2 border-sky-100 flex justify-between items-center group hover:border-sky-900 transition-all shadow-lg"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-sky-950 flex items-center justify-center font-black text-white text-2xl shadow-xl">
                        {user.name?.[0]}
                      </div>
                      <div>
                        <p className="font-black text-sky-950 text-lg">
                          {user.name}
                        </p>
                        <p className="text-xs font-black text-sky-500 mt-1">
                          {ROLE_LABELS[user.role] || user.role} | @
                          {user.username}
                          {user.assignedOfficeId && ` | تخصيص: ${data.settings?.offices?.find((o) => o.id === user.assignedOfficeId)?.name || 'غير معروف'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.role !== "DEVELOPER" ? (
                        <>
                          <button
                            onClick={() => openEditUser(user)}
                            className="p-3 text-sky-950 hover:text-sky-700 hover:bg-sky-50 rounded-2xl transition-all"
                            title="تعديل"
                          >
                            <Settings size={22} />
                          </button>
                          {user.id !== currentUser.id && (
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  id: user.id,
                                  name: user.name,
                                  message: "حذف المستخدم؟",
                                  onDelete: () =>
                                    saveData({
                                      ...data,
                                      users: data.users.filter(
                                        (u) => u.id !== user.id,
                                      ),
                                    }),
                                });
                              }}
                              className="p-3 text-sky-900 hover:text-red-700 hover:bg-red-50 rounded-2xl transition-all"
                              title="حذف"
                            >
                              <Trash2 size={22} />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] bg-sky-950 text-white font-extrabold px-3 py-1.5 rounded-xl whitespace-nowrap">
                          حساب مطور محمي ومؤمن 🛡️
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "offices" && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-sky-100 gap-4">
              <div className="flex flex-col gap-1 text-right">
                <h4 className="text-2xl font-black text-sky-900">
                  إدارة مكاتب الاستقبال والغرف
                </h4>
                <p className="text-xs font-bold text-sky-500">
                  قم بإضافة وتعديل نقاط الاستقبال لتصنيف المرضى وتوزيع الموظفين
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingOffice(null);
                  setOfficeFormName("");
                  setShowOfficeModal(true);
                }}
                className="w-full md:w-auto bg-sky-950 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-sky-800 transition-all active:scale-95 font-sans"
              >
                <Plus size={22} /> إضافة مكتب استقبال
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
              {(data.settings?.offices || []).map((office) => {
                const patientsCount = (data.patients || []).filter(
                  (p) => p.officeId === office.id,
                ).length;
                const assignedUsers = (data.users || []).filter(
                  (u) => u.assignedOfficeId === office.id,
                );

                return (
                  <div
                    key={office.id}
                    className="p-8 bg-white rounded-[2.5rem] border-2 border-sky-100 flex flex-col justify-between group hover:border-sky-900 transition-all shadow-lg min-h-[180px]"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-900 flex items-center justify-center font-black shadow-sm">
                            <Building2 size={24} />
                          </div>
                          <h5 className="font-black text-sky-950 text-xl">
                            {office.name}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingOffice(office);
                              setOfficeFormName(office.name);
                              setShowOfficeModal(true);
                            }}
                            className="p-2 aspect-square text-sky-600 hover:text-sky-950 hover:bg-sky-50 rounded-xl transition-all"
                            title="تعديل"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteOffice(office.id)}
                            className="p-2 aspect-square text-sky-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-sky-100 pt-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-sky-400 uppercase">
                            المرضى المسجلين
                          </p>
                          <p className="text-lg font-black text-sky-900 mt-1">
                            {patientsCount} مريض
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-sky-400 uppercase">
                            الموظفين المتاحين
                          </p>
                          <p className="text-lg font-black text-sky-900 mt-1">
                            {assignedUsers.length} موظفين
                          </p>
                        </div>
                      </div>
                    </div>

                    {assignedUsers.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                        {assignedUsers.slice(0, 3).map((u) => (
                          <span
                            key={u.id}
                            className="px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-xs font-bold font-mono"
                          >
                            {u.name}
                          </span>
                        ))}
                        {assignedUsers.length > 3 && (
                          <span className="px-2 py-0.5 bg-white text-sky-450 rounded-lg text-[10px] font-bold">
                            +{assignedUsers.length - 3} آخرين
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "fields" && (
          <div className="flex flex-col gap-8 text-right">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-sky-200 gap-4">
              <div className="flex flex-col gap-1 text-right">
                <h4 className="text-2xl font-black text-sky-950">
                  تخصيص البيانات والحقول
                </h4>
                <p className="text-xs font-bold text-sky-600">
                  قم بتنظيم وتفعيل وتفصيل الحقول التي تظهر في استمارة تسجيل
                  المرضى
                </p>
              </div>
              <button
                onClick={() => {
                  const field: CustomField = {
                    id: `cf-${Date.now()}`,
                    label: "حقل جديد",
                    type: "text",
                    active: true,
                    required: false,
                    options: [],
                  };
                  saveData({
                    ...data,
                    settings: {
                      ...data.settings,
                      customPatientFields: [
                        ...(data.settings?.customPatientFields || []),
                        field,
                      ],
                    },
                  });
                  setExpandedSections((prev) => ({ ...prev, custom: true }));
                  toast.success("تم إنشاء حقل مخصص جديد");
                }}
                className="w-full md:w-auto bg-sky-100 text-sky-900 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 hover:bg-white transition-all font-sans"
              >
                <Plus size={22} /> إضافة حقل مخصص جديد
              </button>
            </div>

            <div className="flex flex-col gap-6 font-sans">
              {/* 1. COLLAPSIBLE FOR DEFAULT SYSTEM FIELDS */}
              <div className="border-2 border-sky-200 rounded-[2.5rem] overflow-hidden bg-white shadow-md">
                <button
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      basic: !prev.basic,
                    }))
                  }
                  className="w-full flex items-center justify-between p-6 bg-white hover:bg-sky-50 transition-all text-right group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-700 group-hover:text-sky-950 transition-all">
                      <ShieldCheck size={28} />
                    </div>
                    <div className="text-right">
                      <h5 className="text-xl font-black text-sky-950">
                        بيانات المرضى الأساسية والتلقائية
                      </h5>
                      <p className="text-xs font-bold text-sky-500 font-sans">
                        تعديل التفعيل والإلزام للمسميات الافتراضية للنظام
                        (الاسم، الهاتف، السن، إلخ)
                      </p>
                    </div>
                  </div>
                  <Plus
                    size={24}
                    className={`text-sky-500 transition-transform duration-300 ${expandedSections.basic ? "rotate-45" : "rotate-0"}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSections.basic && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-sky-200 p-6 flex flex-col gap-4 bg-white text-right font-sans"
                    >
                      {(data.settings?.customPatientFields || [])
                        .filter((f) => f.isSystemField)
                        .map((field) => {
                          const isNameField = field.id === "sys-name";
                          return (
                            <div
                              key={field.id}
                              className="p-6 bg-white border-2 border-sky-200/60 rounded-3xl flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between"
                            >
                              <div className="flex-1 w-full flex flex-col gap-1 text-right">
                                <label className="text-xs font-black text-sky-500 uppercase text-right block">
                                  اسم الحقل الأساسي
                                </label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => {
                                    const newList = (
                                      data.settings?.customPatientFields || []
                                    ).map((f) =>
                                      f.id === field.id
                                        ? { ...f, label: e.target.value }
                                        : f,
                                    );
                                    saveData({
                                      ...data,
                                      settings: {
                                        ...data.settings,
                                        customPatientFields: newList,
                                      },
                                    });
                                  }}
                                  className="w-full bg-white border-2 border-sky-200 rounded-xl p-3 font-black text-sky-950 outline-none text-right"
                                />
                                {isNameField && (
                                  <span className="text-[10px] text-amber-600 font-bold mt-1 text-right block">
                                    ⚠️ هذا الحقل جوهري للنظام ولا يمكن تعطيله أو
                                    إلغاء إلزاميته
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto justify-end mt-4 lg:mt-0">
                                {/* Active State Toggle */}
                                <div className="flex flex-col gap-1 text-right">
                                  <span className="text-xs font-black text-sky-500 text-right block mb-1">
                                    العرض في الاستمارة
                                  </span>
                                  <button
                                    disabled={isNameField}
                                    onClick={() => {
                                      const newList = (
                                        data.settings?.customPatientFields || []
                                      ).map((f) =>
                                        f.id === field.id
                                          ? { ...f, active: !f.active }
                                          : f,
                                      );
                                      saveData({
                                        ...data,
                                        settings: {
                                          ...data.settings,
                                          customPatientFields: newList,
                                        },
                                      });
                                      toast.success(
                                        `تم ${!field.active ? "تفعيل" : "إلغاء تفعيل"} عرض ${field.label}`,
                                      );
                                    }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${isNameField ? "bg-sky-100 text-sky-405" : field.active ? "bg-sky-100 text-sky-800 hover:bg-sky-200" : "bg-rose-100 text-rose-800 hover:bg-rose-200"}`}
                                  >
                                    {field.active
                                      ? "● نشط ويعرض"
                                      : "○ معطّل ومخفي"}
                                  </button>
                                </div>

                                {/* Required State Toggle */}
                                <div className="flex flex-col gap-1 text-right">
                                  <span className="text-xs font-black text-sky-500 text-right block mb-1">
                                    صفة الحقل
                                  </span>
                                  <button
                                    disabled={isNameField}
                                    onClick={() => {
                                      const newList = (
                                        data.settings?.customPatientFields || []
                                      ).map((f) =>
                                        f.id === field.id
                                          ? { ...f, required: !f.required }
                                          : f,
                                      );
                                      saveData({
                                        ...data,
                                        settings: {
                                          ...data.settings,
                                          customPatientFields: newList,
                                        },
                                      });
                                      toast.success(
                                        `تم تغيير ${field.label} إلى ${!field.required ? "إجباري" : "اختياري"}`,
                                      );
                                    }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${isNameField ? "bg-sky-100 text-sky-405" : field.required ? "bg-sky-100 text-sky-800 hover:bg-sky-200" : "bg-sky-50 text-sky-700 hover:bg-sky-100"}`}
                                  >
                                    {field.required
                                      ? "★ حقل إجباري"
                                      : "☆ حقل اختياري"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. COLLAPSIBLE FOR CUSTOM CLINICAL FIELDS */}
              <div className="border-2 border-sky-200 rounded-[2.5rem] overflow-hidden bg-white shadow-md">
                <button
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      custom: !prev.custom,
                    }))
                  }
                  className="w-full flex items-center justify-between p-6 bg-white hover:bg-sky-50 transition-all text-right group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-700 group-hover:text-sky-950 transition-all">
                      <LayoutDashboard size={28} />
                    </div>
                    <div className="text-right">
                      <h5 className="text-xl font-black text-sky-950">
                        الحقول الطبية والإدارية المخصصة (Custom Fields)
                      </h5>
                      <p className="text-xs font-bold text-sky-500 font-sans">
                        إضافة وتعديل حقول خاصة لمركزك (التشخيص، فصيلة الدم، جهات
                        التحويل، صور الأشعة، إلخ)
                      </p>
                    </div>
                  </div>
                  <Plus
                    size={24}
                    className={`text-sky-500 transition-transform duration-300 ${expandedSections.custom ? "rotate-45" : "rotate-0"}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {expandedSections.custom && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-sky-200 p-6 flex flex-col gap-6 bg-white text-right font-sans"
                    >
                      {(data.settings?.customPatientFields || []).filter(
                        (f) => !f.isSystemField,
                      ).length === 0 ? (
                        <div className="text-center p-12 bg-white border-2 border-dashed border-sky-200 rounded-3xl flex flex-col items-center gap-3">
                          <Info
                            className="text-sky-500 animate-pulse"
                            size={40}
                          />
                          <p className="font-black text-sky-900 text-lg">
                            لا توجد حقول طبية مخصصة حتى الآن
                          </p>
                          <p className="text-xs font-bold text-sky-500 font-sans">
                            قم بالنقر على "إضافة حقل مخصص جديد" بالأعلى لتهيئة
                            حقول العيادة المناسبة لمجالك
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6 text-right">
                          {(data.settings?.customPatientFields || [])
                            .filter((f) => !f.isSystemField)
                            .map((field) => {
                              return (
                                <div
                                  key={field.id}
                                  className="p-6 bg-white border-2 border-sky-200 rounded-3xl flex flex-col gap-6 shadow-sm border-l-4 border-l-sky-600 hover:border-l-sky-800 transition-all text-right"
                                >
                                  {/* Header Row */}
                                  <div className="flex flex-wrap justify-between items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                                      <span className="text-[10px] font-black text-sky-500 font-mono tracking-wider">
                                        {field.id}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (
                                          data.settings?.customPatientFields ||
                                          []
                                        ).filter((f) => f.id !== field.id);
                                        saveData({
                                          ...data,
                                          settings: {
                                            ...data.settings,
                                            customPatientFields: updated,
                                          },
                                        });
                                        toast.success(
                                          `تم حذف الحقل ${field.label} بنجاح`,
                                        );
                                      }}
                                      className="px-4 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 text-xs font-black rounded-lg transition-all flex items-center gap-2 font-sans"
                                    >
                                      <Trash2 size={14} /> حذف الحقل نهائياً
                                    </button>
                                  </div>

                                  {/* Configurations Panel */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                                    {/* 1. Label */}
                                    <div className="flex flex-col gap-1.5 text-right w-full">
                                      <label className="text-xs font-black text-sky-500 uppercase text-right">
                                        مسمى الحقل وعنوانه بالاستمارة
                                      </label>
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => {
                                          const newList = (
                                            data.settings
                                              ?.customPatientFields || []
                                          ).map((f) =>
                                            f.id === field.id
                                              ? { ...f, label: e.target.value }
                                              : f,
                                          );
                                          saveData({
                                            ...data,
                                            settings: {
                                              ...data.settings,
                                              customPatientFields: newList,
                                            },
                                          });
                                        }}
                                        className="w-full bg-white border-2 border-sky-200 rounded-xl p-3 font-black text-sky-950 outline-none focus:border-sky-600 transition-colors text-right"
                                      />
                                    </div>

                                    {/* 2. Type */}
                                    <div className="flex flex-col gap-1.5 text-right w-full">
                                      <label className="text-xs font-black text-sky-500 uppercase text-right">
                                        نوع إدخال الحقل
                                      </label>
                                      <select
                                        value={field.type}
                                        onChange={(e) => {
                                          const selectedType = e.target
                                            .value as any;
                                          const newList = (
                                            data.settings
                                              ?.customPatientFields || []
                                          ).map((f) =>
                                            f.id === field.id
                                              ? {
                                                  ...f,
                                                  type: selectedType,
                                                  options:
                                                    selectedType === "select"
                                                      ? f.options || []
                                                      : undefined,
                                                }
                                              : f,
                                          );
                                          saveData({
                                            ...data,
                                            settings: {
                                              ...data.settings,
                                              customPatientFields: newList,
                                            },
                                          });
                                        }}
                                        className="w-full bg-white border-2 border-sky-200 rounded-xl p-3 font-black text-sky-950 outline-none focus:border-sky-600 transition-colors"
                                      >
                                        <option value="text">
                                          📝 نص قصير (Text Input)
                                        </option>
                                        <option value="number">
                                          🔢 رقمى مباشر (Number Input)
                                        </option>
                                        <option value="date">
                                          📅 تاريخ مالي أو طبي (Date Picker)
                                        </option>
                                        <option value="select">
                                          🔽 قائمة الاختيار المنسدل (Dropdown
                                          Selector)
                                        </option>
                                        <option value="textarea">
                                          📄 كتلة نصية وملاحظات (Textarea Block)
                                        </option>
                                      </select>
                                    </div>

                                    {/* 3. Status Switches */}
                                    <div className="flex gap-4 items-end w-full">
                                      {/* Active Status */}
                                      <div className="flex-1 flex flex-col gap-1 text-right">
                                        <span className="text-xs font-black text-sky-500 text-right block mb-1">
                                          حالة الحقل
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newList = (
                                              data.settings
                                                ?.customPatientFields || []
                                            ).map((f) =>
                                              f.id === field.id
                                                ? { ...f, active: !f.active }
                                                : f,
                                            );
                                            saveData({
                                              ...data,
                                              settings: {
                                                ...data.settings,
                                                customPatientFields: newList,
                                              },
                                            });
                                            toast.success(
                                              `تم ${!field.active ? "تفعيل" : "إلغاء تفعيل"} عرض ${field.label}`,
                                            );
                                          }}
                                          className={`w-full py-3 rounded-xl text-xs font-black transition-all ${field.active ? "bg-sky-100 text-sky-800 hover:bg-sky-200" : "bg-sky-100 text-sky-600 hover:bg-sky-300"}`}
                                        >
                                          {field.active
                                            ? "● معروض ونشط"
                                            : "○ معطل ومخفي"}
                                        </button>
                                      </div>

                                      {/* Required Status */}
                                      <div className="flex-1 flex flex-col gap-1 text-right">
                                        <span className="text-xs font-black text-sky-500 text-right block mb-1 font-sans">
                                          ميزة الحقل
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newList = (
                                              data.settings
                                                ?.customPatientFields || []
                                            ).map((f) =>
                                              f.id === field.id
                                                ? {
                                                    ...f,
                                                    required: !f.required,
                                                  }
                                                : f,
                                            );
                                            saveData({
                                              ...data,
                                              settings: {
                                                ...data.settings,
                                                customPatientFields: newList,
                                              },
                                            });
                                            toast.success(
                                              `تم تحويل ${field.label} إلى ${!field.required ? "إجباري" : "اختياري"}`,
                                            );
                                          }}
                                          className={`w-full py-3 rounded-xl text-xs font-black transition-all ${field.required ? "bg-sky-100 text-sky-800 hover:bg-sky-200" : "bg-sky-50 text-sky-700 hover:bg-sky-100"}`}
                                        >
                                          {field.required
                                            ? "★ حقل إجباري"
                                            : "☆ حقل اختياري"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Special options editor if the type is a Dropdown Select! */}
                                  {field.type === "select" && (
                                    <div className="mt-4 p-5 bg-white rounded-2xl border-2 border-sky-200 flex flex-col gap-4 text-right">
                                      <div className="flex flex-col gap-1">
                                        <p className="font-black text-sky-900 text-sm block text-right">
                                          خيارات القائمة المنسدلة المتاحة
                                        </p>
                                        <p className="text-[10px] font-bold text-sky-500 block text-right font-sans">
                                          هذه هي عناصر الاختيار التي تظهر
                                          كخيارات للموظف عند الضغط على الحقل
                                        </p>
                                      </div>

                                      {/* Display Active Choices as Badges with cross click deletion */}
                                      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-white border border-sky-200 rounded-xl items-center justify-start">
                                        {!field.options ||
                                        field.options.length === 0 ? (
                                          <span className="text-xs font-bold text-sky-500 mr-2 text-right block w-full">
                                            لا توجد خيارات بعد. أضف عناصر
                                            بالأسفل...
                                          </span>
                                        ) : (
                                          field.options.map((opt) => (
                                            <div
                                              key={opt}
                                              className="px-3 py-1.5 bg-sky-50 border border-sky-100 text-sky-800 text-xs font-black rounded-lg flex items-center gap-2 shadow-sm"
                                            >
                                              <span>{opt}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updatedFields = (
                                                    data.settings
                                                      ?.customPatientFields ||
                                                    []
                                                  ).map((f) => {
                                                    if (f.id === field.id) {
                                                      return {
                                                        ...f,
                                                        options: (
                                                          f.options || []
                                                        ).filter(
                                                          (o) => o !== opt,
                                                        ),
                                                      };
                                                    }
                                                    return f;
                                                  });
                                                  saveData({
                                                    ...data,
                                                    settings: {
                                                      ...data.settings,
                                                      customPatientFields:
                                                        updatedFields,
                                                    },
                                                  });
                                                  toast.success(
                                                    "تم إقصاء الخيار",
                                                  );
                                                }}
                                                className="w-4 h-4 rounded-full bg-sky-200 text-sky-900 flex items-center justify-center font-black hover:bg-sky-300 hover:text-sky-950 transition-all text-[9px]"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>

                                      {/* Inline Input Box to insert new dropdown lists */}
                                      <div className="flex gap-3">
                                        <input
                                          type="text"
                                          value={newOptionValue[field.id] || ""}
                                          onChange={(e) =>
                                            setNewOptionValue({
                                              ...newOptionValue,
                                              [field.id]: e.target.value,
                                            })
                                          }
                                          placeholder="اكتب اسم الخيار واضغط إضافة (مثل: فصيلة A، تأمين أليانز، إلخ)..."
                                          className="flex-1 bg-white border-2 border-sky-200 rounded-xl p-3 font-black text-xs text-sky-950 outline-none focus:border-sky-600 focus:bg-white transition-all text-right"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              const optVal =
                                                newOptionValue[field.id];
                                              if (optVal && optVal.trim()) {
                                                const currentOpts =
                                                  field.options || [];
                                                if (
                                                  currentOpts.includes(
                                                    optVal.trim(),
                                                  )
                                                ) {
                                                  toast.error(
                                                    "هذا الخيار متواجد مسبقاً",
                                                  );
                                                  return;
                                                }
                                                const updatedFields = (
                                                  data.settings
                                                    ?.customPatientFields || []
                                                ).map((f) => {
                                                  if (f.id === field.id) {
                                                    return {
                                                      ...f,
                                                      options: [
                                                        ...currentOpts,
                                                        optVal.trim(),
                                                      ],
                                                    };
                                                  }
                                                  return f;
                                                });
                                                saveData({
                                                  ...data,
                                                  settings: {
                                                    ...data.settings,
                                                    customPatientFields:
                                                      updatedFields,
                                                  },
                                                });
                                                setNewOptionValue({
                                                  ...newOptionValue,
                                                  [field.id]: "",
                                                });
                                                toast.success(
                                                  "تمت إضافة خيار القائمة بنجاح",
                                                );
                                              }
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const optVal =
                                              newOptionValue[field.id];
                                            if (optVal && optVal.trim()) {
                                              const currentOpts =
                                                field.options || [];
                                              if (
                                                currentOpts.includes(
                                                  optVal.trim(),
                                                )
                                              ) {
                                                toast.error(
                                                  "هذا الخيار متواجد مسبقاً",
                                                );
                                                return;
                                              }
                                              const updatedFields = (
                                                data.settings
                                                  ?.customPatientFields || []
                                              ).map((f) => {
                                                if (f.id === field.id) {
                                                  return {
                                                    ...f,
                                                    options: [
                                                      ...currentOpts,
                                                      optVal.trim(),
                                                    ],
                                                  };
                                                }
                                                return f;
                                              });
                                              saveData({
                                                ...data,
                                                settings: {
                                                  ...data.settings,
                                                  customPatientFields:
                                                    updatedFields,
                                                },
                                              });
                                              setNewOptionValue({
                                                ...newOptionValue,
                                                [field.id]: "",
                                              });
                                              toast.success(
                                                "تمت إضافة خيار القائمة بنجاح",
                                              );
                                            } else {
                                              toast.error(
                                                "يرجى كتابة نص الخيار أولاً",
                                              );
                                            }
                                          }}
                                          className="px-6 bg-sky-100 border border-sky-200 hover:bg-sky-200 text-sky-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
                                        >
                                          إضافة خيار
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. COLLAPSIBLE FOR PATIENT CATEGORIES & CONTRACTS */}
              <div className="border-2 border-sky-200 rounded-[2.5rem] overflow-hidden bg-white shadow-md">
                <div
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      categories: !prev.categories,
                    }))
                  }
                  className="w-full flex items-center justify-between p-6 bg-white hover:bg-sky-50 transition-all text-right group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-700 group-hover:text-sky-950 transition-all">
                      <Users size={28} />
                    </div>
                    <div className="text-right">
                      <h5 className="text-xl font-black text-sky-950">
                        تصنيفات المرضى وفئات التعاقد
                      </h5>
                      <p className="text-xs font-bold text-sky-500 font-sans">
                        إدارة فئات التعامل المالي (نقدي، تأمين، تعاقدات) وتخصيص ألوانها ومسمياتها
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(null);
                          setCategoryForm({ label: '', color: 'slate', availableDiscounts: [] });
                          setShowCategoryModal(true);
                        }}
                        className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-sky-700 transition-all"
                     >
                        إضافة تصنيف جديد
                     </button>
                    <Plus
                      size={24}
                      className={`text-sky-500 transition-transform duration-300 ${expandedSections.categories ? "rotate-45" : "rotate-0"}`}
                    />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {expandedSections.categories && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-sky-200 p-6 flex flex-col gap-6 bg-white text-right font-sans"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(data.settings?.patientCategories || []).map((cat) => (
                          <div 
                            key={cat.id} 
                            className="bg-white border-2 border-sky-100 rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:border-sky-400 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-4 h-4 rounded-full bg-${cat.color}-500 shadow-lg`} />
                                <h6 className="font-black text-sky-950 text-lg">{cat.label}</h6>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm(cat);
                                    setShowCategoryModal(true);
                                  }}
                                  className="p-2.5 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-xl transition-all shadow-sm flex items-center gap-2"
                                >
                                  <Pencil size={16} />
                                  <span className="text-[10px] font-black">تعديل</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setDeleteConfirm({
                                      id: cat.id,
                                      name: cat.label,
                                      message: "هل أنت متأكد من حذف هذا التصنيف؟",
                                      onDelete: () => {
                                        const newList = (data.settings?.patientCategories || []).filter(c => c.id !== cat.id);
                                        saveData({
                                          ...data,
                                          settings: {
                                            ...data.settings,
                                            patientCategories: newList
                                          }
                                        });
                                        toast.success('تم حذف التصنيف');
                                      }
                                    });
                                  }}
                                  className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all shadow-sm"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                               {cat.discountOverridePercent !== undefined && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-100">خصم ثابت: {cat.discountOverridePercent}%</span>
                               )}
                               {cat.requiresDiscountScheme && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-lg border border-indigo-100">يتطلب جهة تعاقد</span>
                               )}
                               {(cat.availableDiscounts || []).length > 0 && (
                                  <span className="bg-sky-50 text-sky-700 text-[10px] font-black px-3 py-1 rounded-lg border border-sky-100">{(cat.availableDiscounts || []).length} نسب خصم فرعية</span>
                               )}
                            </div>

                            <div className="flex flex-col gap-1 border-t border-sky-50 pt-2">
                              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">المعرف البرمجي</span>
                              <span className="text-xs font-mono font-bold text-sky-600">{cat.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {activeTab === "developer" && currentUser.role === "DEVELOPER" && (
          <div className="flex flex-col gap-10">

            <section className="flex flex-col gap-6 pt-6 border-t-2 border-sky-200">
              <h5 className="text-xl font-black text-sky-950 flex items-center gap-3">
                <AlertTriangle className="text-amber-500" /> مدة صلاحية وتراخيص
                النظام (System Expiry & Licensing)
              </h5>
              <div className="p-8 bg-white border-2 border-sky-200 rounded-[2.5rem] flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border-2 border-sky-200 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-black text-sky-500 uppercase mb-1">
                        الوضع الحالي وفترة الصلاحية
                      </p>
                      <p className="text-md font-bold text-sky-700">
                        تاريخ الانتهاء:{" "}
                        <span className="font-black text-sky-950">
                          {data.settings.licenseExpiryDate && !isNaN(new Date(data.settings.licenseExpiryDate).getTime())
                            ? format(
                                new Date(data.settings.licenseExpiryDate),
                                "yyyy-MM-dd",
                              )
                            : "غير محدد"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-xs font-bold text-sky-600">
                        الأيام المتبقية:
                      </span>
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs font-black ${
                          getRemainingDays(data.settings.licenseExpiryDate) > 7
                            ? "bg-sky-100 text-sky-800"
                            : "bg-red-100 text-red-800 animate-pulse"
                        }`}
                      >
                        {getRemainingDays(data.settings.licenseExpiryDate)} يوم
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-2 border-sky-200 flex flex-col gap-3">
                    <label className="block text-xs font-black text-sky-500 uppercase">
                      تعديل يدوي لتاريخ نهاية الصلاحية
                    </label>
                    <input
                      type="date"
                      value={
                        data.settings.licenseExpiryDate && !isNaN(new Date(data.settings.licenseExpiryDate).getTime())
                          ? format(
                              new Date(data.settings.licenseExpiryDate),
                              "yyyy-MM-dd",
                            )
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(e.target.value);
                          newDate.setHours(23, 59, 59, 999);
                          const newData = { ...data };
                          newData.settings.licenseExpiryDate =
                            newDate.toISOString();
                          saveData(newData);
                          toast.success(
                            "تم تعديل تاريخ انتهاء الصلاحية يدويًا",
                          );
                        }
                      }}
                      className="w-full bg-white border-2 border-sky-200 rounded-xl p-3 font-black text-sky-950 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <label className="block text-xs font-black text-sky-500 uppercase px-1">
                    مفاتيح التمديد السريع لفترة ترخيص البرنامج
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { days: 30, label: "تمديد شهر (30 يوم)" },
                      { days: 90, label: "تمديد 3 أشهر (90 يوم)" },
                      { days: 180, label: "تمديد 6 أشهر (180 يوم)" },
                      { days: 365, label: "تمديد سنة (365 يوم)" },
                    ].map((btn) => (
                      <button
                        key={btn.days}
                        onClick={() => {
                          const currentExp = new Date(
                            data.settings.licenseExpiryDate,
                          ).getTime();
                          const base =
                            currentExp > Date.now() ? currentExp : Date.now();
                          const newExp = new Date(
                            base + btn.days * 24 * 60 * 60 * 1000,
                          ).toISOString();

                          const newData = { ...data };
                          newData.settings.licenseExpiryDate = newExp;
                          saveData(newData);
                          toast.success(
                            `تم تمديد فترة صلاحية النظام بمقدار ${btn.days} يومًا بنجاح`,
                          );
                        }}
                        type="button"
                        className="p-4 bg-white border-2 border-sky-200 rounded-xl font-black text-xs text-sky-800 hover:border-sky-600 hover:bg-white active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1"
                      >
                        <span>{btn.label}</span>
                        <span className="text-[10px] text-sky-700 font-bold">
                          إضافة {btn.days} يوم للمدة
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-6 pt-6 border-t-2 border-sky-200">
              <h5 className="text-xl font-black text-sky-950 flex items-center gap-3">
                <Lock className="text-sky-500" /> كلمة سر تجديد التراخيص
              </h5>
              <div className="p-8 bg-white border-2 border-sky-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full">
                  <input
                    type="password"
                    value={newRenewalPass}
                    onChange={(e) => setNewRenewalPass(e.target.value)}
                    placeholder="تغيير كلمة سر التجديد..."
                    className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    const newData = { ...data };
                    newData.settings.renewalPasswordHash = newRenewalPass;
                    saveData(newData);
                    toast.success("تم تحديث كلمة السر");
                    setNewRenewalPass("");
                  }}
                  className="bg-sky-100 text-sky-900 px-10 py-5 rounded-3xl font-black shadow-xl"
                >
                  تحديث كلمة السر
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOfficeModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] border border-white/20"
            >
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <Building2 size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">
                            {editingOffice ? "تعديل مكتب استقبال" : "إضافة مكتب استقبال جديد"}
                        </h3>
                        <p className="text-sm text-sky-500 font-bold">إدارة مكاتب الاستقبال</p>
                     </div>
                  </div>
                  <button onClick={() => setShowOfficeModal(false)} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                     <X size={24} className="text-sky-400" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin text-right">
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                      عنوان أو اسم المَكتب (مثل: الاستقبال الرئيسي، كاونتر الدور الثاني)
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={officeFormName}
                      onChange={(e) => setOfficeFormName(e.target.value)}
                      placeholder="اكتب اسم المكتب هنا..."
                      className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl p-5 font-black text-sky-900 outline-none transition-all text-right"
                    />
                  </div>
                </div>
              </div>

               <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                  <button onClick={() => setShowOfficeModal(false)} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                    إلغاء
                  </button>
                  <button onClick={handleSaveOffice} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg">
                    {editingOffice ? "حفظ التعديلات" : "إضافة المكتب الآن"}
                  </button>
               </div>
            </motion.div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-white/20"
            >
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <UserPlus size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">
                          {editingUser ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
                        </h3>
                        <p className="text-sm text-sky-500 font-bold">إدارة حسابات وصلاحيات النظام</p>
                     </div>
                  </div>
                  <button onClick={() => setShowUserModal(false)} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                     <X size={24} className="text-sky-400" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin text-right">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                     <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                       الاسم الكامل
                     </label>
                     <input
                       type="text"
                       value={userForm.name}
                       onChange={(e) =>
                         setUserForm({ ...userForm, name: e.target.value })
                       }
                       className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none focus:ring-4 focus:ring-sky-200"
                     />
                   </div>
                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                    اسم المستخدم (@)
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({ ...userForm, username: e.target.value })
                    }
                    className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none focus:ring-4 focus:ring-sky-200"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                    الدور / الرتبة
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setUserForm({
                        ...userForm,
                        role: newRole,
                        permissions: getDefaultPermissions(newRole),
                      });
                    }}
                    className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none"
                  >
                    {Object.entries(ROLE_LABELS)
                      .filter(([k]) => k !== "DEVELOPER")
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                    كلمة المرور {editingUser && "(اتركها فارغة لعدم التغيير)"}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2">
                    تخصيص شباك الاستقبال / المكتب
                  </label>
                  <select
                    value={userForm.assignedOfficeId || ""}
                    onChange={(e) =>
                      setUserForm({ ...userForm, assignedOfficeId: e.target.value })
                    }
                    className="w-full bg-white border-2 border-sky-200 rounded-2xl p-5 font-black text-sky-950 outline-none focus:ring-4 focus:ring-sky-200"
                  >
                    <option value="">-- بدون تخصيص (الكل) --</option>
                    {(data.settings?.offices || []).map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t-2 border-sky-200">
                <UserPermissionsConfigurator
                  userForm={userForm}
                  setUserForm={setUserForm}
                  data={data}
                  getDefaultPermissions={getDefaultPermissions}
                />
              </div>

              {false && (
                <>
                  <div className="mt-10 pt-10 border-t-2 border-sky-200 flex flex-col gap-8">
                    <div>
                      <h4 className="text-xl font-black text-sky-950 mb-2 flex items-center gap-3">
                        <ShieldAlert className="text-sky-600 animate-pulse" />{" "}
                        أولاً: صلاحيات الوظائف التشغيلية والوصول للمعلومات
                      </h4>
                      <p className="text-xs font-bold text-sky-500 mr-9 block font-black">
                        قم بتعيين الصلاحيات الفرعية والتشغيلية لوظائف الموظف أو
                        الطبيب
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {PERMISSIONS_LIST.map((perm) => {
                        const isChecked = !!(userForm.permissions?.[
                          perm.id as keyof Permissions
                        ] as boolean);
                        return (
                          <div
                            key={perm.id}
                            onClick={() => {
                              const newPerms = {
                                ...userForm.permissions,
                              } as any;
                              newPerms[perm.id] = !newPerms[perm.id];
                              setUserForm({
                                ...userForm,
                                permissions: newPerms,
                              });
                            }}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${isChecked ? "bg-sky-950 border-sky-950 text-white shadow-xl shadow-sky-200" : "bg-white border-sky-100 text-sky-400 hover:border-sky-200"}`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? "bg-white/20 border-white/40 text-white shadow-sm" : "border-sky-200"}`}
                            >
                              {isChecked && <Check size={14} />}
                            </div>
                            <span className={`font-black text-xs ${isChecked ? "text-white" : "text-sky-900"}`}>
                              {perm.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t-2 border-sky-100">
                    <h4 className="text-xl font-black text-sky-900 mb-2 flex items-center gap-3">
                      <LayoutDashboard className="text-sky-400" /> ثانياً:
                      الشاشات والصفحات المتاحة في القائمة الجانبية
                    </h4>
                    <p className="text-xs font-bold text-sky-500 mb-6 mr-9">
                      حدد الصفحات التي تظهر وتتاح للمستخدم في القائمة الجانبية
                      (Sidebar) للبرنامج
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        {
                          id: "dashboard",
                          label: "الرئيسية (Dashboard)",
                          desc: "مؤشرات الأداء العامة وإحصائيات المستشفى",
                        },
                        {
                          id: "registration",
                          label: "تسجيل مريض جدید (Registration)",
                          desc: "تسجيل بيانات المرضى وإضافة حقول مخصصة واستحقاقات",
                        },
                        {
                          id: "patients",
                          label: "قاعدة بيانات المرضى (Patients)",
                          desc: "البحث عن بيانات المرضى، التعديل، والملفات الطبية",
                        },
                        {
                          id: "departments",
                          label: "الأقسام والخدمات (Departments)",
                          desc: "إضافة عيادات، أطباء وتسعير كشوفات وخدمات",
                        },
                        {
                          id: "doctor",
                          label: "شاشة الطبيب والتشخيص (Doctor)",
                          desc: "غرفة الأطباء، الفحص، التقارير الطبية ورفع ملفات الأشعة",
                        },
                        {
                          id: "queue",
                          label: "شاشات شباك الانتظار والانتظار العام (Queue)",
                          desc: "متابعة قائمة الانتظار للمرضى ونقلهم بين العيادات وطباعة الفاتورة",
                        },
                        {
                          id: "reports",
                          label: "التقارير المالية والتحليلات (Reports)",
                          desc: "رؤية مداخيل المستشفى، الأرباح، وفواتير الأقسام",
                        },
                        {
                          id: "settings",
                          label: "الإعدادات العامة للنظام (Settings)",
                          desc: "تغيير الحقول، الطباعة التلقائية وإدارة المستخدمين وتمديد الصلاحيات",
                        },
                        {
                          id: "audit",
                          label: "سجل حركات النظام والأمان (Audit Log)",
                          desc: "مراقبة حركات التسجيل والتعديل والحذف التي يقوم بها الموظفون",
                        },
                      ].map((screen) => {
                        const isVisible = (
                          userForm.permissions?.visibleMainSections || []
                        ).includes(screen.id);
                        return (
                          <div
                            key={screen.id}
                            onClick={() => {
                              const currentSections =
                                userForm.permissions?.visibleMainSections || [];
                              const newSections = currentSections.includes(
                                screen.id,
                              )
                                ? currentSections.filter(
                                    (id) => id !== screen.id,
                                  )
                                : [...currentSections, screen.id];

                              setUserForm({
                                ...userForm,
                                permissions: {
                                  ...userForm.permissions!,
                                  visibleMainSections: newSections,
                                },
                              });
                            }}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${isVisible ? "bg-sky-950 border-sky-950 text-white shadow-xl shadow-sky-200" : "bg-white border-sky-100 text-sky-400 hover:border-sky-200"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isVisible ? "bg-white/20 border-white/40 text-white shadow-sm" : "border-sky-200"}`}
                              >
                                {isVisible && <Check size={14} />}
                              </div>
                              <span className={`font-black text-xs ${isVisible ? "text-white" : "text-sky-950"}`}>
                                {screen.label}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold mr-9 leading-relaxed text-right ${isVisible ? "text-sky-400" : "text-sky-500"}`}>
                              {screen.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t-2 border-sky-100">
                    <h4 className="text-xl font-black text-sky-900 mb-2 flex items-center gap-3">
                      <Stethoscope className="text-sky-400" /> ثالثاً:
                      العيادات والأقسام الطبية المخصصة للمستخدم
                    </h4>
                    <p className="text-xs font-bold text-sky-500 mb-4 mr-9 font-black">
                      حدد العيادات/الأقسام الطبية المخصصة لعمل هذا الحساب (لرؤية
                      تذاكر المرضى الخاصة بقسمه وطبيبه المحددين فقط)
                    </p>

                    <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl mb-4 text-xs font-black text-amber-950 leading-relaxed text-right">
                      💡 تنبيه هام: إذا لم تقم بتحديد أي قسم من القائمة بالأسفل،
                      فسيتم اعتبار أن الحساب له الصلاحية الكاملة "مفتوح
                      تلقائيًا" لمشاهدة جميع الأقسام الطبية بالكامل (Default).
                    </div>

                    {!data.departments || data.departments.length === 0 ? (
                      <div className="p-6 bg-white border-2 border-dashed border-sky-100 rounded-3xl text-center text-sky-400 font-bold text-xs">
                        لا توجد أي أقسام طبية مضافة بعد في شاشة (الأقسام
                        والخدمات). يرجى إضافة عيادة أو قسم أولاً.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.departments.map((dept) => {
                          const isAssigned = (
                            userForm.permissions?.assignedDepartments || []
                          ).includes(dept.id);
                          return (
                            <div
                              key={dept.id}
                              onClick={() => {
                                const currentDepts =
                                  userForm.permissions?.assignedDepartments ||
                                  [];
                                const newDepts = currentDepts.includes(dept.id)
                                  ? currentDepts.filter((id) => id !== dept.id)
                                  : [...currentDepts, dept.id];

                                setUserForm({
                                  ...userForm,
                                  permissions: {
                                    ...userForm.permissions!,
                                    assignedDepartments: newDepts,
                                  },
                                });
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isAssigned ? "bg-sky-950 border-sky-950 text-white shadow-xl shadow-sky-200" : "bg-white border-sky-100 text-sky-400 hover:border-sky-300"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isAssigned ? "bg-white/20 border-white/40 text-white shadow-sm" : "border-sky-200"}`}
                                >
                                  {isAssigned && <Check size={14} />}
                                </div>
                                <div className="text-right">
                                  <span className={`font-black text-xs block ${isAssigned ? "text-white" : "text-sky-950"}`}>
                                    {dept.name}
                                  </span>
                                  <span className={`text-[10px] font-black font-mono mt-0.5 block ${isAssigned ? "text-sky-400" : "text-sky-500"}`}>
                                    {dept.type === "CLINIC"
                                      ? "عيادة"
                                      : dept.type === "LAB"
                                        ? "معمل"
                                        : dept.type === "RADIOLOGY"
                                          ? "مركز أشعة"
                                          : "أخرى"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              </div>

               <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                  <button type="button" onClick={() => setShowUserModal(false)} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                    إلغاء
                  </button>
                  <button type="button" onClick={handleSaveUser} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg">
                    {editingUser ? "حفظ التعديلات" : "إنشاء الحساب الآن"}
                  </button>
               </div>
            </motion.div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] border border-white/20"
            >
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <Tag size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">
                          {editingCategory ? "تعديل تصنيف المريض" : "إضافة تصنيف جديد للفئات والتعاقدات"}
                        </h3>
                        <p className="text-sm text-sky-500 font-bold">إدارة تصنيفات المرضى والفواتير</p>
                     </div>
                  </div>
                  <button onClick={() => setShowCategoryModal(false)} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                     <X size={24} className="text-sky-400" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin text-right">
                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2 text-right">
                    مسمى التصنيف (مثلاً: نقدي، تأمين أليانز، تعاقد شركة كذا)
                  </label>
                  <input
                    type="text"
                    value={categoryForm.label}
                    onChange={(e) => setCategoryForm({ ...categoryForm, label: e.target.value })}
                    placeholder="اكتب المسمى هنا..."
                    className="w-full bg-white border-2 border-sky-100 focus:border-sky-600 rounded-2xl p-5 font-black text-sky-950 outline-none text-right"
                  />
                </div>

                <div className="flex items-center gap-3 px-2">
                   <input 
                      type="checkbox"
                      id="requiresDiscountScheme"
                      checked={categoryForm.requiresDiscountScheme || false}
                      onChange={(e) => setCategoryForm({ ...categoryForm, requiresDiscountScheme: e.target.checked })}
                      className="w-6 h-6 rounded-lg accent-sky-600 cursor-pointer"
                   />
                   <label htmlFor="requiresDiscountScheme" className="text-sm font-black text-sky-900 cursor-pointer select-none">
                      يسري على هذا التصنيف خصومات التعاقدات (مثل التأمين والتعاقدات الخاصة)
                   </label>
                </div>

                <div>
                  <label className="block text-xs font-black text-sky-500 mb-3 px-2 text-right">
                    نسبة خصم ثابتة (اختياري - مثلاً 100 لتصنيف مجاني)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={categoryForm.discountOverridePercent || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, discountOverridePercent: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="اتركه فارغاً إذا كنت ستعتمد الخصومات المتغيرة"
                      className="w-full bg-white border-2 border-sky-100 focus:border-sky-600 rounded-2xl p-5 font-black text-sky-950 outline-none text-right"
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-sky-300">%</span>
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-black text-sky-500 mb-3 px-2 text-right">اختر اللون المميز لهذا التصنيف</label>
                   <div className="flex flex-wrap gap-3">
                      {['slate', 'emerald', 'sky', 'indigo', 'rose', 'amber', 'orange', 'violet', 'blue'].map(color => (
                         <button 
                            key={color}
                            type="button"
                            onClick={() => setCategoryForm({ ...categoryForm, color })}
                            className={`w-12 h-12 rounded-2xl border-4 transition-all ${categoryForm.color === color ? 'border-sky-600 scale-110 shadow-lg' : 'border-sky-50 hover:border-sky-200'}`}
                            style={{ backgroundColor: color === 'slate' ? '#64748b' : color === 'emerald' ? '#10b981' : color === 'sky' ? '#0ea5e9' : color === 'indigo' ? '#6366f1' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : color === 'orange' ? '#f97316' : color === 'violet' ? '#8b5cf6' : color === 'blue' ? '#3b82f6' : '#cbd5e1' }}
                         />
                      ))}
                   </div>
                </div>

                <div className="border-t-2 border-sky-50 pt-6 mt-2">
                   <h4 className="text-lg font-black text-sky-950 mb-4 flex items-center gap-2">
                      <div className="w-2 h-6 bg-sky-600 rounded-full" />
                      خيارات خصم إضافية (نسب متعددة)
                   </h4>
                   <div className="bg-sky-50/50 rounded-3xl p-6 flex flex-col gap-4">
                      <div className="flex gap-3">
                         <div className="flex-[2]">
                            <input 
                               type="text"
                               value={newDiscLabel}
                               onChange={(e) => setNewDiscLabel(e.target.value)}
                               placeholder="مسمى الخصم (مثلاً: خصم خاص)"
                               className="w-full bg-white border-2 border-white focus:border-sky-400 rounded-xl p-3 text-sm font-bold text-sky-950 outline-none"
                            />
                         </div>
                         <div className="flex-1 relative">
                            <input 
                               type="number"
                               value={newDiscValue}
                               onChange={(e) => setNewDiscValue(e.target.value ? parseInt(e.target.value) : "")}
                               placeholder="النسبة"
                               className="w-full bg-white border-2 border-white focus:border-sky-400 rounded-xl p-3 text-sm font-bold text-sky-950 outline-none pl-8"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-sky-300">%</span>
                         </div>
                         <button 
                            type="button"
                            onClick={() => {
                               if (!newDiscLabel || newDiscValue === "") return;
                               const newDisc = {
                                  id: `disc-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                                  label: newDiscLabel,
                                  percentage: newDiscValue
                               };
                               setCategoryForm({
                                  ...categoryForm,
                                  availableDiscounts: [...(categoryForm.availableDiscounts || []), newDisc]
                               });
                               setNewDiscLabel("");
                               setNewDiscValue("");
                            }}
                            className="bg-sky-600 text-white p-3 rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-200"
                         >
                            <Plus size={20} />
                         </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                         {(categoryForm.availableDiscounts || []).map((disc) => (
                            <div key={disc.id} className="bg-white border border-sky-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
                               <span className="text-xs font-black text-sky-900">{disc.label}</span>
                               <span className="bg-sky-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">{disc.percentage}%</span>
                               <button 
                                  onClick={() => setCategoryForm({
                                     ...categoryForm,
                                     availableDiscounts: (categoryForm.availableDiscounts || []).filter(d => d.id !== disc.id)
                                  })}
                                  className="text-rose-400 hover:text-rose-600 transition-colors"
                               >
                                  <X size={14} />
                               </button>
                            </div>
                         ))}
                         {(categoryForm.availableDiscounts || []).length === 0 && (
                            <span className="text-xs font-bold text-sky-300 italic py-2">لا توجد نسب خصم إضافية مضافة</span>
                         )}
                      </div>
                   </div>
                </div>
              </div>

               <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                  <button type="button" onClick={() => setShowCategoryModal(false)} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                    إلغاء
                  </button>
                  <button type="button" onClick={handleSaveCategory} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 text-lg">
                    {editingCategory ? "حفظ التعديلات" : "إضافة التصنيف الآن"}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDirBrowser && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-white/20"
            >
              {/* Modal Header */}
               <div className="relative px-10 py-8 border-b-2 border-sky-50 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <FolderOpen size={28} />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-sky-900">
                          مستعرض المجلدات والأقراص على الخادم
                        </h3>
                        <p className="text-sm text-sky-500 font-bold">تصفح الأقراص وحدد المجلد المناسب للحفظ</p>
                     </div>
                  </div>
                  <button type="button" onClick={() => setShowDirBrowser(false)} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                     <X size={24} className="text-sky-400" />
                  </button>
               </div>

              {/* Breadcrumb Path Display */}
              <div className="px-6 py-4 bg-amber-50/50 border-b-2 border-sky-200 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-mono font-black text-sky-800">
                <span className="text-sky-500 shrink-0">المسار المطلوب:</span>
                <span className="bg-white border border-sky-200 px-3 py-1 rounded-lg shadow-sm text-sky-900">
                  {dirCurrentPath || "/"}
                </span>
              </div>

              {/* Driving Partitions Selector */}
              {windowsDrives.length > 0 && (
                <div className="px-6 py-3 bg-white border-b-2 border-sky-200 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-sky-500 block">الأقراص المتاحة للتخزين (Windows Drives):</span>
                  <div className="flex flex-wrap gap-2">
                    {windowsDrives.map((drive) => {
                      const isActive = dirCurrentPath.toLowerCase().startsWith(drive.toLowerCase());
                      return (
                        <button
                          key={drive}
                          type="button"
                          onClick={() => handleNavigateDir(drive)}
                          className={`text-xs font-black px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 ${
                            isActive
                              ? "bg-sky-100 border-sky-300 text-sky-950 shadow-md active:scale-95"
                              : "bg-white border-sky-200 text-sky-800 hover:border-sky-200 hover:bg-white active:scale-95"
                          }`}
                        >
                          <Database size={14} className={isActive ? "text-amber-400" : "text-sky-600"} />
                          القرص {drive}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Folders List Area */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[16rem]">
                {dirError && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-900 font-bold text-xs">
                    <AlertCircle className="text-red-600 shrink-0" size={18} />
                    <span>ملاحظة: {dirError}</span>
                  </div>
                )}
                {dirLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-sky-600">جاري تحميل المجلدات...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Parent directory navigation */}
                    {dirCurrentPath && (
                      <button
                        type="button"
                        onClick={() => handleNavigateDir(dirParentPath)}
                        className="flex items-center gap-3 p-4 bg-white hover:bg-sky-50 rounded-2xl border-2 border-sky-200 font-bold text-sky-705 transition-all text-right group animate-fade-in"
                      >
                        <ArrowUp
                          size={18}
                          className="text-sky-600 transition-transform group-hover:-translate-y-1"
                        />
                        <span className="text-sm">.. (المجلد الأعلى أو تغيير القرص)</span>
                      </button>
                    )}

                    {/* Subfolders list */}
                    {dirList.length === 0 ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                        <FolderOpen size={48} className="text-sky-400" />
                        <p className="text-sm font-bold text-sky-500">لا توجد مجلدات فرعية في هذا المسار</p>
                      </div>
                    ) : (
                      dirList.map((folderName, idx) => {
                        const subPath = dirCurrentPath
                          ? dirCurrentPath.includes("\\")
                            ? `${dirCurrentPath.replace(/\\$/, "")}\\${folderName}`
                            : `${dirCurrentPath.replace(/\/$/, "")}/${folderName}`
                          : folderName;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleNavigateDir(subPath)}
                            className="flex items-center justify-between p-4 bg-white hover:bg-amber-50 border-2 border-sky-200 hover:border-amber-300 rounded-2xl font-black text-sky-900 hover:text-amber-950 transition-all text-right group"
                          >
                            <div className="flex items-center gap-3">
                              <Folder
                                size={18}
                                className="text-amber-500 group-hover:scale-110 transition-transform"
                              />
                              <span className="text-sm">{folderName}</span>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-sky-400 transition-transform group-hover:translate-x-1"
                            />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Create New Folder sub-section */}
              <div className="p-6 bg-white border-t-2 border-sky-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 font-black">
                  <div className="flex-grow">
                    <label className="block text-xs font-black text-sky-500 mb-2 px-1">
                      إنشاء مجلد فرعي جديد داخل المسار الحالي
                    </label>
                    <input
                      type="text"
                      value={dirNewFolderName}
                      onChange={(e) => setDirNewFolderName(e.target.value)}
                      placeholder="مثال: Medical_Records"
                      className="w-full bg-white border-2 border-sky-200 rounded-2xl p-4 font-bold text-sky-950 text-sm outline-none focus:ring-4 focus:ring-amber-100 text-right font-black"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewFolder}
                    className="px-6 py-4 bg-white border-2 border-sky-600 hover:bg-amber-50 text-sky-950 text-sm rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
                  >
                    <FolderPlus size={18} className="text-amber-600" />
                    إنشاء مجلد
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t-2 border-sky-200 bg-white flex justify-between gap-4 font-black">
                <button
                  type="button"
                  onClick={() => setShowDirBrowser(false)}
                  className="px-6 py-4 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-2xl font-black text-sm transition-all"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  onClick={handleSelectFolder}
                  className="px-8 py-4 bg-sky-100 hover:bg-amber-600 text-sky-900 rounded-2xl font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Check size={18} />
                  اعتماد واختيار هذا المجلد
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          deleteConfirm?.onDelete();
          setDeleteConfirm(null);
          toast.success("تم الحذف بنجاح");
        }}
        title={`حذف ${deleteConfirm?.name}`}
        message={deleteConfirm?.message || ""}
      />
    </motion.div>
  );
};
