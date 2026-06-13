import React from 'react';
import { Visit, Clinic } from '../types';
import { Printer, X } from 'lucide-react';

interface InvoiceModalProps {
  visit: Visit | null;
  onClose: () => void;
  clinics: Clinic[];
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
}

export default function InvoiceModal({ visit, onClose, clinics, hospitalName, hospitalAddress, hospitalPhone }: InvoiceModalProps) {
  if (!visit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
           <h3 className="text-lg font-bold text-slate-800">معاينة الفاتورة قبل الطباعة</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold p-1"><X size={20} /></button>
         </div>
         
         <div className="p-8 sm:p-10 print:p-8 font-sans text-slate-800" id="printable-invoice">
            {/* Header Block with Clinic Details & Invoice Meta */}
            <div className="flex justify-between items-start border-b-2 border-slate-300 pb-6 mb-8">
               <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-2 print:border print:border-indigo-150">
                     فاتورة ضريبية مبسطة
                  </div>
                  <h1 className="text-2xl font-black text-slate-900">فاتورة الخدمات الطبية</h1>
                  <p className="text-slate-500 font-bold text-xs">
                     رقم الفاتورة: <span className="font-mono text-slate-900 select-all">#{visit.id.substring(0, 8).toUpperCase()}</span>
                  </p>
                  <p className="text-slate-500 font-bold text-xs">
                     تاريخ الإصدار: <span className="text-slate-900">{new Date(visit.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
               </div>
               <div className="text-left w-72 border-r-2 border-slate-100 pr-4 space-y-1 print:border-r-0">
                  <h2 className="text-xl font-black text-[#0f2e46] mb-0.5">{hospitalName}</h2>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed whitespace-pre-line">{hospitalAddress}</p>
                  <p className="text-xs font-black text-slate-705 mt-1" dir="ltr">{hospitalPhone}</p>
               </div>
            </div>

            {/* Patients & Clients Details Section */}
            <div className="grid grid-cols-2 gap-6 mb-8">
               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm print:bg-white print:border">
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-3 inline-block">بيانات العميل</span>
                  <p className="font-black text-slate-900 text-base mb-1.5">{visit.owner.fullName}</p>
                  <div className="space-y-1 text-xs text-slate-600 font-bold">
                     <p className="flex items-center gap-1.5" dir="ltr">
                        <span className="text-slate-400">الهاتف:</span> {visit.owner.phone}
                     </p>
                     {visit.owner.email && (
                        <p className="flex items-center gap-1.5">
                           <span className="text-slate-400">البريد:</span> {visit.owner.email}
                        </p>
                     )}
                  </div>
               </div>
               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-sm print:bg-white print:border">
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-3 inline-block">بيانات الأليف</span>
                  <p className="font-black text-slate-900 text-base mb-1.5">{visit.pet.name}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-bold">
                     <p><span className="text-slate-400">الفصيلة/النوع:</span> {visit.pet.species}</p>
                     <p><span className="text-slate-400">العمر:</span> {visit.pet.age}</p>
                  </div>
               </div>
            </div>

            {/* Medical Assessment Section */}
            <div className="mb-8 bg-slate-50 border border-slate-200/60 rounded-2xl p-6 print:bg-white print:border">
               <h3 className="font-black text-sm text-[#0f2e46] mb-4 border-b border-slate-200 pb-2.5 flex items-center justify-between">
                  <span>التفاصيل الطبية للزيارة</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono text-left">Medical Summary</span>
               </h3>
               
               <div className="space-y-4 font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div>
                        <strong className="block text-[10px] font-bold text-slate-400 mb-1">الشكوى والأعراض الواردة:</strong>
                        <p className="text-sm text-slate-800 font-bold bg-white p-2.5 rounded-lg border border-slate-100 print:border">{visit.pet.condition || 'لا يوجد'}</p>
                     </div>
                     <div>
                        <strong className="block text-[10px] font-bold text-slate-400 mb-1">الطبيب المسؤول:</strong>
                        <p className="text-sm text-slate-800 font-bold bg-white p-2.5 rounded-lg border border-slate-100 print:border">
                           {visit.doctorName || clinics.find(c => c.id === visit.clinicId)?.doctorName || 'غير محدد'}
                        </p>
                     </div>
                  </div>

                  {visit.doctorNotes && (
                     <div className="pt-2 border-t border-slate-200/40">
                        <strong className="block text-[10px] font-bold text-slate-400 mb-1">التشخيص والتوجيه الطبي:</strong>
                        <div className="text-sm text-slate-800 font-bold bg-white p-3.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed print:border">
                           {visit.doctorNotes}
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Invoice Service Items and Medications Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:grid-cols-2">
               {/* Right/First Column: services */}
               <div className="flex flex-col">
                  <h3 className="font-black text-xs text-[#0f2e46] mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                     <span>إجراءات الجلسة والخدمات</span>
                     <span className="text-[8px] font-bold text-slate-400 font-mono">Medical Services</span>
                  </h3>
                  <div className="overflow-hidden border border-slate-200 rounded-2xl flex-grow bg-slate-50/20">
                     <table className="w-full text-right border-collapse">
                        <thead>
                           <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[9px] uppercase">
                              <th className="py-2.5 px-3 text-center w-8">#</th>
                              <th className="py-2.5 px-3">الخدمة / الإجراء</th>
                              <th className="py-2.5 px-3 text-left w-24">السعر</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold text-xs">
                           {visit.services?.map((s, index) => (
                              <tr key={s.id} className="hover:bg-slate-50/50">
                                 <td className="py-2.5 px-3 text-center text-slate-400 font-medium font-mono">{index + 1}</td>
                                 <td className="py-2.5 px-3 text-slate-900">{s.name}</td>
                                 <td className="py-2.5 px-3 text-left text-slate-900 font-mono" dir="ltr">{s.price.toFixed(2)} جنيه</td>
                              </tr>
                           ))}
                           {(!visit.services || visit.services.length === 0) && (
                              <tr>
                                 <td colSpan={3} className="py-6 text-center text-slate-400 text-[10px]">لا توجد خدمات مسجلة</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Left/Second Column: Medications */}
               <div className="flex flex-col">
                  <h3 className="font-black text-xs text-[#0f2e46] mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                     <span>الأدوية الموصوفة</span>
                     <span className="text-[8px] font-bold text-slate-400 font-mono">Prescribed Medications</span>
                  </h3>
                  <div className="overflow-hidden border border-slate-200 rounded-2xl flex-grow bg-slate-50/20">
                     <table className="w-full text-right border-collapse">
                        <thead>
                           <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-[9px] uppercase">
                              <th className="py-2.5 px-3 text-center w-8">#</th>
                              <th className="py-2.5 px-3">الدواء والعلاج</th>
                              <th className="py-2.5 px-3 text-left w-24">السعر</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold text-xs">
                           {visit.medications?.map((m, index) => (
                              <tr key={m.id} className="hover:bg-slate-50/50">
                                 <td className="py-2.5 px-3 text-center text-slate-400 font-medium font-mono">{index + 1}</td>
                                 <td className="py-2.5 px-3">
                                    <span className="text-slate-900 block">{m.name}</span>
                                    {m.instructions && (
                                       <span className="text-[8px] font-bold text-[#0f2e46] bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block whitespace-normal break-words max-w-[150px]">
                                          {m.instructions}
                                       </span>
                                    )}
                                 </td>
                                 <td className="py-2.5 px-3 text-left text-slate-900 font-mono" dir="ltr">{m.price.toFixed(2)} جنيه</td>
                              </tr>
                           ))}
                           {(!visit.medications || visit.medications.length === 0) && (
                              <tr>
                                 <td colSpan={3} className="py-6 text-center text-slate-400 text-[10px]">لا توجد أدوية مسجلة</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Subtotals & Grand Totals */}
            <div className="flex justify-between items-start mt-6 pt-4 border-t-2 border-slate-200 mb-4 font-sans">
                  {/* Stamp & Authorized Signature Fields */}
                  <div className="hidden print:flex flex-col text-right pr-4 space-y-4">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">توقيع المسؤول والختم</div>
                     <div className="w-40 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                        <span className="text-[9px] text-slate-300">ختم المنشأة الرسمي</span>
                     </div>
                  </div>
                  <div className="print:hidden col-span-1 self-center">
                     {/* Space filler for preview state */}
                     <span className="text-xs text-slate-400 font-medium">الأسعار تشمل كافة الفحوصات والأدوية المسجلة أعلاه</span>
                  </div>

                  <div className="w-72 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 font-bold space-y-2.5 print:bg-white text-right col-span-1">
                     <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>المجموع الفرعي للإيرادات:</span>
                        <span dir="ltr" className="font-mono text-slate-800">
                           {((visit.services?.reduce((acc, s) => acc + s.price, 0) || 0) + 
                            (visit.medications?.reduce((acc, m) => acc + m.price, 0) || 0)).toFixed(2)} جنيه
                        </span>
                     </div>
                     <div className="flex justify-between items-center font-black text-base text-slate-900 border-t border-slate-200/60 pt-2 mt-2">
                        <span>إجمالي الفاتورة (الصافي):</span>
                        <span dir="ltr" className="font-mono text-lg text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                           {((visit.services?.reduce((acc, s) => acc + s.price, 0) || 0) + 
                            (visit.medications?.reduce((acc, m) => acc + m.price, 0) || 0)).toFixed(2)} جنيه
                        </span>
                     </div>
                  </div>
               </div>
            
            {/* Dedicated Professional Thank You Footer */}
            <div className="mt-12 text-center text-slate-400 text-[10px] border-t border-slate-200/60 pt-6 print:block">
               <p className="font-bold">نشكر ثقتكم في {hospitalName} الطبي لخدمة ورعاية حيوانكم الأليف.</p>
               <p className="text-[9px] mt-1 font-medium text-slate-300 font-mono">Powered by Vita Veterinary Management Clinic Software Suite</p>
            </div>
         </div>

         <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 print:hidden">
           <button 
             onClick={onClose}
             className="px-5 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-xs"
           >
             إغلاق
           </button>
           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors text-base"
           >
             <Printer size={18} /> تأكيد الطباعة
           </button>
         </div>
      </div>
    </div>
  );
}
