import React, { useState } from 'react';
import { Search, User, Edit, Plus, History, ChevronLeft, Save, FileText, ChevronDown, ChevronUp, Activity, Printer, X, Clock, Download, Trash2 } from 'lucide-react';
import { ClientRecord, Visit, Owner, RegisteredPet, Clinic, UserAccount } from '../types';
import InvoiceModal from './InvoiceModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface SearchSectionProps {
  clients: ClientRecord[];
  allVisits: Visit[];
  updateClient: (clientId: string, updates: Partial<ClientRecord>) => void;
  addNewVisit: (clientId: string, petId: string, clinicId: string | undefined, condition: string) => void;
  clinics: Clinic[];
  currentUser: UserAccount;
  deleteClient: (clientId: string) => void;
  deleteVisit: (visitId: string) => void;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
}

export default function SearchSection({ 
  clients, 
  allVisits, 
  updateClient, 
  addNewVisit, 
  clinics, 
  currentUser, 
  deleteClient,
  deleteVisit,
  hospitalName,
  hospitalAddress,
  hospitalPhone
}: SearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [printingVisit, setPrintingVisit] = useState<Visit | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [editingPets, setEditingPets] = useState<RegisteredPet[]>([]);

  const [showNewVisitForPet, setShowNewVisitForPet] = useState<string | null>(null);
  const [newVisitCondition, setNewVisitCondition] = useState('');
  const [newVisitClinic, setNewVisitClinic] = useState('');

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

  const filteredClients = clients.filter(c => 
    c.owner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.owner.phone.includes(searchQuery)
  );

  const openClientProfile = (client: ClientRecord) => {
    setSelectedClient(client);
    setEditingOwner({ ...client.owner });
    setEditingPets([...client.pets.map(p => ({ ...p }))]);
    setShowNewVisitForPet(null);
    setIsEditingProfile(false);
    setExpandedVisitId(null);
  };

  const handleSaveProfile = () => {
    if (selectedClient && editingOwner) {
      updateClient(selectedClient.id, {
        owner: editingOwner,
        pets: editingPets
      });
      setSelectedClient({
        ...selectedClient,
        owner: editingOwner,
        pets: editingPets
      });
      setIsEditingProfile(false);
    }
  };

  const handleAddPetToProfile = () => {
    setEditingPets([
      ...editingPets,
      { id: crypto.randomUUID(), name: '', species: '', age: '' }
    ]);
  };

  const submitNewVisit = () => {
    if (selectedClient && showNewVisitForPet && newVisitCondition) {
      addNewVisit(selectedClient.id, showNewVisitForPet, newVisitClinic || undefined, newVisitCondition);
      setShowNewVisitForPet(null);
      setNewVisitCondition('');
      setNewVisitClinic('');
    }
  };

  if (selectedClient && editingOwner) {
    const clientVisits = allVisits.filter(v => v.owner.phone === selectedClient.owner.phone).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="max-w-full w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedClient(null)}
            className="flex items-center gap-2.5 text-slate-400 hover:text-slate-900 transition-all font-black"
          >
            <ChevronLeft size={20} className="text-indigo-600" />
            العودة للبحث
          </button>
          
          <div className="flex items-center gap-3">
            {!isEditingProfile ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="px-6 py-2 bg-white hover:bg-slate-50 text-[#0f2e46] rounded-xl border-2 border-slate-100 font-extrabold text-xs transition-all flex items-center gap-2.5 shadow-md shadow-slate-100"
                >
                  <Edit size={16} />
                  تعديل
                </button>
                {currentUser.permissions.canDeleteClientRecord && (
                  <button 
                    onClick={() => {
                      setDeleteModal({
                        isOpen: true,
                        title: 'حذف سجل ملف المراجع بالكامل',
                        message: `هل أنت متأكد من حذف السجل الطبي الكامل والبيانات الخاصة بـ "${selectedClient.owner.fullName}"؟ سيتم حذف هذا السجل وجميع الحيوانات والزيارات والفواتير والملفات التابعة له بشكل نهائي ودائم.`,
                        onConfirm: () => {
                          deleteClient(selectedClient.id);
                          setSelectedClient(null);
                        }
                      });
                    }}
                    className="px-6 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-extrabold text-xs transition-all"
                  >
                    حذف الملف بالكامل
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl font-extrabold text-xs hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="px-8 py-2 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-extrabold text-xs shadow-xl shadow-indigo-100 transition-all"
                >
                  <Save size={16} className="inline ml-1.5" />
                  حفظ التغييرات
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Client Bio Sidebar */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-white rounded-[1.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="bg-[#0f2e46] p-8 flex flex-col items-center">
                   <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-white mb-4 backdrop-blur-xl border border-white/20">
                      <User size={40} />
                   </div>
                   <h3 className="text-xl font-black text-white mb-1">{selectedClient.owner.fullName}</h3>
                   <span className="text-white/40 font-bold font-mono text-sm" dir="ltr">{selectedClient.owner.phone}</span>
                </div>

                <div className="p-8 space-y-6">
                   {!isEditingProfile ? (
                     <div className="space-y-4">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block border-b border-slate-50 pb-3 mb-3">الحيوانات المسجلة</span>
                        <div className="space-y-3">
                          {selectedClient.pets.map(pet => (
                            <div key={pet.id} className="p-5 bg-[#f8fafc] rounded-2xl border-2 border-slate-50 relative group transition-all hover:border-indigo-100">
                               <div className="flex items-center justify-between mb-3">
                                  <div>
                                     <h4 className="text-base font-black text-[#0f2e46]">{pet.name}</h4>
                                     <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest">{pet.species} • {pet.age}</span>
                                  </div>
                                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                     <Activity size={18} />
                                  </div>
                               </div>
                               <button 
                                 onClick={() => {
                                   setShowNewVisitForPet(pet.id);
                                   setNewVisitCondition('');
                                   setNewVisitClinic('');
                                 }}
                                 className="w-full py-2.5 bg-white hover:bg-indigo-600 hover:text-white text-[#0f2e46] rounded-lg font-black text-[10px] border-2 border-slate-100 hover:border-indigo-600 transition-all"
                               >
                                 زيارة كشف جديدة
                               </button>
                            </div>
                          ))}
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                        <div className="space-y-3">
                           <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">الاسم</label>
                              <input 
                                type="text" 
                                value={editingOwner.fullName}
                                onChange={(e) => setEditingOwner({...editingOwner, fullName: e.target.value})}
                                className="px-5 py-2.5 bg-[#f8fafc] border-2 border-slate-50 rounded-xl font-bold text-xs outline-none focus:border-indigo-600"
                              />
                           </div>
                           <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest">الهاتف</label>
                              <input 
                                type="text" 
                                value={editingOwner.phone}
                                onChange={(e) => setEditingOwner({...editingOwner, phone: e.target.value})}
                                className="px-5 py-2.5 bg-[#f8fafc] border-2 border-slate-50 rounded-xl font-bold text-xs outline-none focus:border-indigo-600 font-mono"
                                dir="ltr"
                              />
                           </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                           <div className="flex items-center justify-between mb-3">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">الحيوانات</span>
                              <button onClick={handleAddPetToProfile} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg hover:bg-indigo-100 transition-all"><Plus size={16} /></button>
                           </div>
                           <div className="space-y-3">
                             {editingPets.map((pet, idx) => (
                               <div key={pet.id} className="p-4 bg-[#f8fafc] rounded-xl border-2 border-slate-50 relative pt-8">
                                  <button onClick={() => setEditingPets(editingPets.filter((_, i) => i !== idx))} className="absolute top-2 left-2 text-slate-300 hover:text-red-500"><X size={14} /></button>
                                  <input placeholder="الاسم" value={pet.name} onChange={(e) => { const updated = [...editingPets]; updated[idx].name = e.target.value; setEditingPets(updated); }} className="w-full mb-2 px-3 py-1.5 border border-slate-100 rounded-lg outline-none font-bold text-[11px]" />
                                  <div className="grid grid-cols-2 gap-2">
                                     <input placeholder="النوع" value={pet.species} onChange={(e) => { const updated = [...editingPets]; updated[idx].species = e.target.value; setEditingPets(updated); }} className="px-3 py-1.5 border border-slate-100 rounded-lg outline-none font-bold text-[10px]" />
                                     <input placeholder="العمر" value={pet.age} onChange={(e) => { const updated = [...editingPets]; updated[idx].age = e.target.value; setEditingPets(updated); }} className="px-3 py-1.5 border border-slate-100 rounded-lg outline-none font-bold text-[10px]" />
                                  </div>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Records Main Area */}
          <div className="lg:col-span-8 space-y-6">
             <div className="bg-white rounded-[1.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/40 p-8 min-h-[600px]">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                   <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                      <History size={24} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-[#0f2e46] tracking-tight">السجل الطبي</h2>
                      <p className="text-slate-400 font-bold text-xs">التاريخ الكامل لكافة الزيارات السابقة</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {clientVisits.length === 0 ? (
                     <div className="py-16 text-center bg-[#f8fafc] rounded-[2rem] border-2 border-dashed border-slate-200">
                        <FileText size={40} className="text-slate-200 mx-auto mb-4" />
                        <h4 className="text-lg font-black text-slate-400">لا توجد زيارات</h4>
                        <p className="text-slate-300 font-bold text-[9px] uppercase tracking-[0.2em] mt-1">يظهر السجل هنا فور اكتمال أول زيارة</p>
                     </div>
                   ) : (
                     clientVisits.map((visit) => (
                       <div key={visit.id} className="bg-white border-2 border-slate-100 rounded-[1.5rem] overflow-hidden transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50">
                          <div onClick={() => setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id)} className="p-6 flex items-center justify-between cursor-pointer group">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 transition-all">
                                   {visit.pet.name.charAt(0)}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2.5 mb-0.5">
                                      <h4 className="text-lg font-black text-[#0f2e46]">{visit.pet.name}</h4>
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-black text-[8px] uppercase tracking-wider">{visit.pet.species}</span>
                                   </div>
                                   <div className="flex items-center gap-3 text-slate-400 font-extrabold text-[9px] uppercase tracking-widest">
                                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md"><Clock size={12} className="text-indigo-400" /> {new Date(visit.createdAt).toLocaleDateString('ar-EG')}</span>
                                      {clinics.find(cl => cl.id === visit.clinicId) && (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md"><Activity size={12} className="text-purple-400" /> {clinics.find(cl => cl.id === visit.clinicId)?.name}</span>
                                      )}
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                  visit.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                   {visit.status === 'COMPLETED' ? 'مكتملة' : 'معلقة'}
                                </span>
                                {currentUser.permissions.canDeleteClientRecord && (
                                   <button 
                                      type="button" 
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         setDeleteModal({
                                            isOpen: true,
                                            title: 'حذف زيارة طبية من السجل',
                                            message: `هل أنت متأكد من حذف هذه الزيارة الخاصة بـ "${visit.pet.name}" بتاريخ ${new Date(visit.createdAt).toLocaleDateString('ar-EG')}؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف الفاتورة وكافة الخدمات والمرفقات والقرارات الطبية التابعة لهذه الزيارة نهائياً.`,
                                            onConfirm: () => {
                                               deleteVisit(visit.id);
                                            }
                                         });
                                      }}
                                      className="p-1.5 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="حذف هذه الزيارة"
                                   >
                                      <Trash2 size={16} />
                                   </button>
                                )}
                                {expandedVisitId === visit.id ? <ChevronUp size={18} className="text-slate-300" /> : <ChevronDown size={18} className="text-slate-300" />}
                             </div>
                          </div>

                          {expandedVisitId === visit.id && (
                             <div className="px-8 pb-8 pt-3 border-t-2 border-dashed border-slate-100 bg-[#f8fafc]/50">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                   <div className="md:col-span-8 space-y-4">
                                      <div>
                                         <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2">التشخيص الطبي</span>
                                         <div className="bg-white p-6 rounded-2xl border-2 border-slate-50 shadow-sm text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {visit.doctorNotes || 'لا توجد ملاحظات تسجيلية.'}
                                         </div>
                                       </div>

                                       {/* المرفقات والملفات الطبية */}
                                       {visit.attachments && visit.attachments.length > 0 && (
                                         <div className="mt-5 space-y-2">
                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] block">الملفات والمرفقات الطبية (أشعة / تحاليل / تقارير)</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                               {visit.attachments.map(att => {
                                                  const isImage = att.type.startsWith('image/');
                                                  const linkedService = visit.services?.find(s => s.id === att.serviceId);
                                                  
                                                  return (
                                                     <div key={att.id} className="p-3 bg-white rounded-2xl border border-slate-150 shadow-sm flex items-start gap-3 relative group hover:border-[#0f2e46]/20 transition-all">
                                                        {isImage ? (
                                                           <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 shrink-0 bg-slate-50">
                                                              <img src={att.url} alt={att.name} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxImage(att.url)} />
                                                           </div>
                                                        ) : (
                                                           <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                              <FileText size={16} />
                                                           </div>
                                                        )}
                                                        
                                                        <div className="space-y-0.5 pr-0.5 truncate flex-1 min-w-0">
                                                           <h5 className="font-black text-slate-800 text-[11px] truncate leading-tight cursor-pointer hover:text-indigo-600 flex items-center gap-1.5 font-sans" title={att.name} onClick={() => {
                                                              const w = window.open();
                                                              if (w) {
                                                                 w.document.write(`<iframe src="${att.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                              }
                                                           }}>
                                                              {att.name}
                                                           </h5>
                                                           <div className="flex flex-wrap items-center gap-x-2 text-[8px] text-slate-400">
                                                              <span>{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                                                              {linkedService && (
                                                                 <span className="px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                                                    {linkedService.name}
                                                                 </span>
                                                              )}
                                                           </div>
                                                        </div>
                                                        
                                                        <a href={att.url} download={att.name} className="text-slate-350 hover:text-[#0f2e46] transition-all p-1.5 shrink-0 self-center" title="تحميل">
                                                           <Download size={12} />
                                                        </a>
                                                     </div>
                                                  );
                                               })}
                                            </div>
                                         </div>
                                       )}
                                   </div>
                                   <div className="md:col-span-4 space-y-4">
                                      <div>
                                         <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em] block mb-2">الأدوية</span>
                                         {visit.medications?.length ? (
                                           <div className="space-y-2">
                                             {visit.medications.map((m, i) => (
                                               <div key={i} className="bg-white p-3 rounded-lg border-2 border-slate-50 shadow-sm">
                                                  <h5 className="font-black text-slate-800 text-[11px]">{m.name}</h5>
                                                  <p className="text-[9px] font-extrabold text-slate-400 mt-0.5">{m.instructions}</p>
                                               </div>
                                             ))}
                                           </div>
                                         ) : <p className="text-[9px] font-bold text-slate-300 italic">لا توجد أدوية.</p>}
                                      </div>
                                      <button onClick={() => setPrintingVisit(visit)} className="w-full py-3 bg-[#0f2e46] hover:bg-slate-900 text-white rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2.5">
                                         <Printer size={16} /> طباعة
                                      </button>
                                   </div>
                                </div>
                             </div>
                          )}
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        </div>

        {showNewVisitForPet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowNewVisitForPet(null)}></div>
             <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden border-2 border-slate-100">
                <div className="bg-[#0f2e46] p-8 flex items-center justify-between">
                   <h3 className="text-xl font-black text-white flex items-center gap-3"><Plus className="text-emerald-400" /> إضافة زيارة</h3>
                   <button onClick={() => setShowNewVisitForPet(null)} className="text-white/40 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="p-5 bg-[#f8fafc] rounded-xl border-2 border-slate-50 flex items-center justify-between">
                         <div>
                            <span className="text-[9px] font-black text-slate-300 uppercase">المريض</span>
                            <h4 className="text-lg font-black text-[#0f2e46]">{selectedClient.pets.find(p => p.id === showNewVisitForPet)?.name}</h4>
                         </div>
                         <Activity className="text-indigo-600" />
                      </div>
                      <div className="space-y-3">
                        <select value={newVisitClinic} onChange={(e) => setNewVisitClinic(e.target.value)} className="w-full px-6 py-4 bg-[#f8fafc] border-2 border-slate-50 rounded-xl font-black text-xs outline-none focus:border-indigo-600">
                           <option value="">-- القسم (اختياري) --</option>
                           {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <textarea value={newVisitCondition} onChange={(e) => setNewVisitCondition(e.target.value)} placeholder="شرح الحالة المبدئي..." className="w-full px-6 py-4 bg-[#f8fafc] border-2 border-slate-50 rounded-xl font-black text-xs outline-none focus:border-indigo-600 resize-none" rows={3} />
                      </div>
                   </div>
                   <div className="flex gap-3 pt-3">
                      <button onClick={() => setShowNewVisitForPet(null)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-black text-base transition-all">تجاهل</button>
                      <button 
                         onClick={submitNewVisit} 
                         disabled={!newVisitCondition}
                         className="flex-[2] py-4 bg-[#0f2e46] hover:bg-slate-900 text-white rounded-xl font-black text-base shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all font-sans"
                      >
                         تسجيل الزيارة
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        <InvoiceModal 
          visit={printingVisit} 
          onClose={() => setPrintingVisit(null)} 
          clinics={clinics} 
          hospitalName={hospitalName}
          hospitalAddress={hospitalAddress}
          hospitalPhone={hospitalPhone}
        />

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

  return (
    <div className="max-w-full w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
         <div className="inline-flex items-center gap-3 px-5 py-1.5 bg-indigo-50 text-indigo-600 rounded-full font-black text-[9px] uppercase tracking-[0.2em] mb-2">
            Archives
         </div>
         <h1 className="text-3xl font-black text-[#0f2e46] tracking-tight">السجلات والأرشيف</h1>
         <p className="text-slate-400 font-bold text-base max-w-xl mx-auto leading-relaxed">ابحث عن العميل للوصول للسجل الطبي</p>
      </div>

      <div className="max-w-5xl mx-auto relative group">
         <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            <Search className="text-slate-200 group-focus-within:text-indigo-600 transition-all" size={24} />
         </div>
         <input 
           type="text" 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           placeholder="ابحث بالاسم أو الهاتف..."
           className="w-full pr-20 pl-10 py-6 bg-white border-2 border-slate-100 rounded-[2rem] font-black text-lg outline-none focus:border-indigo-600 shadow-xl shadow-slate-200/50 transition-all placeholder:text-slate-200"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-[#f8fafc] rounded-[2rem] border-2 border-dashed border-slate-100">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Search size={32} className="text-slate-200" />
             </div>
             <p className="text-slate-300 font-black text-base uppercase tracking-widest">لا توجد نتائج</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id}
              onClick={() => openClientProfile(client)}
              className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden shadow-lg shadow-slate-200/30 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50"
            >
              <div className="w-16 h-16 bg-[#f8fafc] rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-inner ring-4 ring-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <User size={32} />
              </div>
              <h3 className="text-lg font-black text-[#0f2e46] mb-1">{client.owner.fullName}</h3>
              <p className="text-slate-400 font-mono font-bold text-[10px]" dir="ltr">{client.owner.phone}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-50 w-full flex flex-wrap justify-center gap-1.5">
                {client.pets.map(pet => (
                   <span key={pet.id} className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">{pet.name}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {lightboxImage && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setLightboxImage(null)}></div>
            <div className="relative max-w-4xl max-h-[85vh] z-[210] overflow-hidden rounded-2xl bg-black flex items-center justify-center border border-white/10 animate-in zoom-in duration-300">
               <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-full p-2 hover:scale-105 transition-all">
                  <X size={20} />
               </button>
               <img src={lightboxImage} alt="lightbox-preview" className="max-w-full max-h-[80vh] object-contain" />
            </div>
         </div>
      )}

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
