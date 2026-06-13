import React, { useState } from 'react';
import { Visit, MedicationRecord, Clinic, ServiceItem, MedicationItem, ServiceRecord, UserAccount } from '../types';
import { ClipboardList, Play, CheckCircle2, Plus, Trash2, Syringe, FileText, Pill, AlertCircle, Clock, Save, User, Building2, Printer, Settings2, X, Paperclip, UploadCloud } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';

interface DoctorSectionProps {
  visits: Visit[];
  updateVisit: (visitId: string, updates: Partial<Visit>) => void;
  servicesCatalog: ServiceItem[];
  medicationsCatalog: MedicationItem[];
  clinics: Clinic[];
  currentUser: UserAccount;
}

export default function DoctorSection({ visits, updateVisit, servicesCatalog, medicationsCatalog, clinics, currentUser }: DoctorSectionProps) {
  const waitingVisits = visits.filter(v => {
    if (v.status !== 'WAITING' && v.status !== 'EXAMINING') return false;
    if (currentUser.role === 'DOCTOR' && currentUser.clinicId) {
      return v.clinicId === currentUser.clinicId || !v.clinicId;
    }
    return true; 
  });
  
  const [activeVisitId, setActiveVisitId] = useState<string | null>(
    visits.find(v => v.status === 'EXAMINING')?.id || null
  );
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // States for medical attachments
  const [attachmentName, setAttachmentName] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [tempFile, setTempFile] = useState<{ name: string; type: string; size: number; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeVisit = activeVisitId ? visits.find(v => v.id === activeVisitId)! : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('حجم الملف كبير جداً! الحد الأقصى هو 4 ميجابايت لضمان سرعة الحفظ وسلاسة النظام.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      setTempFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: reader.result as string
      });
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setAttachmentName(baseName);
    };
    reader.onerror = () => {
      setUploadError('حدث خطأ أثناء قراءة الملف. يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleAddAttachment = () => {
    if (!activeVisit || !tempFile) return;
    const newAttachment = {
      id: crypto.randomUUID(),
      name: attachmentName.trim() || tempFile.name,
      url: tempFile.url,
      type: tempFile.type,
      size: tempFile.size,
      serviceId: selectedServiceId || undefined,
      uploadedAt: new Date().toISOString()
    };

    const updatedAttachments = [...(activeVisit.attachments || []), newAttachment];
    updateVisit(activeVisit.id, { attachments: updatedAttachments });
    
    // Reset state
    setTempFile(null);
    setAttachmentName('');
    setSelectedServiceId('');
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!activeVisit) return;
    const attachment = (activeVisit.attachments || []).find(a => a.id === attachmentId);
    if (!attachment) return;
    setDeleteModal({
      isOpen: true,
      title: 'حذف ملف مرفق',
      message: `هل أنت متأكد من رغبتك في حذف هذا الملف المرفق "${attachment.name}"؟ لا يمكن التراجع عن هذا الإجراء لاحقاً.`,
      onConfirm: () => {
        const updatedAttachments = (activeVisit.attachments || []).filter(a => a.id !== attachmentId);
        updateVisit(activeVisit.id, { attachments: updatedAttachments });
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePullCase = (visit: Visit) => {
    updateVisit(visit.id, { 
      status: 'EXAMINING',
      doctorName: currentUser.fullName
    });
    setActiveVisitId(visit.id);
  };

  const toggleService = (serviceItem: ServiceItem) => {
    if (!activeVisit) return;
    const currentServices = activeVisit.services || [];
    const exists = currentServices.some(s => s.id === serviceItem.id);
    
    let updatedServices;
    if (exists) {
       updatedServices = currentServices.filter(s => s.id !== serviceItem.id);
    } else {
       updatedServices = [...currentServices, { id: serviceItem.id, name: serviceItem.name, price: serviceItem.price }];
    }
    
    updateVisit(activeVisit.id, { services: updatedServices });
  };

  const addMedication = (medicationItem: MedicationItem) => {
    if (!activeVisit) return;
    const exists = (activeVisit.medications || []).some(m => m.id === medicationItem.id);
    if (exists) return;

    const newMed: MedicationRecord = { 
      id: medicationItem.id, 
      name: medicationItem.name, 
      price: medicationItem.price, 
      instructions: '' 
    };
    updateVisit(activeVisit.id, { medications: [...(activeVisit.medications || []), newMed] });
  };

  const updateMedicationInstruction = (id: string, instructions: string) => {
    if (!activeVisit) return;
    const updatedMeds = (activeVisit.medications || []).map(med => 
      med.id === id ? { ...med, instructions } : med
    );
    updateVisit(activeVisit.id, { medications: updatedMeds });
  };

  const removeMedication = (id: string) => {
    if (!activeVisit) return;
    updateVisit(activeVisit.id, { 
      medications: (activeVisit.medications || []).filter(med => med.id !== id) 
    });
  };

  if (activeVisit) {
    return (
      <div className="max-w-full w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
        <div className="bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-[#0f2e46] px-8 py-3.5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-400 rounded-xl flex items-center justify-center text-[#0f2e46] shadow-lg shadow-emerald-400/20">
                   <Syringe size={18} className="animate-pulse" />
                </div>
                <div>
                   <h2 className="text-base font-black text-white leading-tight">جلسة فحص نشطة</h2>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                      <span className="text-[8px] font-bold text-white/50 tracking-[0.1em] uppercase">Examination in Progress...</span>
                   </div>
                </div>
             </div>
             <button 
                onClick={() => setActiveVisitId(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-lg font-black text-[11px] transition-all flex items-center gap-2.5 backdrop-blur-md"
             >
                <ClipboardList size={14} />
                العودة للانتظار
             </button>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-5">
               <div className="bg-[#f8fafc] p-6 rounded-[1.5rem] border-2 border-slate-50 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center text-[#0f2e46] mb-4 border-2 border-slate-50">
                     <User size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-1">{activeVisit.pet.name}</h3>
                  <div className="flex gap-1.5">
                     <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{activeVisit.pet.species}</span>
                     <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{activeVisit.pet.age || 'N/A'}</span>
                  </div>

                  <div className="w-full mt-6 pt-6 border-t border-slate-200/50 space-y-5">
                     <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">اسم صاحب الحالة</span>
                        <span className="text-xs font-black text-slate-800">{activeVisit.owner.fullName}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono" dir="ltr">{activeVisit.owner.phone}</span>
                     </div>

                     <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-100/30">
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none mb-2">
                           <AlertCircle size={10} /> الحالة المبدئية
                        </span>
                        <p className="text-amber-900 font-bold text-[11px] leading-relaxed">{activeVisit.pet.condition}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-9 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Settings2 className="text-indigo-600" size={20} />
                        إجراءات الجلسة
                     </h4>
                     <div className="flex flex-wrap gap-2.5">
                        {servicesCatalog.map(service => {
                           const isSelected = activeVisit.services?.some(s => s.id === service.id);
                           return (
                              <button
                                 key={service.id}
                                 onClick={() => toggleService(service)}
                                 className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 border-2 ${
                                    isSelected 
                                       ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' 
                                       : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-100 hover:bg-slate-50'
                                 }`}
                              >
                                 {service.name} 
                                 {isSelected && <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>}
                              </button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Pill className="text-purple-600" size={20} />
                        صيدلية العيادة
                     </h4>
                     <div className="space-y-3">
                        <select 
                           onChange={(e) => {
                              const medId = e.target.value;
                              if (medId) {
                                 const med = medicationsCatalog.find(m => m.id === medId);
                                 if (med) addMedication(med);
                                 e.target.value = '';
                              }
                           }}
                           defaultValue=""
                           className="w-full bg-[#f8fafc] border-2 border-slate-100 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 font-bold text-xs text-slate-800 transition-all shadow-inner"
                        >
                           <option value="" disabled>-- اختر الدواء --</option>
                           {medicationsCatalog.map(med => (
                              <option key={med.id} value={med.id}>{med.name}</option>
                           ))}
                        </select>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar py-1">
                           {(activeVisit.medications || []).map((med, index) => (
                              <div key={med.id} className="p-4 bg-white rounded-xl border-2 border-slate-50 shadow-sm relative group">
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="font-black text-slate-800 text-[11px]">{med.name}</span>
                                    <button 
                                       onClick={() => removeMedication(med.id)}
                                       className="text-slate-300 hover:text-red-500 transition-all"
                                    >
                                       <X size={14} />
                                    </button>
                                 </div>
                                 <input 
                                    type="text" 
                                    value={med.instructions}
                                    onChange={(e) => updateMedicationInstruction(med.id, e.target.value)}
                                    placeholder="طريقة الاستخدام..."
                                    className="w-full px-3 py-1.5 bg-[#f8fafc] border border-slate-100 rounded-lg text-[9px] outline-none focus:border-indigo-500 font-bold"
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-3 pt-6 border-t border-slate-100">
                  <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                     <FileText className="text-emerald-600" size={20} />
                     التقرير الطبي
                  </h4>
                  <textarea 
                     value={activeVisit.doctorNotes || ''}
                     onChange={(e) => updateVisit(activeVisit.id, { doctorNotes: e.target.value })}
                     placeholder="سجل التشخيص الطبي هنا..."
                     rows={6}
                     className="w-full px-6 py-4 bg-[#f8fafc] border-2 border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none font-bold text-base leading-relaxed shadow-inner"
                  />
               </div>

                {/* قسم المرفقات والملفات الطبية */}
                <div id="attachments-section" className="space-y-4 pt-6 border-t border-slate-100">
                   <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                      <Paperclip className="text-blue-600" size={20} />
                      الملفات والمرفقات الطبية (أشعة / تحاليل / تقارير)
                   </h4>
                   <p className="text-slate-400 font-bold text-xs font-sans">
                      يمكنك رفع ملفات الأشعة، تحاليل المختبر، أو أي تقارير طبية وحفظها مباشرة في السجل الطبي للأليف.
                   </p>

                   <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      {/* upload form box */}
                      <div className="md:col-span-12 lg:col-span-5 bg-[#f8fafc] border-2 border-slate-100 p-5 rounded-[1.50rem] space-y-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">إضافة مرفق جديد</span>
                         
                         <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center ${
                               isDragging 
                                  ? 'border-indigo-600 bg-indigo-50/50' 
                                  : tempFile 
                                     ? 'border-emerald-300 bg-emerald-50/10' 
                                     : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                            }`}
                         >
                            <input 
                               type="file" 
                               id="medical-file-upload"
                               onChange={handleFileChange}
                               className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            
                            {tempFile ? (
                               <div className="space-y-2">
                                  {tempFile.type.startsWith('image/') ? (
                                     <img src={tempFile.url} alt="preview" className="w-16 h-16 object-cover rounded-lg mx-auto shadow-md border-2 border-white" />
                                  ) : (
                                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mx-auto shadow-sm">
                                        <FileText size={24} />
                                     </div>
                                  )}
                                  <p className="text-[10px] font-black text-slate-800 max-w-[150px] truncate mx-auto animate-pulse" dir="ltr">{tempFile.name}</p>
                                  <p className="text-[8px] font-bold text-slate-400">{(tempFile.size / 1024 / 1024).toFixed(2)} MB</p>
                               </div>
                            ) : (
                               <div className="space-y-2 py-4">
                                  <UploadCloud className="text-slate-400 group-hover:text-indigo-600 transition-all mx-auto" size={32} />
                                  <p className="text-[11px] font-black text-slate-600">اسحب الملف هنا أو اضغط للتصفح</p>
                                  <p className="text-[9px] font-bold text-slate-400">الحد الأقصى: 4 ميجابايت (البيانات تحفظ محلياً)</p>
                               </div>
                            )}
                         </div>

                         {uploadError && (
                            <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-1.5 animate-in fade-in">
                               <AlertCircle size={12} className="shrink-0" />
                               <span>{uploadError}</span>
                            </div>
                         )}

                         {tempFile && (
                            <div className="space-y-3 animate-in fade-in duration-300">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">مسمى المرفق / نوع التحليل</label>
                                  <input 
                                     type="text" 
                                     value={attachmentName}
                                     onChange={(e) => setAttachmentName(e.target.value)}
                                     placeholder="أشعة سونار، تحليل دم، إلخ..."
                                     className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-600 opacity-90"
                                  />
                               </div>

                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ربط المرفق بإجراء/خدمة (اختياري)</label>
                                  <select 
                                     value={selectedServiceId}
                                     onChange={(e) => setSelectedServiceId(e.target.value)}
                                     className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-600 font-sans"
                                  >
                                     <option value="">-- مرفق عام للزيارة --</option>
                                     {activeVisit.services?.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                     ))}
                                  </select>
                               </div>

                               <div className="flex gap-2 pt-2">
                                  <button 
                                     type="button"
                                     onClick={() => setTempFile(null)}
                                     className="flex-1 py-2 bg-slate-200/50 hover:bg-slate-200 text-slate-600 rounded-lg font-black text-[10px] transition-colors"
                                  >
                                     إلغاء
                                  </button>
                                  <button 
                                     type="button"
                                     onClick={handleAddAttachment}
                                     className="flex-1 py-2 bg-[#0f2e46] hover:bg-slate-800 text-white rounded-lg font-black text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-md animate-pulse"
                                  >
                                     <Plus size={14} /> إضافة المرفق
                                  </button>
                               </div>
                            </div>
                         )}
                      </div>

                      {/* list of attachments on active visit */}
                      <div className="md:col-span-12 lg:col-span-7 space-y-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">الملفات المرفقة بالزيارة الحالية ({activeVisit.attachments?.length || 0})</span>
                         
                         {!activeVisit.attachments || activeVisit.attachments.length === 0 ? (
                            <div className="border border-slate-200 p-12 text-center rounded-[1.50rem] bg-slate-50/30 flex flex-col items-center justify-center">
                               <FileText size={32} className="text-slate-300 mb-3" />
                               <p className="text-xs font-black text-slate-400 font-sans">لا توجد ملفات مرفقة حتى الآن</p>
                               <p className="text-[9px] font-bold text-slate-300 mt-1">يمكنك رفع وتقسيم ملفات أليفك الطبية وربطها بالخدمات</p>
                            </div>
                         ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto no-scrollbar py-1">
                               {activeVisit.attachments.map(att => {
                                  const matchedService = activeVisit.services?.find(s => s.id === att.serviceId);
                                  const isImage = att.type.startsWith('image/');

                                  return (
                                     <div key={att.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3 relative group hover:border-[#0f2e46]/20 transition-all animate-in fade-in">
                                        <button 
                                           type="button"
                                           onClick={() => handleRemoveAttachment(att.id)}
                                           className="absolute top-2.5 left-2.5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                           title="حذف الملف"
                                        >
                                           <Trash2 size={12} />
                                        </button>

                                        {isImage ? (
                                           <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 shrink-0 shadow-inner bg-slate-50">
                                              <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                           </div>
                                        ) : (
                                           <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
                                              <FileText size={20} />
                                           </div>
                                        )}

                                        <div className="space-y-1 pr-1 truncate">
                                           <h5 className="font-black text-slate-800 text-[11px] truncate leading-tight hover:text-indigo-600 cursor-pointer" title={att.name} onClick={() => {
                                              const w = window.open();
                                              if (w) {
                                                 w.document.write(`<iframe src="${att.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                              }
                                           }}>{att.name}</h5>
                                           <div className="flex flex-col gap-0.5">
                                              <span className="text-[8px] font-bold text-slate-400">{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                                              {matchedService ? (
                                                 <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block w-fit mt-0.5 max-w-[120px] truncate" title={matchedService.name}>
                                                    مرتبط بـ: {matchedService.name}
                                                 </span>
                                              ) : (
                                                 <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-block w-fit mt-0.5">
                                                    مرفق عام للزيارة
                                                 </span>
                                              )}
                                           </div>
                                        </div>
                                     </div>
                                  );
                               })}
                            </div>
                         )}
                      </div>
                   </div>
                </div>

               <div className="pt-6 flex items-center justify-between">
                   <div className="flex gap-3">
                      <button 
                         onClick={() => setIsPharmacyModalOpen(true)}
                         className="px-6 py-3 bg-[#f8fafc] hover:bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs border-2 border-slate-100 hover:border-indigo-200 transition-all flex items-center gap-2.5"
                      >
                         <Printer size={18} />
                         طباعة
                      </button>
                      <button 
                         className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-500 rounded-xl font-black text-xs border-2 border-slate-100 transition-all flex items-center gap-2.5"
                      >
                         <Save size={18} />
                         حفظ مسودة
                      </button>
                   </div>

                   <button 
                      onClick={() => {
                         updateVisit(activeVisit.id, { 
                            status: 'AWAITING_PAYMENT',
                            doctorName: currentUser.fullName
                         });
                         setActiveVisitId(null);
                      }}
                      className="px-8 py-4 bg-[#0f2e46] hover:bg-slate-800 text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-slate-300 transition-all transform active:scale-95 flex items-center gap-3"
                   >
                      اعتماد الجلسة <CheckCircle2 size={20} />
                   </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#0f2e46] rounded-[1.5rem] p-8 text-white shadow-xl shadow-slate-300 relative overflow-hidden">
         <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-2xl font-black tracking-tight mb-2">إدارة حالات اليوم</h1>
               <p className="text-white/50 font-bold text-sm max-w-lg leading-relaxed">
                  أهلاً بك د. {currentUser.fullName}. إليك قائمة الحالات المسجلة. 
               </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl px-8 py-6 rounded-2xl border border-white/20 flex flex-col items-center min-w-[160px]">
               <span className="text-4xl font-black text-emerald-400 leading-none">{waitingVisits.length}</span>
               <span className="text-[9px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">حالة انتظار</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {waitingVisits.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center col-span-full">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-slate-50/50">
               <Clock size={32} className="text-slate-300 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">القائمة خالية الآن</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose">سيتم توجيه الحالات إليك تلقائياً</p>
          </div>
        ) : (
          waitingVisits.map((visit, index) => {
            const clinic = clinics.find(c => c.id === visit.clinicId);
            const isExamining = visit.status === 'EXAMINING';

            return (
              <div key={visit.id} className={`bg-white rounded-[2rem] border-2 transition-all p-8 flex flex-col group relative overflow-hidden ${
                isExamining 
                ? 'border-indigo-600 shadow-2xl scale-105 z-10' 
                : 'border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:border-indigo-200'
              }`}>
                <div className="flex items-center justify-between mb-6">
                   <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-lg transition-all transform group-hover:rotate-6 ${
                     isExamining ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-900 text-white shadow-slate-200'
                   }`}>
                      {index + 1}
                   </div>
                   {isExamining && (
                      <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg shadow-lg shadow-emerald-100 flex items-center gap-1.5 animate-pulse uppercase tracking-wider">
                         <Syringe size={12} /> فحص نشط
                      </span>
                   )}
                </div>

                <div className="space-y-4 flex-grow">
                   <div className="flex flex-col gap-0.5">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{visit.pet.name}</h3>
                      <div className="flex gap-1.5">
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{visit.pet.species}</span>
                        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{visit.pet.age || 'N/A'}</span>
                      </div>
                   </div>

                   <div className="pt-4 border-t border-slate-50 space-y-3">
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">اسم المالك</span>
                         <span className="text-xs font-black text-slate-600">{visit.owner.fullName}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">القسم</span>
                         <span className="text-xs font-black text-slate-600 flex items-center gap-2">
                            <Building2 size={14} className={isExamining ? 'text-indigo-400' : 'text-slate-400'} />
                            {clinic?.name || 'قسم عام'}
                         </span>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => handlePullCase(visit)}
                  className={`mt-6 w-full flex items-center justify-center gap-2.5 font-black py-4 rounded-xl transition-all transform active:scale-95 text-base shadow-lg group/btn ${
                    isExamining 
                    ? 'bg-indigo-600 text-white hover:bg-slate-800 shadow-indigo-100' 
                    : 'bg-[#f8fafc] text-[#0f2e46] hover:bg-[#0f2e46] hover:text-white border-2 border-slate-50 hover:border-[#0f2e46]'
                  }`}
                >
                  {isExamining ? 'متابعة الفحص' : 'بدء الفحص'}
                  <Play size={16} className="group-hover/btn:translate-x-[-3px] transition-all" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
      />
    </div>
  );
}
