import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, UserCircle } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدير النظام',
  STAFF: 'موظف استقبال',
  DOCTOR: 'طبيب / فني',
  NURSE: 'موظف تمريض',
  DEVELOPER: 'مطور النظام'
};

export function AccountInfoModal({ isOpen, onClose, user, updateUser }: { isOpen: boolean, onClose: () => void, user: any, updateUser: (u: any) => void }) {
  if (!isOpen) return null;
  const roleUpper = (user?.role || '').toUpperCase();
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
        <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-white/20"
            style={{ direction: 'rtl' }}
        >
            <div className="relative px-10 py-8 border-b-2 border-sky-50 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                            <UserCircle size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-sky-900">بيانات الحساب</h3>
                            <p className="text-sm text-sky-500 font-bold">معلومات المستخدم النشط</p>
                        </div>
                    </div>
                <button type="button" onClick={onClose} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                    <X size={24} className="text-sky-400" />
                </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 py-10 scrollbar-thin flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-sky-100 border border-sky-200 flex items-center justify-center mx-auto mb-6 font-black text-sky-600 text-4xl shadow-inner">
                    {user?.name ? user.name.substring(0, 1) : 'U'}
                </div>
                <h3 className="text-3xl font-black text-sky-900 mb-2">{user?.name}</h3>
                <p className="text-sky-500 text-sm font-bold bg-sky-50 px-4 py-2 rounded-xl mb-4 border border-sky-100 select-all">{user?.username}@system</p>
                <span className="inline-block px-6 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">
                    {ROLE_LABELS[roleUpper] || user?.role || ''}
                </span>
            </div>
            
            <div className="px-10 py-8 border-t border-sky-50 flex gap-4 flex-shrink-0">
                <button type="button" onClick={onClose} className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all">
                    إلغاء
                </button>
                <button onClick={() => { updateUser(null); onClose(); }} className="flex-1 flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-2xl border-2 border-red-200 transition-all active:scale-95 text-lg">
                    <LogOut size={20} />
                    تسجيل الخروج
                </button>
            </div>
        </motion.div>
    </div>
  );
}
