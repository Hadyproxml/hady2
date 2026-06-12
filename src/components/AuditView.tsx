import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Search, Calendar, User, 
  Settings, UserPlus, Trash2, Edit3, Filter,
  ArrowRight, ArrowLeft, History, Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AuditEntry, AuditActionType } from '../types';

const safeFormat = (date: any, formatStr: string) => {
  try {
    if (!date) return '--/--/----';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--/--/----';
    return format(d, formatStr, { locale: ar });
  } catch (e) {
    return '--/--/----';
  }
};

const ACTION_LABELS: Record<AuditActionType, { label: string, color: string, icon: any }> = {
  CREATE_PATIENT: { label: 'تسجيل مريض جديد', color: 'text-sky-600 bg-sky-50', icon: UserPlus },
  UPDATE_PATIENT: { label: 'تعديل بيانات مريض', color: 'text-sky-600 bg-sky-50', icon: Edit3 },
  DELETE_PATIENT: { label: 'حذف مريض', color: 'text-red-600 bg-red-50', icon: Trash2 },
  UPDATE_SERVICE: { label: 'تعديل خدمات طبية', color: 'text-amber-600 bg-amber-50', icon: Settings },
  SYSTEM_LOGIN: { label: 'دخول للنظام', color: 'text-sky-700 bg-white', icon: User },
  SYSTEM_SETTINGS_CHANGE: { label: 'تعديل إعدادات النظام', color: 'text-sky-600 bg-sky-50', icon: Settings },
  CREATE_DEPARTMENT: { label: 'إنشاء قسم جديد', color: 'text-sky-600 bg-sky-50', icon: Layers },
  UPDATE_DEPARTMENT: { label: 'تعديل بيانات القسم', color: 'text-sky-600 bg-sky-50', icon: Edit3 },
  DELETE_DEPARTMENT: { label: 'حذف قسم', color: 'text-rose-600 bg-rose-50', icon: Trash2 },
  DELETE_SERVICE: { label: 'حذف خدمة طبية', color: 'text-red-600 bg-red-50', icon: Trash2 },
};

const FIELD_LABELS: Record<string, string> = {
  'name': 'الاسم',
  'phone': 'رقم الهاتف',
  'age': 'العمر',
  'gender': 'الجنس',
  'address': 'العنوان',
  'price': 'السعر',
  'duration': 'المدة',
  'departmentId': 'رقم القسم',
  'role': 'الدور',
  'username': 'اسم المستخدم',
  'password': 'كلمة المرور',
  'totalPrice': 'السعر الإجمالي',
  'status': 'الحالة',
  'notes': 'ملاحظات',
  'isMain': 'قسم رئيسي',
  'assignedDepartments': 'الأقسام المرتبطة',
  'visibleMainSections': 'الأقسام الظاهرة',
  'permissions': 'الصلاحيات'
};

