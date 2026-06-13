import React, { useState } from 'react';
import { Visit, Clinic } from '../types';
import { CreditCard, CheckCircle, Printer, User, Clock, Wallet, History, FileText, ChevronLeft } from 'lucide-react';
import InvoiceModal from './InvoiceModal';

interface PaymentSectionProps {
  visits: Visit[];
  updateVisit: (visitId: string, updates: Partial<Visit>) => void;
  clinics: Clinic[];
  autoPrintInvoice: boolean;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
}

export default function PaymentSection({ 
  visits, 
  updateVisit, 
  clinics, 
  autoPrintInvoice,
  hospitalName,
  hospitalAddress,
  hospitalPhone
}: PaymentSectionProps) {
  const awaitingVisits = visits.filter(v => v.status === 'AWAITING_PAYMENT');
  const [printingVisit, setPrintingVisit] = useState<Visit | null>(null);

  const totalAwaiting = awaitingVisits.reduce((acc, v) => {
    const services = (v.services || []).reduce((sAcc, s) => sAcc + s.price, 0);
    const meds = (v.medications || []).reduce((mAcc, m) => mAcc + m.price, 0);
    return acc + services + meds;
  }, 0);

  const handleConfirmPayment = (id: string, visit: Visit) => {
    updateVisit(id, { status: 'COMPLETED' });
    if (autoPrintInvoice) {
      setPrintingVisit(visit);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const calculateTotal = (visit: Visit) => {
    const servicesTotal = (visit.services || []).reduce((acc, s) => acc + s.price, 0);
    const medsTotal = (visit.medications || []).reduce((acc, m) => acc + m.price, 0);
    return servicesTotal + medsTotal;
  };

  return (
    <div className="max-w-full w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Financial Summary Header */}
      <div className="bg-[#0f2e46] rounded-[1.5rem] p-8 text-white shadow-xl shadow-slate-300 relative overflow-hidden">
         <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-2xl font-black tracking-tight mb-2 flex items-center gap-3">
                  <Wallet className="text-emerald-400" size={32} />
                  إدارة الموقف المالي
               </h1>
               <p className="text-white/50 font-bold text-sm max-w-lg leading-relaxed">
                  متابعة عمليات التحصيل المالي للفواتير المعلقة.
               </p>
            </div>
            
            <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/20 flex flex-col items-center min-w-[160px] group hover:bg-white/15 transition-all">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl font-black text-white">{totalAwaiting.toLocaleString()}</span>
                      <span className="text-xs font-black text-white/40">جنيه</span>
                   </div>
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">إجمالي مستحق</span>
                </div>
                <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/20 flex flex-col items-center min-w-[140px] group hover:bg-white/15 transition-all">
                   <span className="text-3xl font-black text-emerald-400 leading-none">{awaitingVisits.length}</span>
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 opacity-40 text-emerald-200">فواتير معلقة</span>
                </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {awaitingVisits.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center col-span-full">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
               <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">النظام المالي مُحدث</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose text-center max-w-md">لا توجد مطالبات مالية عالقة حالياً.</p>
          </div>
        ) : (
          awaitingVisits.map((visit, index) => {
            const total = calculateTotal(visit);
            return (
              <div key={visit.id} className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 p-8 flex flex-col group relative overflow-hidden hover:border-emerald-200 transition-all">
                
                <div className="flex items-start justify-between mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                         <User size={22} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-slate-800 leading-none mb-1">{visit.pet.name}</h3>
                         <div className="flex gap-1.5">
                           <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{visit.pet.species}</span>
                           <span className="text-[9px] font-black text-slate-300 uppercase font-mono tracking-widest">#{visit.id.slice(-6).toUpperCase()}</span>
                         </div>
                      </div>
                   </div>
                   <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg flex items-center gap-1.5 font-black text-[9px]">
                      <Clock size={12} /> انتظار
                   </div>
                </div>

                <div className="space-y-4 flex-grow">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">المالك</span>
                      <span className="text-xs font-black text-slate-600 mb-0.5">{visit.owner.fullName}</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono" dir="ltr">{visit.owner.phone}</span>
                   </div>

                   <div className="bg-[#f8fafc] p-5 rounded-[1.5rem] border-2 border-slate-50 space-y-3">
                      <div className="flex items-center justify-between group/line">
                         <span className="text-[10px] font-black text-slate-500">الخدمات الطبية:</span>
                         <span className="text-xs font-black text-slate-700">{(visit.services || []).reduce((acc, s) => acc + s.price, 0)} جنيه</span>
                      </div>
                      <div className="flex items-center justify-between group/line">
                         <span className="text-[10px] font-black text-slate-500">الصيدلية:</span>
                         <span className="text-xs font-black text-slate-700">{(visit.medications || []).reduce((acc, m) => acc + m.price, 0)} جنيه</span>
                      </div>
 
                      <div className="pt-3 mt-3 border-t-2 border-dashed border-slate-200 flex items-end justify-between">
                         <span className="text-base font-black text-[#0f2e46]">الإجمالي:</span>
                         <div className="text-right">
                           <span className="text-2xl font-black text-[#0f2e46]">{total.toLocaleString()}</span>
                           <span className="text-[11px] font-black text-slate-400 mr-1">جنيه</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setPrintingVisit(visit)}
                    className="flex items-center justify-center gap-2 p-4 bg-[#f8fafc] hover:bg-slate-100 text-slate-400 rounded-xl transition-all border-2 border-slate-50"
                    title="معاينة"
                  >
                    <Printer size={18} />
                  </button>
                  <button 
                    onClick={() => handleConfirmPayment(visit.id, visit)}
                    className="flex-grow bg-emerald-600 hover:bg-slate-900 text-white py-4 rounded-xl font-black text-base shadow-xl shadow-emerald-100 transition-all transform active:scale-95 flex items-center justify-center gap-2.5"
                  >
                     تحصيل الفاتورة
                    <CheckCircle size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <InvoiceModal 
        visit={printingVisit} 
        onClose={() => setPrintingVisit(null)} 
        clinics={clinics} 
        hospitalName={hospitalName}
        hospitalAddress={hospitalAddress}
        hospitalPhone={hospitalPhone}
      />
    </div>
  );
}
