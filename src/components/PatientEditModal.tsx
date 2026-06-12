import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Upload, FileIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Patient, HospitalData } from '../types';
import { toast } from 'sonner';

export function PatientEditModal({ isOpen, onClose, patient, data, saveData }: { isOpen: boolean, onClose: () => void, patient: Patient, data: HospitalData, saveData: (d: HospitalData) => void }) {
  const [formData, setFormData] = useState<Patient>(patient);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPatients = data.patients.map(p => p.id === patient.id ? formData : p);
    saveData({ ...data, patients: updatedPatients });
    onClose();
  };

  const removeAttachment = (index: number) => {
    const updated = [...(formData.attachments || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, attachments: updated });
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
        <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-white/20"
            style={{ direction: 'rtl' }}
        >
            <div className="relative px-10 py-8 border-b-2 border-sky-50 flex-shrink-0">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                            <UserIcon size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-sky-900">تعديل بيانات المريض</h3>
                            <p className="text-sm text-sky-500 font-bold">تحديث التفاصيل والمرفقات</p>
                        </div>
                    </div>
                <button type="button" onClick={onClose} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                    <X size={24} className="text-sky-400" />
                </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
                <form id="edit-patient-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-sky-500 mb-1">الاسم بالكامل</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-sky-500 mb-1">رقم الهاتف</label>
                              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-sky-500 mb-1">النوع</label>
                              <select 
                                value={formData.gender || 'ذكر'} 
                                onChange={e => setFormData({...formData, gender: e.target.value as any})}
                                className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm appearance-none"
                              >
                                <option value="ذكر">ذكر</option>
                                <option value="أنثى">أنثى</option>
                              </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-sky-500 mb-1">العمر</label>
                              <input type="text" value={formData.age || ''} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm" placeholder="مثال: 25 سنة" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-sky-500 mb-1">الباركود (أرقام فقط)</label>
                              <input 
                                type="text" 
                                value={formData.barcode} 
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setFormData({...formData, barcode: val});
                                }} 
                                className="w-full bg-sky-50 border-2 border-transparent focus:border-sky-100 focus:bg-white rounded-2xl px-6 py-4 font-bold text-sky-900 outline-none transition-all text-sm font-mono" 
                              />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-sky-100">
                            <label className="block text-xs font-bold text-sky-500 mb-3">المرفقات</label>
                            <div className="space-y-3">
                                <label className="flex flex-col items-center justify-center border border-dashed border-sky-200 rounded-2xl p-6 bg-sky-50 hover:bg-white cursor-pointer transition-all">
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            toast.loading('جاري رفع الملفات...', { id: 'modal-upload-toast' });
                                            
                                            const uploadedAttachments = await Promise.all(files.map(async (file: File) => {
                                                return new Promise((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onload = async (ev) => {
                                                        const base64 = ev.target?.result as string;
                                                        try {
                                                            const res = await fetch('/api/upload', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    fileName: file.name,
                                                                    fileData: base64,
                                                                    patientId: patient.id
                                                                })
                                                            });
                                                            const result = await res.json();
                                                            if (result.success) {
                                                                resolve({
                                                                    name: file.name,
                                                                    type: file.type,
                                                                    size: file.size,
                                                                    url: `/${result.path}`
                                                                });
                                                            }
                                                        } catch (err) {
                                                            console.error("Modal upload failed:", err);
                                                            resolve(null);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            }));

                                            const validNew = uploadedAttachments.filter(a => a !== null) as any[];
                                            if (validNew.length > 0) {
                                              setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...validNew] }));
                                              toast.success(`تم رفع ${validNew.length} ملفات`, { id: 'modal-upload-toast' });
                                            } else {
                                              toast.error('فشل رفع الملفات', { id: 'modal-upload-toast' });
                                            }
                                        }}
                                    />
                                    <Upload className="w-5 h-5 text-sky-600 mb-2" />
                                    <span className="text-[10px] text-sky-600 font-bold uppercase tracking-widest">تحميل ملفات جديدة</span>
                                </label>

                                {formData.attachments && formData.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.attachments.map((file, i) => (
                                            <div key={`${file.name}-${file.size}-${i}`} className="flex items-center gap-2 bg-sky-100 px-3 py-2 rounded-lg border border-sky-200 text-[10px] text-sky-900">
                                                <FileIcon className="w-3 h-3 text-sky-400" />
                                                <span className="truncate max-w-[80px]">{file.name}</span>
                                                <button type="button" onClick={() => removeAttachment(i)} className="text-sky-600 hover:text-red-400">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                <button type="button" onClick={onClose} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                    إلغاء
                </button>
                <button type="submit" form="edit-patient-form" className="flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 text-lg">
                    <Save size={20} />
                    حفظ التعديلات
                </button>
            </div>
        </motion.div>
    </div>
  );
}

