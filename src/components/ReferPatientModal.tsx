import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowRightLeft, 
  Stethoscope, 
  FlaskConical, 
  Microscope, 
  Activity, 
  User as UserIcon, 
  Check, 
  Search, 
  FileText,
  Tag,
  AlertCircle,
  Clock,
  MessageSquare,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

import { HospitalData, Visit, User, ServiceLog, Referral, SystemSettings } from '../types';
import { logAudit } from '../lib/audit';

interface ReferPatientModalProps {
  visit: Visit;
  data: HospitalData;
  saveData: (newData: HospitalData) => void;
  currentUser: User;
  onClose: () => void;
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

type ReferralStep = 'DESTINATION' | 'DETAILS' | 'CONFIRMATION';

export function ReferPatientModal({ visit, data, saveData, currentUser, onClose }: ReferPatientModalProps) {
  const patient = data.patients?.find(p => p.id === visit.patientId);
  const [step, setStep] = useState<ReferralStep>('DESTINATION');
  const [patientName, setPatientName] = useState(patient?.name || '');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  
  // Customization fields
  const [priority, setPriority] = useState<Referral['priority']>('NORMAL');
  const [referralType, setReferralType] = useState<Referral['referralType']>('CONSULTATION');
  const [referralReason, setReferralReason] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [instructions, setInstructions] = useState('');

  // Search states
  const [deptSearch, setDeptSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  const targetDept = data.departments?.find(d => d.id === selectedDeptId);

  const getDeptColorClasses = (type: string, isSelected: boolean) => {
    if (isSelected) {
      switch (type) {
        case 'CLINIC': return 'bg-sky-50 border-sky-500 text-sky-950 ring-4 ring-sky-500/10';
        case 'LAB': return 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-4 ring-emerald-500/10';
        case 'RADIOLOGY': return 'bg-amber-50 border-amber-500 text-amber-950 ring-4 ring-amber-500/10';
        default: return 'bg-sky-50 border-sky-500 text-sky-950 ring-4 ring-sky-500/10';
      }
    }
    return 'bg-white border-sky-100 hover:border-sky-300 text-sky-600 hover:bg-sky-50';
  };

  const getDeptIcon = (type: string, isSelected: boolean) => {
    const size = 20;
    switch (type) {
      case 'CLINIC':
        return <Stethoscope size={size} className={isSelected ? 'text-sky-600' : 'text-sky-400'} />;
      case 'LAB':
        return <FlaskConical size={size} className={isSelected ? 'text-emerald-600' : 'text-sky-400'} />;
      case 'RADIOLOGY':
        return <Microscope size={size} className={isSelected ? 'text-amber-600' : 'text-sky-400'} />;
      default:
        return <Activity size={size} className={isSelected ? 'text-sky-700' : 'text-sky-400'} />;
    }
  };

  const filteredDepts = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return data.departments || [];
    return (data.departments || []).filter(d => d.name.toLowerCase().includes(q));
  }, [data.departments, deptSearch]);

  const clinicDoctors = useMemo(() => {
    if (!selectedDeptId || !targetDept || targetDept.type !== 'CLINIC') return [];
    return (data.users || []).filter(u => 
      u.role === 'DOCTOR' && 
      (u.permissions?.assignedDepartments || []).includes(selectedDeptId)
    );
  }, [data.users, selectedDeptId, targetDept]);

  const availableServices = useMemo(() => {
    if (!selectedDeptId) return [];
    const q = serviceSearch.trim().toLowerCase();
    const serviceList = (data.services || []).filter(s => {
      const matchesDept = s.departmentId === selectedDeptId;
      const matchesDoc = !selectedDoctorId || !s.doctorId || s.doctorId === selectedDoctorId;
      return matchesDept && matchesDoc;
    });
    if (!q) return serviceList;
    return serviceList.filter(s => s.name.toLowerCase().includes(q));
  }, [data.services, selectedDeptId, selectedDoctorId, serviceSearch]);

