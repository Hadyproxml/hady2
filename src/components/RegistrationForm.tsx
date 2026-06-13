import React, { useState } from 'react';
import { User, Phone, Mail, Plus, Trash2, Building2, Stethoscope, PawPrint, Save, Activity, HeartPulse, X, CheckCircle2, History, CreditCard, ChevronDown, Barcode, FileText, UploadCloud, Paperclip, AlertCircle } from 'lucide-react';
import { Owner, Pet, Clinic, Visit } from '../types';

interface RegistrationFormProps {
  onRegister?: (visits: Visit[], owner: Owner, pets: Pet[]) => void;
  clinics: Clinic[];
}

export default function RegistrationForm({ onRegister, clinics }: RegistrationFormProps) {
  const [owner, setOwner] = useState<Owner>({
    fullName: '',
    phone: '',
    email: '',
  });

  const [pets, setPets] = useState<Pet[]>([
    { id: crypto.randomUUID(), name: '', species: '', age: '', condition: '' }
  ]);

  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  // Attachments state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleAddPet = () => {
    setPets([...pets, { id: crypto.randomUUID(), name: '', species: '', age: '', condition: '' }]);
  };

  const handleRemovePet = (id: string) => {
    if (pets.length > 1) {
      setPets(pets.filter(pet => pet.id !== id));
    }
  };

  const handlePetChange = (id: string, field: keyof Pet, value: string) => {
    setPets(pets.map(pet => pet.id === id ? { ...pet, [field]: value } : pet));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const processFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('حجم الملف كبير جداً! الحد الأقصى هو 4 ميجابايت لضمان سرعة الحفظ وسلاسة النظام.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        type: file.type,
        size: file.size,
        url: reader.result as string
      }]);
    };
    reader.onerror = () => {
      setUploadError('حدث خطأ أثناء قراءة الملف. يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(processFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newVisits: Visit[] = pets.map(pet => {
      const visitAttachments = uploadedFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }));

      return {
        id: crypto.randomUUID(),
        owner,
        pet,
        status: 'WAITING',
        clinicId: selectedClinicId || undefined,
        createdAt: new Date().toISOString(),
        attachments: visitAttachments
      };
    });

    if (onRegister) {
      onRegister(newVisits, owner, pets);
    }
    
    setIsSubmitted(true);
    
    setTimeout(() => {
      setIsSubmitted(false);
      setOwner({ fullName: '', phone: '', email: '' });
      setPets([{ id: crypto.randomUUID(), name: '', species: '', age: '', condition: '' }]);
      setSelectedClinicId('');
      setUploadedFiles([]);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-emerald-500 p-12 text-center rounded-[3rem] shadow-2xl shadow-emerald-200 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">تم التسجيل بنجاح</h2>
          <p className="text-emerald-50 font-bold">جاري تحويل الحالات إلى قائمة الانتظار...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
         <h1 className="text-3xl font-black text-[#0f2e46] tracking-tight">استقبال المراجعين</h1>
         <p className="text-slate-400 font-bold text-sm max-w-xl mx-auto leading-relaxed">يرجى تسجيل بيانات المالك والحيوانات الأليفة لبدء الفحص.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Grid Layout: Right Column (Owner + Upload) vs Left Column (Pets + Clinic) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Right Column: Owner Section & File Upload Section */}
          <div className="space-y-8">
            {/* Owner Section */}
            <section className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-[#0f2e46] transition-all group-hover:w-2.5"></div>
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                <div className="w-11 h-11 bg-[#f8fafc] text-[#0f2e46] rounded-xl flex items-center justify-center shadow-inner group-hover:bg-[#0f2e46] group-hover:text-white transition-all">
                  <User size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0f2e46]">بيانات صاحب الحالة</h2>
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest font-sans">Owner Information</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 block mr-1">الاسم الكامل <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={owner.fullName}
                    onChange={(e) => setOwner({...owner, fullName: e.target.value})}
                    placeholder="أدخل الاسم..."
                    className="w-full px-5 py-3 bg-[#f8fafc] border-2 border-slate-50 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 block mr-1">رقم الجوال <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="tel" 
                    value={owner.phone}
                    onChange={(e) => setOwner({...owner, phone: e.target.value})}
                    placeholder="05xxxxxxxx"
                    className="w-full px-5 py-3 bg-[#f8fafc] border-2 border-slate-50 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 block mr-1">البريد الإلكتروني (اختياري)</label>
                  <input 
                    type="email" 
                    value={owner.email || ''}
                    onChange={(e) => setOwner({...owner, email: e.target.value})}
                    placeholder="example@mail.com"
                    className="w-full px-5 py-3 bg-[#f8fafc] border-2 border-slate-50 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                  />
                </div>
              </div>
            </section>

            {/* Upload Files Section for doctors */}
            <section className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600 transition-all group-hover:w-2.5"></div>
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Paperclip size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0f2e46]">رفع ملفات ومرفقات للطبيب</h2>
                  <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest font-sans">Medical Records Upload for Doctor</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-slate-400 font-bold text-xs leading-relaxed">
                  يمكنك تحميل صور الأشعة، نتائج تحاليل المختبر، أو تقارير طبية سابقة هنا ليتم إدراجها وحفظها مع السجل الطبي مباشرة.
                </p>
                
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative group flex flex-col items-center justify-center ${
                    isDragging 
                      ? 'border-blue-600 bg-blue-50/50' 
                      : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="file" 
                    id="reception-file-upload"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1.5 py-2">
                    <UploadCloud className="text-slate-400 group-hover:text-blue-600 transition-all mx-auto" size={28} />
                    <p className="text-[11px] font-black text-slate-700">اسحب الملفات هنا أو اضغط للتصفح</p>
                    <p className="text-[9px] font-bold text-slate-400">الحد الأقصى: 4 ميجابايت للملف (البيانات تحفظ محلياً)</p>
                  </div>
                </div>

                {uploadError && (
                  <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">الملفات المرفقة حتى الآن ({uploadedFiles.length})</span>
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50/55 border border-slate-100 rounded-xl animate-in fade-in">
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            {file.type.startsWith('image/') ? (
                              <img src={file.url} alt="preview" className="w-8 h-8 object-cover rounded-lg shadow-sm shrink-0 border-2 border-white" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-50/70 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                            )}
                            <div className="truncate shrink min-w-0">
                              <p className="text-[11px] font-black text-slate-800 truncate" dir="ltr">{file.name}</p>
                              <p className="text-[8px] font-bold text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveUploadedFile(i)}
                            className="text-slate-305 hover:text-red-500 transition-all p-1 shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Left Column: Pets & Clinic Referral */}
          <div className="space-y-8">
            {/* Pets Section */}
            <section className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-600 transition-all group-hover:w-2.5"></div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#f8fafc] text-indigo-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <PawPrint size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#0f2e46]">تفاصيل الحيوانات والحالة الصحية</h2>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest font-sans">Medical Case Information</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddPet}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl font-black text-[11px] transition-all flex items-center gap-2 border-2 border-indigo-100"
                >
                  <Plus size={14} />
                  إضافة حيوان
                </button>
              </div>

              <div className="space-y-6">
                {pets.map((pet, index) => (
                  <div key={pet.id} className="p-6 bg-[#f8fafc] rounded-[1.5rem] border-2 border-slate-50 relative group/card hover:bg-white hover:border-indigo-100 transition-all">
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-lg">
                      {index + 1}
                    </div>
                    
                    {pets.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemovePet(pet.id)}
                        className="absolute top-4 left-4 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 block mr-1">الاسم <span className="text-red-500">*</span></label>
                        <input 
                          required
                          type="text" 
                          value={pet.name}
                          onChange={(e) => handlePetChange(pet.id, 'name', e.target.value)}
                          placeholder="لوسي..."
                          className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 block mr-1">النوع <span className="text-red-500">*</span></label>
                        <input 
                          required
                          type="text" 
                          value={pet.species}
                          onChange={(e) => handlePetChange(pet.id, 'species', e.target.value)}
                          placeholder="فصيلة..."
                          className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 block mr-1">العمر <span className="text-red-500">*</span></label>
                        <input 
                          required
                          type="text" 
                          value={pet.age}
                          onChange={(e) => handlePetChange(pet.id, 'age', e.target.value)}
                          placeholder="سنة..."
                          className="w-full px-5 py-3 bg-[#f8fafc] border-2 border-slate-50 rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-[13px]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 block mr-1">بيان الحالة المبدئي للحيوان <span className="text-red-500">*</span></label>
                      <textarea 
                        required
                        value={pet.condition}
                        onChange={(e) => handlePetChange(pet.id, 'condition', e.target.value)}
                        placeholder="اشرح العوارض..."
                        className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl focus:border-indigo-600 outline-none transition-all font-bold text-[13px] resize-none h-24"
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Clinic / Case Referral Section */}
            <section className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 transition-all group-hover:w-2.5"></div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <Building2 size={20} />
                   </div>
                   <div>
                     <h2 className="text-xl font-black text-[#0f2e46] flex items-center gap-2">
                       توجيه الحالة
                       <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">(اختياري)</span>
                     </h2>
                     <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest font-sans">Optional Clinic Assignment</p>
                   </div>
                </div>
                
                <p className="text-slate-400 font-bold text-xs leading-relaxed">
                  يمكنك توجيه الحالة لعيادة معينة مباشرة، أو تركها فارغة كحالة عامة معلقة يسحبها أي طبيب من لوحته.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  {clinics.map(clinic => (
                    <button
                      key={clinic.id}
                      type="button"
                      onClick={() => setSelectedClinicId(prev => prev === clinic.id ? '' : clinic.id)} // Toggle selection to keep optional
                      className={`px-4 py-2.5 rounded-xl font-black text-[11px] transition-all border-2 flex items-center gap-2 ${
                        selectedClinicId === clinic.id 
                          ? 'bg-[#0f2e46] border-[#0f2e46] text-white shadow-lg scale-102' 
                          : 'bg-[#f8fafc] border-slate-100 text-slate-400 hover:border-[#0f2e46] hover:text-[#0f2e46]'
                      }`}
                    >
                      <Stethoscope size={14} />
                      {clinic.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
          
        </div>

        {/* Submit button spanning full bottom */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="w-full lg:w-auto px-12 py-5 bg-indigo-600 hover:bg-[#0f2e46] text-white rounded-[1.5rem] font-black text-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-100/50"
          >
            <Save size={20} />
            اعتماد الحالة وتسجيل المراجع
          </button>
        </div>
      </form>
    </div>
  );
}
