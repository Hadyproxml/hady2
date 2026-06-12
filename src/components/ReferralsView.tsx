import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Search, Building2, User as UserIcon, Clock, 
  TrendingUp, ClipboardList, Filter, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { format, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

import { HospitalData, User, Referral } from '../types';

interface ReferralsViewProps {
  data: HospitalData;
  saveData: (newData: HospitalData) => void;
  currentUser: User;
  onCompleteReferral?: (referral: Referral) => void;
}

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

export function ReferralsView({ data, saveData, currentUser, onCompleteReferral }: ReferralsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'outbound' | 'inbound'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'NEW' | 'COMPLETED' | 'CANCELLED'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Referral['priority']>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  const handleDeleteReferral = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا التحويل بشكل نهائي؟')) return;
    
    // Also consider removing the associated pending queue visit? That might be complex since we'd have to find it by referral id or invoice number.
    // For simplicity, we just remove the referral record.
    const newSettings = { ...data.settings, referrals: (data.settings?.referrals || []).filter(r => r.id !== id) };
    saveData({ ...data, settings: newSettings });
    if (selectedReferral?.id === id) setSelectedReferral(null);
  };

  const referralsList = useMemo(() => {
    return data.settings?.referrals || [];
  }, [data.settings?.referrals]);

  // Filters calculation
  const filteredReferrals = useMemo(() => {
    let list = [...referralsList];
    const userRole = (currentUser.role || 'STAFF').toUpperCase();
    const isAdmin = ['ADMIN', 'DEVELOPER'].includes(userRole);
    const assignedDepts = currentUser.permissions?.assignedDepartments || [];

    // Global filtering based on assigned departments (the "Strict" part)
    // If not admin and has assigned departments, filter the primary list
    if (!isAdmin && assignedDepts.length > 0) {
      list = list.filter(r => 
        r.referringDoctorId === currentUser.id || // Show what I sent
        assignedDepts.includes(r.referredToId) || // Show what was sent to my departments
        (r.referredToType === 'DOCTOR' && r.referredToId === currentUser.id) // Show what was sent to me specifically
      );
    }

    // Direction filtering
    if (directionFilter === 'outbound') {
      list = list.filter(r => r.referringDoctorId === currentUser.id);
    } else if (directionFilter === 'inbound') {
      list = list.filter(r => 
        r.referredToId === currentUser.id || 
        assignedDepts.includes(r.referredToId) ||
        (r.referredToType === 'DOCTOR' && r.referredToId === currentUser.id)
      );
    }

    // Status filtering
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    // Priority filtering
    if (priorityFilter !== 'all') {
      list = list.filter(r => r.priority === priorityFilter);
    }

    // Search query
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.id.toLowerCase().includes(query) || 
        r.patientName.toLowerCase().includes(query) ||
        r.referringDoctorName.toLowerCase().includes(query) ||
        r.referredToName.toLowerCase().includes(query) ||
        (r.reason || '').toLowerCase().includes(query) ||
        (r.clinicalNotes || '').toLowerCase().includes(query)
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [referralsList, directionFilter, statusFilter, searchTerm, currentUser]);

  // Stats calculation
  const totalOutbound = useMemo(() => {
    return referralsList.filter(r => r.referringDoctorId === currentUser.id).length;
  }, [referralsList, currentUser.id]);

  const totalInbound = useMemo(() => {
    const assignedDepts = currentUser.permissions?.assignedDepartments || [];
    return referralsList.filter(r => 
      r.referredToId === currentUser.id || 
      assignedDepts.includes(r.referredToId) ||
      (r.referredToType === 'DOCTOR' && r.referredToId === currentUser.id)
    ).length;
  }, [referralsList, currentUser]);

  const totalNew = useMemo(() => {
    return filteredReferrals.filter(r => r.status === 'NEW').length;
  }, [filteredReferrals]);

  const totalCompleted = useMemo(() => {
    return filteredReferrals.filter(r => r.status === 'COMPLETED').length;
  }, [filteredReferrals]);

  // Analytics for Inter-department distribution
  const chartData = useMemo(() => {
    // Group referrals by target entity name
    const countsMap: { [key: string]: number } = {};
    referralsList.forEach(r => {
      countsMap[r.referredToName] = (countsMap[r.referredToName] || 0) + 1;
    });

    return Object.keys(countsMap).map(key => ({
      name: key,
      value: countsMap[key]
    })).slice(0, 5); // top 5 targets
  }, [referralsList]);

  const stats = [
    { label: 'تحويلات صادرة من طرفي', value: totalOutbound, icon: ArrowUpRight, color: 'text-sky-600 bg-sky-50/40 border-sky-100' },
    { label: 'تحويلات واردة إلي / لقسمي', value: totalInbound, icon: ArrowDownRight, color: 'text-sky-700 bg-white border-sky-200/60' },
    { label: 'تحويلات نشطة (جديد)', value: totalNew, icon: AlertCircle, color: 'text-sky-600 bg-sky-50 border-sky-100 animate-pulse' },
    { label: 'تحويلات تمت بنجاح', value: totalCompleted, icon: CheckCircle2, color: 'text-sky-800 bg-emerald-50 border-emerald-100' },
  ];

  const getPriorityLabel = (p: Referral['priority']) => {
    switch (p) {
      case 'EMERGENCY': return 'حالة طوارئ';
      case 'URGENT': return 'عاجل جداً';
      default: return 'روتينية';
    }
  };

  const getPriorityColor = (p: Referral['priority']) => {
    switch (p) {
      case 'EMERGENCY': return 'bg-red-500 text-white';
      case 'URGENT': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-sky-100 text-sky-700 border-sky-200';
    }
  };

  const getTypeLabel = (t: Referral['referralType']) => {
    switch (t) {
      case 'CONSULTATION': return 'استشارة طبية';
      case 'PROCEDURE': return 'إجراء طبي / جراحي';
      case 'DIAGNOSTIC' as any: return 'فحص تشخيصي'; // Fallback for previous enum if any
      case 'TRANSFER': return 'تحويل كلي للملف';
      case 'FOLLOWUP': return 'جلسة متابعة';
      default: return 'طلب خدمة';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-6 md:p-10 flex flex-col gap-8 max-w-7xl mx-auto"
      style={{ direction: 'rtl' }}
    >
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-sky-900 tracking-tight flex items-center gap-3">
            نظام التحويلات والمسارات الطبية
            {!['ADMIN', 'DEVELOPER'].includes((currentUser.role || '').toUpperCase()) && (currentUser.permissions?.assignedDepartments || []).length > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1 font-black animate-pulse">
                <AlertCircle size={10} /> عرض مخصص لأقسامك فقط
              </span>
            )}
          </h2>
          <p className="text-sm font-bold text-sky-500 mt-1">تتبع وإحصائيات تحويلات المرضى اللحظية بين العيادات المتخصصة وأقسام الفحص المساعد.</p>
        </div>
      </div>

      {/* Numerical Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className={`p-6 bg-white border-2 rounded-[2rem] flex items-center justify-between shadow-sm transition-all hover:scale-[1.02] ${s.color}`}>
              <div className="flex flex-col">
                <span className="text-xs font-black opacity-80">{s.label}</span>
                <span className="text-3xl font-black mt-2 tracking-tight tabular-nums">{s.value}</span>
              </div>
              <div className="p-4 bg-white/80 rounded-2xl border border-inherit shadow-inner">
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main interactive and analytical workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Analytics/Visual Distribution */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-sky-200 shadow-sm flex flex-col gap-6">
            <div>
              <h4 className="font-black text-sky-900 text-lg">تحليل تدفق الإحالات</h4>
              <p className="text-xs text-sky-500 font-bold mt-1">توزيع الإحالات الطبية على الأقسام والعيادات الأكثر استقبالاً.</p>
            </div>
            
            <div className="h-[240px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={75} 
                      paddingAngle={5}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#94a3b8'][index % 5]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', direction: 'rtl' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-sky-350 bg-white rounded-2xl p-6 text-center">
                  <ClipboardList size={40} className="mb-2 opacity-55" />
                  <p className="text-xs font-bold">لا تتوفر إحصائيات كافية للرسم البياني</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {chartData.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-sky-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#94a3b8'][i % 5] }} />
                    <span className="text-[11px] font-black text-sky-700 truncate max-w-[150px]">{s.name}</span>
                  </div>
                  <span className="text-xs font-black text-sky-900 tabular-nums">{s.value} تحويل</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 columns: Filterable records list */}
        <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-8 rounded-[2.5rem] border border-sky-200 shadow-sm">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-sky-200 pb-6">
            <div>
              <h4 className="font-black text-sky-900 text-lg">سجل حركة التحويلات</h4>
              <p className="text-xs text-sky-500 font-bold mt-1">تصفح مسار الحالات وتحقق من اكتمال الإجراء ومراجعة التقارير.</p>
            </div>
            
            {/* Direct filters */}
            <div className="flex flex-wrap gap-2">
              <select 
                value={directionFilter} 
                onChange={e => setDirectionFilter(e.target.value as any)}
                className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs font-black text-sky-800 outline-none hover:border-sky-500 transition-all shadow-sm"
              >
                <option value="all">كل الاتجاهات</option>
                <option value="outbound">الصادرة من طرفي</option>
                <option value="inbound">الواردة إلي / لقسمي</option>
              </select>

              <select 
                value={priorityFilter} 
                onChange={e => setPriorityFilter(e.target.value as any)}
                className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs font-black text-sky-800 outline-none hover:border-sky-500 transition-all shadow-sm"
              >
                <option value="all">كل الأولويات</option>
                <option value="NORMAL">روتينية</option>
                <option value="URGENT">عاجل</option>
                <option value="EMERGENCY">طوارئ 🚨</option>
              </select>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs font-black text-sky-800 outline-none hover:border-sky-500 transition-all shadow-sm"
              >
                <option value="all">كل الحالات (نشط/ملغي)</option>
                <option value="NEW">بانتظار الخدمة (جديد)</option>
                <option value="COMPLETED">مكتملة الفحص</option>
                <option value="CANCELLED">تم الإلغاء</option>
              </select>
            </div>
          </div>

          {/* Search bar inside the list container */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-transparent focus:border-sky-500 rounded-2xl pr-12 pl-5 py-3 font-bold text-sky-900 outline-none transition-all placeholder-sky-400 text-sm"
              placeholder="البحث برقم التحويل، اسم المريض، الطبيب المحيل، أو سبب الإحالة..."
            />
          </div>

          {/* Records grid/list */}
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {filteredReferrals.length > 0 ? (
              Object.entries(
                filteredReferrals.reduce((groups, r) => {
                  const dateKey = safeFormat(r.createdAt, 'yyyy/MM/dd');
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(r);
                  return groups;
                }, {} as Record<string, typeof filteredReferrals>)
              ).map(([date, refs]) => {
                const groupRefs = refs as typeof filteredReferrals;
                return (
                <div key={date} className="flex flex-col gap-4 mb-2">
                  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm py-2">
                    <h5 className="font-black text-sky-900 text-sm flex items-center gap-2">
                      <Clock size={16} className="text-sky-500" />
                      تحويلات يوم: <span className="text-sky-600">{date}</span>
                      <span className="text-[10px] bg-sky-100 text-sky-500 px-2 py-0.5 rounded-full">{groupRefs.length}</span>
                    </h5>
                  </div>
                  {groupRefs.map((r) => {
                    const isUrgent = r.priority === 'URGENT' || r.priority === 'EMERGENCY';
                    
                    return (
                      <motion.div 
                        key={r.id} 
                        onClick={() => setSelectedReferral(r)}
                        className={`group p-6 rounded-3xl border-2 transition-all shadow-sm flex flex-col gap-4 relative overflow-hidden cursor-pointer ${
                          isUrgent ? 'border-orange-200 bg-orange-50/30' : 'border-sky-100 bg-white hover:border-sky-950'
                        }`}
                      >
                        
                        {/* Direction marker tag */}
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                          r.priority === 'EMERGENCY' ? 'bg-red-500' : 
                          r.priority === 'URGENT' ? 'bg-orange-500' : 'bg-sky-500'
                        }`} />
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-black text-xl text-sky-950">{r.patientName}</span>
                              <span className="font-mono text-xs bg-white px-3 py-1 rounded-full text-sky-600 font-black border border-sky-100 shadow-sm">{r.id}</span>
                              <span className="text-[10px] font-black bg-sky-950 text-white px-3 py-1 rounded-full uppercase tracking-widest">
                                {getTypeLabel(r.referralType)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 flex-wrap">
                              <span className="text-[10px] text-sky-500 font-bold flex items-center gap-2">
                                <Clock size={12} /> {safeFormat(r.createdAt, 'hh:mm a')}
                              </span>
                              <span className="text-[10px] bg-brand-50 text-brand-700 px-3 py-1 rounded-full border border-brand-100 font-black shadow-sm flex items-center gap-1.5">
                                <UserIcon size={10} /> محول من: د. {r.referringDoctorName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                              {currentUser.permissions?.patient_referral_delete && (
                                <button 
                                  onClick={(e) => handleDeleteReferral(e, r.id)}
                                  className="px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 bg-red-50 text-red-700 border-red-100 hover:bg-red-600 hover:text-white transition-all"
                                  title="حذف التحويل"
                                >
                                  حذف
                                </button>
                              )}
                              <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${
                                r.status === 'NEW' ? 'bg-white text-sky-700 border-sky-200 animate-pulse' : 
                                r.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' :
                                'bg-emerald-50 text-emerald-900 border-emerald-100'
                              }`}>
                                {r.status === 'NEW' ? 'قيد الانتظار' : r.status === 'CANCELLED' ? 'تم إلغاء التحويل' : 'تم الاكتمال بنجاح'}
                              </span>
                            </div>
                            <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 ${getPriorityColor(r.priority)}`}>
                              {getPriorityLabel(r.priority)}
                            </span>
                          </div>
                        </div>

                        {/* Routing info block with nice flow visualizer */}
                        <div className="flex items-center gap-6 bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-sky-100/50 flex-wrap sm:flex-nowrap group-hover:bg-white transition-all">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 border border-sky-100 shadow-inner group-hover:bg-sky-950 group-hover:text-white transition-all"><UserIcon size={18} /></div>
                            <div className="flex flex-col truncate">
                              <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">الطبيب المحيل</span>
                              <span className="text-xs font-black text-sky-900 truncate">{r.referringDoctorName}</span>
                            </div>
                          </div>

                          <div className="text-sky-300 flex-shrink-0 flex items-center justify-center animate-pulse"><ArrowRightLeft size={20} /></div>

                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0 border border-sky-200 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Building2 size={18} /></div>
                            <div className="flex flex-col truncate">
                              <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">الجهة المستهدفة</span>
                              <span className="text-xs font-black text-sky-900 truncate">{r.referredToName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Cause & details preview */}
                        <div className="text-xs bg-white p-5 rounded-2xl border border-sky-100 flex flex-col gap-2 text-sky-800 shadow-inner group-hover:border-sky-200 transition-all">
                          <span className="font-black text-[10px] text-sky-500 uppercase tracking-widest italic flex items-center gap-2">
                            <ClipboardList size={12} /> ملخص الطلب الطبي:
                          </span>
                          <p className="font-bold leading-relaxed line-clamp-2 text-sky-700">{r.reason}</p>
                        </div>

                        {/* Footer queue meta reference if pending */}
                        {r.status === 'NEW' && r.queueNumber !== undefined && (
                          <div className="flex items-center justify-between text-[11px] font-bold text-sky-600 pt-2 border-t border-sky-50/50">
                            <span className="flex items-center gap-2 font-black"><Clock size={14} className="text-sky-500" /> رقم دور الانتظار للمريض:</span>
                            <div className="bg-sky-950 text-white px-4 py-1 rounded-full font-black text-xs shadow-lg">#{r.queueNumber}</div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })
            ) : (
              <div className="p-20 text-center bg-sky-50/50 rounded-[4rem] border-4 border-dashed border-sky-100">
                <ArrowRightLeft className="mx-auto text-sky-200 mb-6" size={64} />
                <h6 className="text-2xl font-black text-sky-900 mb-2">لا توجد تحويلات حالياً</h6>
                <p className="text-sm text-sky-500 font-bold max-w-md mx-auto">سيتم عرض جميع التحويلات الصادرة والواردة هنا عند بدء استخدام خاصية الإحالة بين الأقسام.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Referral Detail Modal */}
      <AnimatePresence>
        {selectedReferral && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-sky-900/60 backdrop-blur-sm" onClick={() => setSelectedReferral(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl relative z-10 border border-sky-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 border-b-2 border-sky-50 flex justify-between items-center bg-sky-50/30">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${getPriorityColor(selectedReferral.priority)}`}>
                    <ClipboardList size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-sky-950">تفاصيل التحويل الطبي</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-black text-sky-500 uppercase tracking-widest leading-none">رقم المرجع: {selectedReferral.id}</p>
                      <span className="w-1 h-1 rounded-full bg-sky-300" />
                      <p className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">محول من: د. {selectedReferral.referringDoctorName}</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedReferral(null)}
                  className="p-3 bg-white text-sky-400 hover:text-sky-900 rounded-2xl transition-all border border-sky-100 shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar flex flex-col gap-10">
                {/* Patient and Routing Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ direction: 'rtl' }}>
                  <div className="bg-sky-50 p-8 rounded-[2rem] border-2 border-white shadow-sm text-right">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 block italic">بيانات الحالة</span>
                    <p className="text-2xl font-black text-sky-950">{selectedReferral.patientName}</p>
                    <p className="text-xs font-bold text-sky-500 mt-2">ID: {selectedReferral.patientId.slice(-12)}</p>
                    <div className="flex gap-2 mt-4 justify-start">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getPriorityColor(selectedReferral.priority)}`}>
                        {getPriorityLabel(selectedReferral.priority)}
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-white text-sky-900 border border-sky-100">
                        {getTypeLabel(selectedReferral.referralType)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-sky-950 p-8 rounded-[2rem] text-white flex flex-col justify-between shadow-xl text-right">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 block italic">مسار التحويل</span>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-sky-900 flex items-center justify-center text-sky-300"><UserIcon size={16} /></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">من</span>
                          <span className="text-sm font-black text-white">{selectedReferral.referringDoctorName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-sky-900 flex items-center justify-center text-sky-300"><Building2 size={16} /></div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">إلى</span>
                          <span className="text-sm font-black text-white">{selectedReferral.referredToName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reason, Clinical Notes, Instructions */}
                <div className="flex flex-col gap-8 text-right" style={{ direction: 'rtl' }}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-[10px]">1</div>
                      <h4 className="font-black text-sky-950 uppercase tracking-widest text-xs italic">سبب التحويل الطبي (الشكوى / التشخيص الأولي)</h4>
                    </div>
                    <p className="bg-sky-50 p-8 rounded-[1.5rem] text-sm font-black text-sky-800 leading-relaxed border-2 border-white shadow-inner">
                      {selectedReferral.reason || 'لا يوجد وصف محدد'}
                    </p>
                  </div>

                  {selectedReferral.clinicalNotes && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-[10px]">2</div>
                        <h4 className="font-black text-sky-950 uppercase tracking-widest text-xs italic">الملاحظات السريرية والتاريخ المرضي</h4>
                      </div>
                      <p className="bg-sky-50 p-8 rounded-[1.5rem] text-sm font-black text-sky-800 leading-relaxed border-2 border-white shadow-inner whitespace-pre-wrap">
                        {selectedReferral.clinicalNotes}
                      </p>
                    </div>
                  )}

                  {selectedReferral.instructions && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-black text-[10px]">3</div>
                        <h4 className="font-black text-brand-950 uppercase tracking-widest text-xs italic">تعليمات خاصة للطبيب / الفني المستقبل</h4>
                      </div>
                      <p className="bg-brand-50 p-8 rounded-[1.5rem] text-sm font-black text-brand-950 leading-relaxed border-2 border-brand-100 shadow-inner italic">
                        {selectedReferral.instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t-2 border-sky-50 flex justify-end items-center gap-4 bg-sky-50/50" style={{ direction: 'rtl' }}>
                <span className="text-[10px] font-black text-sky-400 italic flex-1">محول من: {selectedReferral.referringDoctorName} في {safeFormat(selectedReferral.createdAt, 'PPpp')}</span>
                
                {selectedReferral.status === 'NEW' && onCompleteReferral && (
                  <button 
                    onClick={() => {
                      onCompleteReferral(selectedReferral);
                      setSelectedReferral(null);
                    }}
                    className="px-10 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-amber-600 transition-all shadow-xl flex items-center gap-2"
                  >
                    <ArrowRightLeft size={18} />
                    استكمال وتسعير التحويل
                  </button>
                )}

                <button 
                  onClick={() => setSelectedReferral(null)}
                  className="px-10 py-4 bg-sky-950 text-white rounded-2xl font-black text-sm hover:bg-sky-800 transition-all shadow-xl"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