  const handleRefer = async () => {
    if (!patient) return;
    
    // We must have either selected departments/services OR at least fallback selectedDeptId
    if (selectedServiceIds.length === 0 && !selectedDeptId) return;

    const referrals = data.settings?.referrals || [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let baseQueueNum = (data.visits || []).filter(v => safeFormat(v.date, 'yyyy-MM-dd') === todayStr).length + 1;
    let newReferralsCount = referrals.length;

    let sDef = data.services?.find(s => s.id === 'referral-service');
    let nextServices = [...(data.services || [])];
    if (!sDef && selectedDeptId) {
       sDef = { id: 'referral-service', departmentId: selectedDeptId, name: 'تحويل طبي داخلي', price: 0 };
       nextServices.push(sDef);
    }
    
    const newQueueVisits: Visit[] = [];
    const newReferralList: Referral[] = [];
    const emrServiceLogs: ServiceLog[] = [];

    const selectedDestServices = (data.services || []).filter(s => selectedServiceIds.includes(s.id));
    
    // If no services selected, create a single visit for the selected department
    if (selectedDestServices.length === 0) {
       const destDept = data.departments?.find(d => d.id === selectedDeptId);
       const destDoc = data.users?.find(u => u.id === selectedDoctorId);
       
       let referredToName = destDept?.name || 'القسم المختار';
       if (destDoc) referredToName += ` - د. ${destDoc.name}`;
       
       const referralSeq = newReferralsCount + 1001;
       newReferralsCount++;
       const referralNumber = `REF-${referralSeq}`;
       
       newQueueVisits.push({
          id: `v-${Date.now()}`,
          patientId: patient.id,
          date: new Date().toISOString(),
          services: [{ id: `l-${Math.random().toString(36).substr(2, 9)}`, serviceId: sDef!.id!, status: 'PENDING' }],
          totalPrice: 0,
          invoiceNumber: referralNumber,
          queueNumber: baseQueueNum,
          targetDepartmentId: selectedDeptId,
          targetDoctorId: selectedDoctorId || undefined,
          isReferralUnpriced: true
       } as any);
       
       newReferralList.push({
          id: referralNumber,
          patientId: patient.id,
          patientName: patientName,
          referringDoctorId: currentUser.id,
          referringDoctorName: currentUser.name,
          referredToId: selectedDoctorId || selectedDeptId,
          referredToName: referredToName,
          referredToType: selectedDoctorId ? 'DOCTOR' : 'DEPARTMENT',
          priority,
          referralType,
          reason: referralReason,
          clinicalNotes,
          instructions,
          status: 'NEW',
          queueNumber: baseQueueNum,
          createdAt: new Date().toISOString()
       });
       
       emrServiceLogs.push({
          id: `l-${Math.random().toString(36).substr(2, 9)}`,
          serviceId: sDef!.id,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          completedBy: currentUser.id,
          addedBy: currentUser.name,
          notes: `محول من الطبيب: ${currentUser.name}\nالأولوية: ${priority === 'EMERGENCY' ? 'طوارئ' : priority === 'URGENT' ? 'عاجل' : 'عادي'}\nالوجهة: ${referredToName}\nالسبب: ${referralReason}`
       });
    } else {
       // Group selected services by department
       const servicesByDept: Record<string, typeof selectedDestServices> = {};
       selectedDestServices.forEach(s => {
          const dId = s.departmentId || selectedDeptId;
          if (!servicesByDept[dId]) servicesByDept[dId] = [];
          servicesByDept[dId].push(s);
       });
       
       let offset = 0;
       for (const [deptId, deptServices] of Object.entries(servicesByDept)) {
          const destDept = data.departments?.find(d => d.id === deptId);
          // If this is the active selected tab department, apply doctor to it, else no doctor
          const targetDocId = (deptId === selectedDeptId && selectedDoctorId) ? selectedDoctorId : undefined;
          const destDoc = data.users?.find(u => u.id === targetDocId);
          
          let referredToName = destDept?.name || 'القسم المختار';
          if (destDoc) referredToName += ` - د. ${destDoc.name}`;
          referredToName += ` - ${deptServices.map(s => s.name).join(' و ')}`;
          
          const referralSeq = newReferralsCount + 1001;
          newReferralsCount++;
          const referralNumber = `REF-${referralSeq}`;
          const currentQueueNum = baseQueueNum + offset;
          
          const svcLogs = deptServices.map(s => ({
             id: `l-${Math.random().toString(36).substr(2, 9)}`,
             serviceId: s.id,
             status: 'PENDING'
          } as ServiceLog));
          
          const deptPrice = 0;
          
          newQueueVisits.push({
             id: `v-${Date.now() + offset}`,
             patientId: patient.id,
             date: new Date().toISOString(),
             services: svcLogs,
             totalPrice: deptPrice,
             invoiceNumber: referralNumber,
             queueNumber: currentQueueNum,
             targetDepartmentId: deptId,
             targetDoctorId: targetDocId,
             isReferralUnpriced: true
          } as any);
          
          newReferralList.push({
             id: referralNumber,
             patientId: patient.id,
             patientName: patientName,
             referringDoctorId: currentUser.id,
             referringDoctorName: currentUser.name,
             referredToId: deptServices.map(s => s.id).join(','),
             referredToName: referredToName,
             referredToType: 'SERVICE',
             priority,
             referralType,
             reason: referralReason,
             clinicalNotes,
             instructions,
             status: 'NEW',
             queueNumber: currentQueueNum,
             createdAt: new Date().toISOString()
          });
          
          emrServiceLogs.push({
             id: `l-${Math.random().toString(36).substr(2, 9)}`,
             serviceId: sDef?.id || 'referral-service', // fallback if none
             status: 'COMPLETED',
             completedAt: new Date().toISOString(),
             completedBy: currentUser.id,
             addedBy: currentUser.name,
             notes: `محول من الطبيب: ${currentUser.name}\nالأولوية: ${priority === 'EMERGENCY' ? 'طوارئ' : priority === 'URGENT' ? 'عاجل' : 'عادي'}\nالوجهة: ${referredToName}\nالسبب: ${referralReason}`
          });
          
          offset++;
       }
    }

    const updatedVisits = data.visits.map(v => {
      if (v.id === visit.id) return { ...v, services: [...(v.services || []), ...emrServiceLogs] };
      return v;
    });

    await logAudit(
      currentUser,
      'UPDATE_PATIENT',
      patient.id,
      patient.name,
      null,
      null,
      `تم إصدار ${newReferralList.length} تحويلات طبية للمريض. النوع: ${referralType}, الأولوية: ${priority}`
    );

    saveData({
      ...data,
      services: nextServices,
      visits: [...updatedVisits, ...newQueueVisits],
      settings: { ...data.settings, referrals: [...referrals, ...newReferralList] }
    });

    onClose();
    toast.success(`تم تحويل المريض بنجاح بإجمالي ${newReferralList.length} وجهة`);
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-white/20"
        style={{ direction: 'rtl' }}
      >
        {/* Progress Header */}
        <div className="relative px-10 py-8 border-b-2 border-sky-50 flex-shrink-0">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                <ArrowRightLeft size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-sky-900">نظام التحويل الذكي</h3>
                <p className="text-sm text-sky-500 font-bold">بناء مسار علاجي مخصص للمريض</p>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
              <X size={24} className="text-sky-400" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[
              { id: 'DESTINATION', label: 'وجهة التحويل' },
              { id: 'DETAILS', label: 'التفاصيل والتعليمات' },
              { id: 'CONFIRMATION', label: 'المراجعة والتحويل' }
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                    step === s.id ? 'bg-sky-600 text-white shadow-md' : 'bg-sky-100 text-sky-400'
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs font-black ${step === s.id ? 'text-sky-600' : 'text-sky-400'}`}>{s.label}</span>
                </div>
                {i < 2 && <div className="flex-1 h-1 bg-sky-100 rounded-full mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
          <AnimatePresence mode="wait">
            {step === 'DESTINATION' && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-8"
              >
                {/* Department Section */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-sky-900 border-r-4 border-sky-600 pr-3">اختر القسم المختص</h4>
                    <div className="relative w-64">
                      <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400" />
                      <input 
                        type="text" 
                        placeholder="ابحث عن قسم..."
                        value={deptSearch}
                        onChange={e => setDeptSearch(e.target.value)}
                        className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl pr-11 px-4 py-3 text-sm font-bold text-sky-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDepts.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => { setSelectedDeptId(d.id); setSelectedDoctorId(''); }}
                        className={`flex items-center justify-between p-5 rounded-3xl border-[3px] text-right transition-all duration-300 ${getDeptColorClasses(d.type, selectedDeptId === d.id)}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedDeptId === d.id ? 'bg-white shadow-md' : 'bg-sky-50'}`}>
                            {getDeptIcon(d.type, selectedDeptId === d.id)}
                          </div>
                          <div>
                            <p className="font-black text-md leading-tight">{d.name}</p>
                            <p className="text-[11px] text-sky-400 font-bold mt-1 uppercase tracking-wider">
                              {d.type === 'CLINIC' ? 'عيادة تخصصية' : d.type === 'LAB' ? 'مختبر ومعمل' : d.type === 'RADIOLOGY' ? 'مركز أشعة' : 'قسم فحص'}
                            </p>
                          </div>
                        </div>
                        {selectedDeptId === d.id && <Check size={20} className="text-sky-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor Section (Conditional) */}
                {targetDept?.type === 'CLINIC' && clinicDoctors.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-4">
                    <h4 className="text-lg font-black text-sky-900 border-r-4 border-sky-600 pr-3">اختر الطبيب المعالج</h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { setSelectedDoctorId(''); }}
                        className={`px-6 py-4 rounded-[1.5rem] border-[3px] font-black text-sm transition-all flex items-center gap-3 ${selectedDoctorId === '' ? 'bg-sky-600 border-sky-600 text-white shadow-xl shadow-sky-200' : 'bg-white border-sky-100 text-sky-600 hover:border-sky-100'}`}
                      >
                        <AlertCircle size={18} />
                        أي طبيب متاح
                      </button>
                      {clinicDoctors.map(dr => (
                        <button
                          key={dr.id}
                          type="button"
                          onClick={() => { setSelectedDoctorId(dr.id); }}
                          className={`px-6 py-4 rounded-[1.5rem] border-[3px] font-black text-sm transition-all flex items-center gap-3 ${selectedDoctorId === dr.id ? 'bg-sky-600 border-sky-600 text-white shadow-xl shadow-sky-200' : 'bg-white border-sky-100 text-sky-600 hover:border-sky-100'}`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${selectedDoctorId === dr.id ? 'bg-white/20' : 'bg-sky-50 text-sky-600'}`}>{dr.name.charAt(0)}</div>
                          د. {dr.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Services Section */}
                {selectedDeptId && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-4">
                    <h4 className="text-lg font-black text-sky-900 border-r-4 border-sky-600 pr-3">الخدمة المطلوبة (يمكنك اختيار أكثر من خدمة)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pl-2">
                      <button
                        onClick={() => setSelectedServiceIds([])}
                        className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${selectedServiceIds.length === 0 ? 'bg-sky-600 border-sky-600 text-white shadow-xl shadow-sky-200' : 'bg-white border-sky-100 text-sky-600 hover:border-sky-200 hover:bg-sky-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Tag size={18} />
                          <span className="font-black text-sm">استشارة عامة ومتابعة</span>
                        </div>
                      </button>
                      {availableServices.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (s.doctorId && selectedDoctorId !== s.doctorId) setSelectedDoctorId(s.doctorId);
                            setSelectedServiceIds(prev => 
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between group ${selectedServiceIds.includes(s.id) ? 'bg-sky-600 border-sky-600 text-white shadow-xl shadow-sky-200' : 'bg-white border-sky-100 text-sky-600 hover:border-sky-200 hover:bg-sky-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Tag size={18} className={selectedServiceIds.includes(s.id) ? 'text-white' : 'text-sky-400 group-hover:text-sky-500 transition-colors'} />
                            <span className="font-black text-sm truncate max-w-[150px]">{s.name}</span>
                          </div>
                          <span className={`text-[11px] font-black px-3 py-1 rounded-xl whitespace-nowrap ${selectedServiceIds.includes(s.id) ? 'bg-white/20' : 'bg-sky-100 text-sky-600'}`}>{s.price} ج.م</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Overall Selected Services Summary */}
                {selectedServiceIds.length > 0 && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 mt-4 pt-4 border-t border-sky-100">
                      <p className="text-xs font-black text-sky-500 uppercase tracking-widest">إجمالي الخدمات المحددة</p>
                      <div className="flex flex-wrap gap-2">
                         {data.services?.filter(s => selectedServiceIds.includes(s.id)).map(svc => (
                            <div key={svc.id} className="flex items-center gap-2 bg-sky-50 border border-sky-100 text-sky-700 px-3 py-1.5 rounded-xl">
                               <Tag size={14} className="text-sky-400" />
                               <span className="text-xs font-bold">{svc.name}</span>
                               <span className="text-[10px] bg-white text-sky-500 px-2 py-0.5 rounded-lg">{data.departments?.find(d => d.id === svc.departmentId)?.name}</span>
                            </div>
                         ))}
                      </div>
                   </motion.div>
                )}
              </motion.div>
            )}

            {step === 'DETAILS' && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-8"
              >
                {/* Priority Selection */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-lg font-black text-sky-900 flex items-center gap-2">
                    <Clock size={20} className="text-sky-600" /> أولوية التحويل
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'NORMAL', label: 'عادي / روتيني', color: 'slate' },
                      { id: 'URGENT', label: 'عاجل / متابعة', color: 'orange' },
                      { id: 'EMERGENCY', label: 'طوارئ / فوري', color: 'rose' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPriority(p.id as any)}
                        className={`p-5 rounded-[1.5rem] border-[3px] font-black text-sm transition-all text-center ${
                          priority === p.id 
                            ? `border-${p.color}-500 bg-${p.color}-50 text-${p.color}-900 ring-4 ring-${p.color}-500/10` 
                            : 'bg-white border-sky-100 text-sky-400 hover:border-sky-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Referral Type */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-lg font-black text-sky-900 flex items-center gap-2">
                    <Layers size={20} className="text-sky-600" /> نوع التحويل
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'CONSULTATION', label: 'استشارة' },
                      { id: 'PROCEDURE', label: 'إجراء طبي' },
                      { id: 'TRANSFER', label: 'تحويل كلي' },
                      { id: 'FOLLOWUP', label: 'متابعة' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setReferralType(t.id as any)}
                        className={`p-4 rounded-2xl border-2 font-black text-xs transition-all text-center ${
                          referralType === t.id 
                            ? 'bg-sky-600 border-sky-600 text-white shadow-lg' 
                            : 'bg-white border-sky-100 text-sky-500'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-black text-sky-900 mr-2 flex items-center gap-2">
                      <FileText size={16} className="text-sky-600" /> سبب التحويل
                    </label>
                    <textarea 
                      value={referralReason}
                      onChange={e => setReferralReason(e.target.value)}
                      className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all min-h-[100px] text-sm"
                      placeholder="لماذا يتم تحويل المريض لهذا القسم؟"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-black text-sky-900 mr-2 flex items-center gap-2">
                      <Activity size={16} className="text-sky-600" /> ملاحظات إكلينيكية (اختياري)
                    </label>
                    <textarea 
                      value={clinicalNotes}
                      onChange={e => setClinicalNotes(e.target.value)}
                      className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all min-h-[100px] text-sm"
                      placeholder="التاريخ المرضي المختصر أو الحالة الحالية..."
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-black text-sky-900 mr-2 flex items-center gap-2">
                      <MessageSquare size={16} className="text-sky-600" /> تعليمات للطبيب المحول إليه (اختياري)
                    </label>
                    <textarea 
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all min-h-[100px] text-sm"
                      placeholder="أي تعليمات خاصة بالتعامل مع المريض..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'CONFIRMATION' && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-8"
              >
                <div className="bg-sky-50/50 rounded-[2.5rem] p-10 border-2 border-sky-100 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-32 h-32 bg-sky-600/5 rounded-full -translate-x-10 -translate-y-10" />
                   
                   <div className="relative z-10 flex flex-col gap-8">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="text-xs font-black text-sky-500 uppercase tracking-widest mb-1">بيانات التحويل الصادر</p>
                            <h3 className="text-3xl font-black text-sky-900">{patientName}</h3>
                         </div>
                         <div className="text-left">
                            <p className="text-xs font-black text-sky-400">رقم الملف</p>
                            <p className="text-xl font-bold text-sky-600">#{patient?.id}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <p className="text-xs font-black text-sky-400">الوجهات المحول إليها</p>
                             <div className="flex flex-col gap-3">
                                {selectedServiceIds.length > 0 ? (
                                   // Group selected services by department to show destinations
                                   Object.entries(
                                      (data.services || [])
                                         .filter(s => selectedServiceIds.includes(s.id))
                                         .reduce((acc, s) => {
                                            const dId = s.departmentId || selectedDeptId;
                                            if (!acc[dId]) acc[dId] = [];
                                            acc[dId].push(s);
                                            return acc;
                                         }, {} as Record<string, typeof data.services>)
                                   ).map(([deptId, svcs]) => (
                                      <div key={deptId} className="flex items-center gap-3 bg-white/50 p-2 rounded-2xl">
                                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100 flex-shrink-0">
                                             <Stethoscope size={20} />
                                          </div>
                                          <div>
                                             <p className="font-black text-sky-900 text-sm">{data.departments?.find(d => d.id === deptId)?.name}</p>
                                             <p className="text-[10px] font-bold text-sky-500">
                                                {svcs.map(s => s.name).join(' و ')}
                                             </p>
                                          </div>
                                      </div>
                                   ))
                                ) : (
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm border border-sky-100">
                                         <Stethoscope size={20} />
                                      </div>
                                      <div>
                                         <p className="font-black text-sky-900">{targetDept?.name}</p>
                                         <p className="text-xs font-bold text-sky-500">
                                            {selectedDoctorId ? `د. ${data.users?.find(u => u.id === selectedDoctorId)?.name}` : 'أي طبيب متاح'}
                                         </p>
                                      </div>
                                   </div>
                                )}
                             </div>
                         </div>

                         <div className="space-y-2">
                             <p className="text-xs font-black text-sky-400">الأولوية والنوع</p>
                             <div className="flex flex-wrap gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                                   priority === 'EMERGENCY' ? 'bg-rose-500 text-white' : 
                                   priority === 'URGENT' ? 'bg-orange-500 text-white' : 'bg-sky-600 text-white'
                                }`}>
                                   {priority === 'EMERGENCY' ? 'طوارئ' : priority === 'URGENT' ? 'عاجل' : 'عادي'}
                                </span>
                                <span className="px-4 py-1.5 rounded-full bg-white text-sky-600 border border-sky-100 text-xs font-black">
                                   {referralType === 'CONSULTATION' ? 'استشارة' : referralType === 'PROCEDURE' ? 'إجراء' : referralType === 'TRANSFER' ? 'تحويل' : 'متابعة'}
                                </span>
                             </div>
                         </div>
                      </div>

                      <div className="bg-white/60 rounded-[1.5rem] p-6 border border-white/80 space-y-4">
                         <div>
                            <p className="text-[10px] font-black text-sky-400 uppercase mb-1">سبب التحويل الرئيسي</p>
                            <p className="text-sm font-bold text-sky-800 leading-relaxed">{referralReason || 'لم يتم تحديد سبب'}</p>
                         </div>
                         {instructions && (
                           <div>
                              <p className="text-[10px] font-black text-sky-400 uppercase mb-1">تعليمات الطبيب</p>
                              <p className="text-sm font-bold text-sky-700 italic leading-relaxed">{instructions}</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-3xl border-2 border-amber-100">
                   <Info className="text-amber-500 flex-shrink-0 mt-1" size={20} />
                   <div className="space-y-1">
                      <p className="text-sm font-black text-amber-900">ملاحظة هامة للمحول</p>
                      <p className="text-xs font-bold text-amber-700 leading-relaxed">
                         سيتم تحويل المريض إلى قائمة الانتظار في القسم المستهدف وحجز رقم دور جديد له. سيتمكن الكادر الطبي هناك من قراءة هذه البيانات فور وصول المريض.
                      </p>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
          {step !== 'DESTINATION' ? (
            <button 
              onClick={() => setStep(step === 'CONFIRMATION' ? 'DETAILS' : 'DESTINATION')}
              className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all flex items-center gap-3"
            >
              <ChevronLeft className="rotate-180" size={18} />
              السابق
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all"
            >
              إلغاء
            </button>
          )}
          
          {step !== 'CONFIRMATION' ? (
            <button 
              onClick={() => {
                if (step === 'DESTINATION' && !selectedDeptId) {
                  toast.error('يرجى اختيار القسم الموجه إليه المريض أولاً');
                  return;
                }
                setStep(step === 'DESTINATION' ? 'DETAILS' : 'CONFIRMATION');
              }}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-sky-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              تـابــع الـخطــوة الـتـالـيـة
              <ChevronLeft size={18} />
            </button>
          ) : (
            <button 
              onClick={handleRefer}
              disabled={!referralReason}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-lg"
            >
              تأكيد التحويل وإرسال المريض
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