const DataDiffDisplay: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return <span className="text-sky-500 font-bold text-[10px]">لا توجد بيانات</span>;
  
  if (typeof data !== 'object') return <span className="text-sky-700 font-mono text-[10px]">{String(data)}</span>;

  return (
    <div className="flex flex-col gap-1.5">
      {Object.entries(data).map(([key, value]) => {
        // Skip metadata IDs and internal fields
        if (['id', 'timestamp', 'userId', 'targetId'].includes(key)) return null;
        
        let displayValue = '';
        if (value === null || value === undefined) displayValue = 'فارغ';
        else if (typeof value === 'boolean') displayValue = value ? 'نعم' : 'لا';
        else if (Array.isArray(value)) displayValue = `[${value.length} عناصر]`;
        else if (typeof value === 'object') displayValue = '{...}';
        else displayValue = String(value);

        return (
          <div key={key} className="flex justify-between items-center bg-white/50 px-3 py-1.5 rounded-lg border border-sky-200/50">
            <span className="text-[10px] font-black text-sky-500">{FIELD_LABELS[key] || key}:</span>
            <span className="text-[10px] font-bold text-sky-800 truncate max-w-[150px]">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
};

const AuditLogItem: React.FC<{ log: AuditEntry }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const actionInfo = ACTION_LABELS[log.action];
  const Icon = actionInfo.icon;

  return (
    <div 
      className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 transition-all group ${isExpanded ? 'border-sky-600 shadow-xl' : 'border-sky-200 shadow-md hover:border-sky-200'}`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${actionInfo.color}`}>
            <Icon size={24} />
          </div>
          <div>
            <h4 className="font-black text-sky-950 text-lg">{actionInfo.label}</h4>
            <p className="text-xs font-black text-sky-500 uppercase tracking-widest mt-1">
              {safeFormat(log.timestamp, 'EEEE, d MMMM yyyy HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-2">
           <div className="bg-white text-sky-900 py-2 px-6 rounded-full text-xs font-black flex items-center gap-2">
              بواسطة: {log.userName}
           </div>
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className={`text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 transition-all ${isExpanded ? 'text-sky-700' : 'text-sky-500 group-hover:text-sky-900'}`}
           >
             {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والبيانات'}
             <History size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
           </button>
        </div>
      </div>

      <div className="mt-6 p-6 bg-white rounded-[1.5rem] border-2 border-sky-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <p className="font-black text-sky-900">المستهدف: <span className="text-sky-800">{log.targetName}</span></p>
         {log.details && <p className="text-sm font-bold text-sky-700 italic">"{log.details}"</p>}
      </div>

      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex items-center gap-4 text-xs font-black text-sky-500 uppercase tracking-widest px-2">
              <div className="h-px flex-1 bg-sky-100" />
              تتبع التغييرات
              <div className="h-px flex-1 bg-sky-100" />
            </div>

            {(log.oldData || log.newData) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black text-red-600 uppercase pr-3 flex items-center gap-2"><ArrowLeft size={10} /> البيانات القديمة</p>
                  <div className="bg-red-50/50 p-4 rounded-2xl border-2 border-red-100 flex flex-col gap-2 overflow-hidden">
                    <DataDiffDisplay data={log.oldData} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black text-sky-600 uppercase pr-3 flex items-center gap-2"><ArrowRight size={10} /> البيانات الجديدة</p>
                  <div className="bg-sky-50/50 p-4 rounded-2xl border-2 border-sky-100 flex flex-col gap-2 overflow-hidden">
                    <DataDiffDisplay data={log.newData} />
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white p-3 rounded-xl border border-sky-200 text-[9px] font-mono text-sky-500 flex justify-between">
              <span>ID السجل: {log.id}</span>
              <span>ID المستهدف: {log.targetId}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const AuditView = memo(() => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setLogs(data.reverse()); // Show newest first
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.includes(searchTerm) || 
      log.targetName.includes(searchTerm) || 
      (log.details || '').includes(searchTerm);
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    
    const matchesDate = !dateFilter || safeFormat(log.timestamp, 'yyyy-MM-dd') === dateFilter;

    return matchesSearch && matchesAction && matchesDate;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border-2 border-sky-200 shadow-xl">
         <div>
            <h2 className="text-3xl font-black text-sky-950 flex items-center gap-4">
               <ShieldCheck size={36} className="text-sky-700" /> سجل التدقيق والأمان
            </h2>
            <p className="text-sky-600 font-bold mt-2">تتبع كافة العمليات الحساسة في النظام لضمان النزاهة</p>
         </div>
         <button onClick={fetchLogs} className="bg-sky-100 text-sky-900 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-white transition-all flex items-center gap-3 active:scale-95">
            <History size={20} /> تحديث السجل
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white p-8 rounded-[2rem] border-2 border-sky-200 shadow-lg sticky top-8">
               <h3 className="font-black text-sky-950 mb-6 border-b-4 border-sky-200 pb-4 flex items-center gap-2">
                  <Filter size={18} /> تصفية النتائج
               </h3>
               
               <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-black text-sky-500 uppercase pr-2">البحث</label>
                     <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} />
                        <input 
                           type="text" 
                           placeholder="ابحث بالاسم..."
                           className="w-full bg-white border-2 border-sky-200 rounded-2xl px-12 py-4 font-bold outline-none focus:border-sky-600 transition-all"
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                        />
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-black text-sky-500 uppercase pr-2">التاريخ</label>
                     <input 
                        type="date" 
                        className="w-full bg-white border-2 border-sky-200 rounded-2xl p-4 font-black outline-none focus:border-sky-600 transition-all"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                     />
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-black text-sky-500 uppercase pr-2">نوع العملية</label>
                     <select 
                        className="w-full bg-white border-2 border-sky-200 rounded-2xl p-4 font-black outline-none appearance-none focus:border-sky-600 transition-all"
                        value={filterAction}
                        onChange={e => setFilterAction(e.target.value)}
                     >
                        <option value="all">الكل</option>
                        {Object.entries(ACTION_LABELS).map(([key, val]) => (
                           <option key={key} value={key}>{val.label}</option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-3 flex flex-col gap-4">
            {loading ? (
               <div className="bg-white p-20 rounded-[3rem] border-2 border-sky-200 text-center animate-pulse">
                  <p className="text-sky-500 font-black text-xl">جاري تحميل سجل التدقيق...</p>
               </div>
            ) : filteredLogs.length === 0 ? (
               <div className="bg-white p-20 rounded-[3rem] border-2 border-sky-200 text-center">
                  <Search size={64} className="mx-auto text-sky-300 mb-6" />
                  <p className="text-sky-500 font-black text-xl">لا توجد عمليات تطابق البحث</p>
               </div>
            ) : (
               filteredLogs.map(log => (
                 <AuditLogItem key={log.id} log={log} />
               ))
            )}
         </div>
      </div>
    </motion.div>
  );
});
