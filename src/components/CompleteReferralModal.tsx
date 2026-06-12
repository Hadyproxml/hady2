import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Tag, 
  Database, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  Calculator, 
  Info,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { HospitalData, Visit, User, PatientCategoryDefinition } from '../types';
import { logAudit } from '../lib/audit';

interface CompleteReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit;
  data: HospitalData;
  saveData: (newData: HospitalData) => void;
  currentUser: User;
}

export function CompleteReferralModal({
  isOpen,
  onClose,
  visit,
  data,
  saveData,
  currentUser
}: CompleteReferralModalProps) {
  const patient = data.patients?.find(p => p.id === visit.patientId);
  
  // Set initial category from patient category if exists, or fallback to first default or first category
  const initialCategory = useMemo(() => {
    if (patient?.category) return patient.category;
    const defaultCat = data.settings?.patientCategories?.find(c => c.isDefault);
    if (defaultCat) return defaultCat.id;
    return data.settings?.patientCategories?.[0]?.id || 'CASH';
  }, [patient, data.settings?.patientCategories]);

  const [category, setCategory] = useState<string>(initialCategory);
  const [selectedSubDiscountId, setSelectedSubDiscountId] = useState<string>(patient?.selectedSubDiscountId || '');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>(patient?.selectedDiscountId || '');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number | ''>('');

  if (!isOpen || !visit) return null;

  // Selected Category Definition
  const currentCategory = (data.settings?.patientCategories || []).find(c => c.id === category);
  
  // Available discounts for that category
  const availableDiscounts = currentCategory?.availableDiscounts || [];

  // Selected Sub-Discount Definition
  const selectedSubDiscount = availableDiscounts.find(d => d.id === selectedSubDiscountId);
  
  // Discount Scheme if category requires it
  const selectedScheme = data.settings?.discountSchemes?.find(s => s.id === selectedDiscountId);

  // Normal original services with their standard prices
  const visitServicesWithMeta = useMemo(() => {
    return visit.services.map(s => {
      const sDef = data.services?.find(sd => sd.id === s.serviceId);
      return {
        ...s,
        name: sDef?.name || 'خدمة غير معروفة',
        originalPrice: sDef?.price || 0,
        deptName: data.departments?.find(d => d.id === sDef?.departmentId)?.name || 'القسم'
      };
    });
  }, [visit.services, data.services, data.departments]);

  // Original total sum of service prices
  const rawTotalPrice = useMemo(() => {
    return visitServicesWithMeta.reduce((sum, s) => sum + s.originalPrice, 0);
  }, [visitServicesWithMeta]);

  // Calculate generic discount percentage
  const discountPercent = useMemo(() => {
    if (customDiscountPercent !== '') {
      return customDiscountPercent;
    }
    if (selectedSubDiscount) {
      return selectedSubDiscount.percentage;
    }
    if (currentCategory?.discountOverridePercent !== undefined) {
      return currentCategory.discountOverridePercent;
    }
    if (currentCategory?.requiresDiscountScheme) {
      return selectedScheme?.percentage || 0;
    }
    return 0;
  }, [selectedSubDiscount, currentCategory, selectedScheme, customDiscountPercent]);

  const totalDiscount = Math.round(rawTotalPrice * (discountPercent / 100));
  const finalTotalPrice = Math.max(0, rawTotalPrice - totalDiscount);

  const getCategoryColorClasses = (colorName: string | undefined, isSelected: boolean) => {
    const col = colorName || 'slate';
    if (!isSelected) {
      return 'bg-white border-sky-100 text-sky-600 hover:border-sky-300';
    }
    switch (col) {
      case 'emerald': return 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-4 ring-emerald-500/10';
      case 'sky': return 'bg-sky-50 border-sky-500 text-sky-950 ring-4 ring-sky-500/10';
      case 'indigo': return 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-4 ring-indigo-500/10';
      case 'rose': return 'bg-rose-50 border-rose-500 text-rose-950 ring-4 ring-rose-500/10';
      case 'amber': return 'bg-amber-50 border-amber-500 text-amber-950 ring-4 ring-amber-500/10';
      case 'blue': return 'bg-blue-50 border-blue-500 text-blue-950 ring-4 ring-blue-500/10';
      case 'slate': return 'bg-slate-50 border-slate-500 text-slate-950 ring-4 ring-slate-500/10';
      default: return 'bg-sky-50 border-sky-500 text-sky-950 ring-4 ring-sky-500/10';
    }
  };

  const handleConfirm = async () => {
    if (!patient) return;

    if (currentCategory?.requiresDiscountScheme && !selectedDiscountId) {
      toast.warning('يرجى تحديد جهة التعاقد / نظام الخصم المطلوب');
      return;
    }

    const updatedPatients = data.patients.map(p => {
      if (p.id === patient.id) {
        return {
          ...p,
          category: category,
          selectedDiscountId: selectedDiscountId || undefined,
          selectedSubDiscountId: selectedSubDiscountId || undefined
        };
      }
      return p;
    });

    const updatedVisits = data.visits.map(v => {
      if (v.id === visit.id) {
        return {
          ...v,
          totalPrice: finalTotalPrice,
          categoryAtVisit: category,
          discountId: selectedDiscountId || undefined,
          isReferralUnpriced: false // Mark priced!
        };
      }
      return v;
    });

    const updatedReferrals = (data.settings.referrals || []).map(r => {
      if (r.id === visit.invoiceNumber) {
        return { ...r, status: 'COMPLETED' as const };
      }
      return r;
    });

    // Auditor logs
    await logAudit(
      currentUser,
      'UPDATE_PATIENT',
      patient.id,
      patient.name,
      visit,
      { ...visit, totalPrice: finalTotalPrice, isReferralUnpriced: false },
      `تم استكمال التحويل المالي للزيارة ${visit.invoiceNumber || visit.id} وتحديد تصنيف المريض (${currentCategory?.label || 'غير معروف'} - خصم ${discountPercent}%) بالقيمة الجمالية ${finalTotalPrice} ج.م`
    );

    saveData({
      ...data,
      patients: updatedPatients,
      visits: updatedVisits,
      settings: {
        ...data.settings,
        referrals: updatedReferrals
      }
    });

    toast.success('تم تسعير التحويل وتحديث تصنيف المريض بنجاح!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-white/20"
        style={{ direction: 'rtl' }}
      >
        <div className="relative px-10 py-8 border-b-2 border-sky-50 flex-shrink-0">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                        <Calculator size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-sky-900">استكمال التحويل المالي</h3>
                        <p className="text-sm text-sky-500 font-bold">تحديد فئة وتسعيرة خدمات المريض المحول: <span className="text-sky-900">{patient?.name}</span></p>
                    </div>
                </div>
            <button type="button" onClick={onClose} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                <X size={24} className="text-sky-400" />
            </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 scrollbar-thin">
          
          {/* Services List summary */}
          <div className="bg-sky-50/50 rounded-2xl p-5 border border-sky-100 flex flex-col gap-3">
            <span className="text-xs font-black text-sky-600 uppercase tracking-wider block border-b border-sky-100 pb-2">الخدمات المطلوب تسعيرها</span>
            <div className="flex flex-col gap-2">
              {visitServicesWithMeta.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-sky-100">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <div>
                      <p className="text-sm font-black text-sky-950">{s.name}</p>
                      <p className="text-[10px] text-sky-400 font-bold">{s.deptName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-sky-700">{s.originalPrice} ج.م</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 font-black text-sky-950 text-sm">
              <span>السعر الإجمالي الأساسي:</span>
              <span className="text-sky-800">{rawTotalPrice} ج.م</span>
            </div>
          </div>

          {/* Patient Category Picker */}
          <div className="space-y-4">
            <label className="text-sm font-black text-sky-900 pr-2 block">اختر تصنيف المريض للتحويل:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(data.settings?.patientCategories || []).map(cat => (
                <button 
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setSelectedSubDiscountId('');
                    setSelectedDiscountId('');
                    setCustomDiscountPercent('');
                  }}
                  className={`p-4 rounded-2xl border-2 font-black text-sm text-right flex flex-col justify-between transition-all ${
                    getCategoryColorClasses(cat.color, category === cat.id)
                  }`}
                >
                  <span className="font-black">{cat.label}</span>
                  {cat.discountOverridePercent !== undefined ? (
                    <span className="text-[11px] font-bold text-sky-500 mt-1">خصم {cat.discountOverridePercent}% ثنابي</span>
                  ) : cat.requiresDiscountScheme ? (
                    <span className="text-[11px] font-bold text-indigo-500 mt-1">يتطلب جهة تعاقد</span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-500 mt-1">تسعير قياسي</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Case A: Category has sub discounts */}
            {(availableDiscounts.length > 0 || true) && (
              <motion.div 
                key="sub-discounts"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pr-2">
                  <label className="text-sm font-black text-sky-900 flex items-center gap-2">
                    <Tag size={16} className="text-sky-600" /> نسب الخصم المتاحة لهذا التصنيف
                  </label>
                  <span className="text-[10px] font-black text-sky-400 bg-sky-50 px-2 py-1 rounded-lg">اختر نسبة أو أدخل قيمة يدوية</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {availableDiscounts.map(disc => (
                    <button 
                      key={disc.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubDiscountId(disc.id);
                        setCustomDiscountPercent('');
                      }}
                      className={`px-5 py-4 rounded-2xl border-2 font-black transition-all flex items-center gap-3 ${
                        selectedSubDiscountId === disc.id && customDiscountPercent === ''
                          ? 'bg-sky-600 border-sky-600 text-sky-50 shadow-md ring-4 ring-sky-500/15' 
                          : 'bg-white border-sky-100 text-sky-600 hover:border-sky-300'
                      }`}
                    >
                      <span className="text-xs">{disc.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-mono ${selectedSubDiscountId === disc.id ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-600'}`}>{disc.percentage}%</span>
                    </button>
                  ))}
                  
                  {/* Custom Percentage Input Toggle/Option */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 transition-all ${customDiscountPercent !== '' ? 'bg-amber-100 border-amber-400 text-amber-950' : 'bg-white border-sky-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-sky-500 whitespace-nowrap">خصم يدوي:</span>
                      <div className="relative w-20">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={customDiscountPercent}
                          onChange={(e) => {
                            setCustomDiscountPercent(e.target.value === '' ? '' : parseInt(e.target.value));
                            setSelectedSubDiscountId('');
                          }}
                          className="w-full bg-white border-2 border-sky-100 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs font-black text-sky-950 outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {availableDiscounts.length === 0 && customDiscountPercent === '' && (
                  <p className="text-[10px] font-bold text-sky-400 bg-sky-50/50 p-3 rounded-xl border border-dashed border-sky-100">هذا التصنيف لا يحتوي على نسب خصم مسبقة، يمكنك إدخال نسبة مئوية يدوياً في الخيار أعلاه.</p>
                )}
              </motion.div>
            )}

            {/* Case B: Category requires General contracts/Discount Schemes */}
            {currentCategory?.requiresDiscountScheme && (
              <motion.div 
                key="contracts"
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <label className="text-sm font-black text-sky-900 pr-2 block flex items-center gap-2">
                  <Database size={16} className="text-indigo-600" /> جهة التعاقد التابع لها المريض
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(data.settings?.discountSchemes || []).map(scheme => (
                    <button 
                      key={scheme.id}
                      type="button"
                      onClick={() => setSelectedDiscountId(scheme.id)}
                      className={`p-4 rounded-xl border-2 font-black text-right flex justify-between items-center transition-all ${
                        selectedDiscountId === scheme.id 
                          ? 'bg-sky-950 border-sky-950 text-white shadow-lg ring-4 ring-sky-900/15' 
                          : 'bg-white border-sky-100 text-sky-600 hover:border-sky-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{scheme.name}</span>
                        <span className="text-[10px] text-sky-400 mt-1">جهة رسمية معتمدة</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${selectedDiscountId === scheme.id ? 'bg-sky-850 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>خصم {scheme.percentage}%</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pricing calculations dashboard/breakdown */}
          <div className="bg-sky-950 text-sky-100 rounded-[2rem] p-6 relative overflow-hidden border border-sky-900">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-6 -translate-y-6" />
            <div className="flex flex-col gap-4 relative z-10">
              <span className="text-xs font-black text-sky-400 flex items-center gap-2 uppercase tracking-wide">
                <Info size={14} /> فحص الحساب المالي بعد تطبيق الخصومات
              </span>
              <div className="grid grid-cols-3 gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-sky-400">السعر الأساسي</span>
                  <span className="text-lg font-mono font-bold">{rawTotalPrice} ج.م</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-sky-400">إجمالي الخصم (%{discountPercent})</span>
                  <span className="text-lg font-mono font-bold text-amber-400">-{totalDiscount} ج.م</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-sky-400">الصافي المطلوب</span>
                  <span className="text-xl font-mono font-black text-emerald-400">{finalTotalPrice} ج.م</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold leading-relaxed">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>
                  سيتم تسجيل التحويل المالي وتثبيت السعر المستحق بقيمة <span className="text-white font-mono">{finalTotalPrice} ج.م</span> بناءً على تصنيف <span className="text-emerald-300 font-black">({currentCategory?.label || 'المحدد'})</span>.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                إلغاء
            </button>
            <button type="button" onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-lg">
                <Check size={20} />
                تأكيد تصنيف المريض وتثبيت السعر
            </button>
        </div>

      </motion.div>
    </div>
  );
}
