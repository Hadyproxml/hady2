import React, { useState } from 'react';
import { ServiceItem, MedicationItem, Clinic, UserAccount } from '../types';
import { Settings2, Plus, Edit2, Trash2, DollarSign, Pill, Scissors, Building2, User } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ServicesSectionProps {
  services: ServiceItem[];
  medications: MedicationItem[];
  setServices: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  setMedications: React.Dispatch<React.SetStateAction<MedicationItem[]>>;
  clinics: Clinic[];
  setClinics: React.Dispatch<React.SetStateAction<Clinic[]>>;
  currentUser: UserAccount;
}

export default function ServicesSection({ services, medications, setServices, setMedications, clinics, setClinics, currentUser }: ServicesSectionProps) {
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  
  const [newMedName, setNewMedName] = useState('');
  const [newMedPrice, setNewMedPrice] = useState('');

  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [editMedName, setEditMedName] = useState('');
  const [editMedPrice, setEditMedPrice] = useState('');

  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicDoctor, setNewClinicDoctor] = useState('');

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServicePrice, setEditServicePrice] = useState('');

  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [editClinicName, setEditClinicName] = useState('');
  const [editClinicDoctor, setEditClinicDoctor] = useState('');

  const [activeTab, setActiveTab] = useState<'SERVICES' | 'MEDS' | 'CLINICS'>('SERVICES');

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

  const addService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const price = parseFloat(newServicePrice) || 0;
    setServices([...services, { id: crypto.randomUUID(), name: newServiceName, price }]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const saveEditedService = (id: string) => {
    if (!editServiceName.trim()) return;
    const price = parseFloat(editServicePrice) || 0;
    setServices(services.map(s => s.id === id ? { ...s, name: editServiceName, price } : s));
    setEditingServiceId(null);
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
  };

  const deleteService = (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;
    setDeleteModal({
      isOpen: true,
      title: 'حذف الخدمة الطبية',
      message: `هل أنت متأكد من حذف الخدمة "${service.name}" من الدليل؟ لن تتمكن العيادات من تحديد هذه الخدمة في الزيارات الجديدة بعد الآن.`,
      onConfirm: () => {
        setServices(services.filter(s => s.id !== id));
      }
    });
  };

  const addMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    const price = parseFloat(newMedPrice) || 0;
    setMedications([...medications, { id: crypto.randomUUID(), name: newMedName, price }]);
    setNewMedName('');
    setNewMedPrice('');
  };

  const saveEditedMedication = (id: string) => {
    if (!editMedName.trim()) return;
    const price = parseFloat(editMedPrice) || 0;
    setMedications(medications.map(m => m.id === id ? { ...m, name: editMedName, price } : m));
    setEditingMedicationId(null);
  };

  const cancelEditMedication = () => {
    setEditingMedicationId(null);
  };

  const deleteMedication = (id: string) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    setDeleteModal({
      isOpen: true,
      title: 'حذف دواء من الصيدلية',
      message: `هل أنت متأكد من حذف الدواء "${med.name}" من الصيدلية؟ لن يتمكن الأطباء من وصف هذا الدواء في الزيارات الجديدة بعد الآن.`,
      onConfirm: () => {
        setMedications(medications.filter(m => m.id !== id));
      }
    });
  };

  const addClinic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim() || !newClinicDoctor.trim()) return;
    setClinics([...clinics, { id: crypto.randomUUID(), name: newClinicName, doctorName: newClinicDoctor }]);
    setNewClinicName('');
    setNewClinicDoctor('');
  };

  const saveEditedClinic = (id: string) => {
    if (!editClinicName.trim() || !editClinicDoctor.trim()) return;
    setClinics(clinics.map(c => c.id === id ? { ...c, name: editClinicName, doctorName: editClinicDoctor } : c));
    setEditingClinicId(null);
  };

  const cancelEditClinic = () => {
    setEditingClinicId(null);
  };

  const deleteClinic = (id: string) => {
    const clinic = clinics.find(c => c.id === id);
    if (!clinic) return;
    setDeleteModal({
      isOpen: true,
      title: 'حذف العيادة / القسم',
      message: `هل أنت متأكد من حذف القسم "${clinic.name}" والطبيب المسؤول "${clinic.doctorName}"؟ لن يظهر هذا القسم في خيارات تسجيل الزيارات بعد الآن.`,
      onConfirm: () => {
        setClinics(clinics.filter(c => c.id !== id));
      }
    });
  };

  return (
    <div className="max-w-full w-full p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
            <Settings2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">إدارة الموارد</h1>
            <p className="text-slate-500 font-bold mt-0.5 text-xs">التحكم في الخدمات والأدوية والعيادات النشطة</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center min-w-[100px]">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">الخدمات</span>
             <span className="text-lg font-black text-indigo-600 leading-none">{services.length}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center min-w-[100px]">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">الأدوية</span>
             <span className="text-lg font-black text-purple-600 leading-none">{medications.length}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar gap-2 p-1 bg-slate-100/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`px-5 py-2 font-bold transition-all rounded-md flex items-center gap-2 whitespace-nowrap text-xs active:scale-95 ${activeTab === 'SERVICES' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Scissors size={16} />
          دليل الخدمات
        </button>
        <button
          onClick={() => setActiveTab('MEDS')}
          className={`px-5 py-2 font-bold transition-all rounded-md flex items-center gap-2 whitespace-nowrap text-xs active:scale-95 ${activeTab === 'MEDS' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Pill size={16} />
          مخزون الأدوية
        </button>
        <button
          onClick={() => setActiveTab('CLINICS')}
          className={`px-5 py-2 font-bold transition-all rounded-md flex items-center gap-2 whitespace-nowrap text-xs active:scale-95 ${activeTab === 'CLINICS' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Building2 size={16} />
          إدارة العيادات
        </button>
      </div>

      {activeTab === 'SERVICES' && (
        <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/80 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 transition-all"></div>
          
          {currentUser.permissions.canEdit && (
            <form onSubmit={addService} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 items-end shadow-inner">
              <div className="md:col-span-7">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">إضافة خدمة طبية جديدة</label>
                <input 
                  type="text" 
                  required
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  placeholder="مثال: كشف سونار متقدم"
                  className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-indigo-500 font-bold text-base shadow-sm transition-all"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">السعر المستحق</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={newServicePrice}
                    onChange={e => setNewServicePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-indigo-500 text-center font-black text-base shadow-sm transition-all"
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">جنيه</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-base active:scale-95">
                  <Plus size={20} /> إضافة
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {services.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 col-span-full">
                 <p className="font-black text-slate-400 text-base">لا توجد خدمات طبية مسجلة حالياً</p>
              </div>
            ) : (
              services.map(service => (
                <div key={service.id} className="p-5 bg-white/50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/30 rounded-2xl transition-all group/item overflow-hidden relative h-full flex flex-col justify-center">
                  {editingServiceId === service.id ? (
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={editServiceName}
                        onChange={e => setEditServiceName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-indigo-200 rounded-lg outline-none font-black text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={editServicePrice}
                            onChange={e => setEditServicePrice(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-indigo-200 rounded-lg outline-none text-center font-black text-sm"
                            dir="ltr"
                          />
                        </div>
                        <button onClick={() => saveEditedService(service.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-black text-xs transition-all active:scale-95">حفظ</button>
                        <button onClick={cancelEditService} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-lg font-black text-xs transition-all active:scale-95">إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                           <Scissors size={20} />
                         </div>
                         <div className="font-black text-slate-800 text-lg">{service.name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-indigo-700 font-black text-xl tracking-tighter bg-indigo-50/50 px-4 py-1.5 rounded-xl border border-indigo-100">{service.price.toFixed(2)} <span className="text-[10px] font-bold">جنيه</span></span>
                        <div className="flex items-center gap-2">
                          {currentUser.permissions.canEdit && (
                            <button 
                              onClick={() => {
                                setEditingServiceId(service.id);
                                setEditServiceName(service.name);
                                setEditServicePrice(service.price.toString());
                              }} 
                              className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {currentUser.permissions.canDelete && (
                            <button onClick={() => deleteService(service.id)} className="text-slate-400 hover:text-red-500 transition-all p-2 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-lg">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}


      {activeTab === 'MEDS' && (
        <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/80 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-purple-600 transition-all"></div>
          
          {currentUser.permissions.canEdit && (
            <form onSubmit={addMedication} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 items-end shadow-inner">
              <div className="md:col-span-7">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">اسم الصنف الدوائي</label>
                <input 
                  type="text" 
                  required
                  value={newMedName}
                  onChange={e => setNewMedName(e.target.value)}
                  placeholder="مثال: مضاد حيوي واسع المدى"
                  className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-purple-500 font-bold text-base shadow-sm transition-all"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">سعر البيع</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={newMedPrice}
                    onChange={e => setNewMedPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-purple-500 text-center font-black text-base shadow-sm transition-all"
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">جنيه</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 rounded-xl shadow-xl shadow-purple-100 transition-all flex items-center justify-center gap-2 text-base active:scale-95">
                  <Plus size={20} /> إضافة
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {medications.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 col-span-full">
                 <p className="font-black text-slate-400 text-base">لم يتم إضافة أدوية لدليل الصيدلية بعد</p>
              </div>
            ) : (
             medications.map(med => (
                <div key={med.id} className="p-5 bg-white/50 border border-slate-100 hover:border-purple-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/30 rounded-2xl transition-all group/item overflow-hidden relative h-full flex flex-col justify-center">
                  {editingMedicationId === med.id ? (
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={editMedName}
                        onChange={e => setEditMedName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-purple-200 rounded-lg outline-none font-black text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={editMedPrice}
                            onChange={e => setEditMedPrice(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-purple-200 rounded-lg outline-none text-center font-black text-sm"
                            dir="ltr"
                          />
                        </div>
                        <button onClick={() => saveEditedMedication(med.id)} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-black text-xs transition-all active:scale-95">حفظ</button>
                        <button onClick={cancelEditMedication} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-lg font-black text-xs transition-all active:scale-95">إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
                           <Pill size={20} />
                         </div>
                         <div className="font-black text-slate-800 text-lg">{med.name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-purple-700 font-black text-xl tracking-tighter bg-purple-50/50 px-4 py-1.5 rounded-xl border border-purple-100">{med.price.toFixed(2)} <span className="text-[10px] font-bold">جنيه</span></span>
                        <div className="flex items-center gap-2">
                          {currentUser.permissions.canEdit && (
                            <button 
                              onClick={() => {
                                setEditingMedicationId(med.id);
                                setEditMedName(med.name);
                                setEditMedPrice(med.price.toString());
                              }} 
                              className="text-slate-400 hover:text-purple-600 transition-all p-2 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-lg"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {currentUser.permissions.canDelete && (
                            <button onClick={() => deleteMedication(med.id)} className="text-slate-400 hover:text-red-500 transition-all p-2 bg-white rounded-lg border border-slate-100 shadow-sm hover:shadow-lg">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === 'CLINICS' && (
        <section className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/80 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-2 h-full bg-teal-600 transition-all"></div>
          
          {currentUser.permissions.canEdit && (
            <form onSubmit={addClinic} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100 items-end shadow-inner">
              <div className="md:col-span-5">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">مسمى العيادة</label>
                <input 
                  type="text" 
                  required
                  value={newClinicName}
                  onChange={e => setNewClinicName(e.target.value)}
                  placeholder="مثال: عيادة الباطنة والجراحة"
                  className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-teal-500 font-bold text-base shadow-sm transition-all"
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">الطبيب المشرف</label>
                <input 
                  type="text" 
                  required
                  value={newClinicDoctor}
                  onChange={e => setNewClinicDoctor(e.target.value)}
                  placeholder="مثال: د. أحمد فؤاد"
                  className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-teal-500 font-bold text-base shadow-sm transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3 rounded-xl shadow-xl shadow-teal-100 transition-all flex items-center justify-center gap-2 text-base active:scale-95">
                  <Plus size={20} /> إضافة
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {clinics.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 col-span-full">
                 <p className="font-black text-slate-400 text-base">لم يتم تسجيل أية عيادات أو أطباء</p>
              </div>
            ) : (
              clinics.map(clinic => (
                <div key={clinic.id} className="p-5 bg-white/50 border border-slate-100 hover:border-teal-200 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/30 rounded-[1.5rem] transition-all group/item overflow-hidden relative flex flex-col justify-between h-full min-h-[160px]">
                  {editingClinicId === clinic.id ? (
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={editClinicName}
                        onChange={e => setEditClinicName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-teal-200 rounded-lg outline-none font-black text-sm"
                      />
                      <input 
                        type="text" 
                        value={editClinicDoctor}
                        onChange={e => setEditClinicDoctor(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-teal-200 rounded-lg outline-none font-black text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveEditedClinic(clinic.id)} className="flex-grow bg-teal-600 text-white py-2 rounded-lg font-black text-xs transition-all">حفظ</button>
                        <button onClick={cancelEditClinic} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-black text-xs transition-all">إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                         <div className="bg-teal-50 p-3 rounded-xl text-teal-600 border border-teal-100 mb-4">
                            <Building2 size={24} />
                         </div>
                         <div className="flex gap-2">
                            {currentUser.permissions.canEdit && (
                              <button onClick={() => { setEditingClinicId(clinic.id); setEditClinicName(clinic.name); setEditClinicDoctor(clinic.doctorName); }} className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-teal-600">
                                <Edit2 size={16} />
                              </button>
                            )}
                            {currentUser.permissions.canDelete && (
                              <button onClick={() => deleteClinic(clinic.id)} className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-red-500">
                                <Trash2 size={16} />
                              </button>
                            )}
                         </div>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-xl mb-1">{clinic.name}</h3>
                        <p className="text-slate-500 font-bold flex items-center gap-1.5 text-sm">
                          <User size={14} className="text-teal-500" /> {clinic.doctorName}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
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
