
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmLabel = 'حذف',
  cancelLabel = 'إلغاء',
  isDangerous = true
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm overflow-hidden" dir="rtl">
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 30 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-white/20"
          style={{ direction: 'rtl' }}
        >
          <div className="relative px-10 py-6 border-b-2 border-sky-50 flex-shrink-0">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isDangerous ? 'bg-red-600 text-white shadow-red-200' : 'bg-amber-500 text-white shadow-amber-200'}`}>
                        {isDangerous ? <Trash2 size={28} /> : <AlertTriangle size={28} />}
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-sky-900">{title}</h3>
                        <p className="text-xs text-sky-500 font-bold uppercase tracking-widest">{isDangerous ? 'إجراء لا رجعة فيه' : 'تأكيد الإجراء الخطير'}</p>
                    </div>
                </div>
            <button type="button" onClick={onClose} className="w-12 h-12 hover:bg-sky-100 rounded-2xl flex items-center justify-center transition-all">
                <X size={24} className="text-sky-400" />
            </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin text-right">
            <p className="text-sky-800 font-bold text-lg leading-relaxed">
              {message}
              {itemName && (
                <span className="block mt-4 text-sky-950 font-black text-2xl px-4 py-3 bg-sky-50 rounded-2xl border border-sky-100">"{itemName}"</span>
              )}
            </p>
          </div>
          
          <div className="px-10 py-6 border-t border-sky-50 flex gap-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-8 py-4 bg-sky-100 hover:bg-sky-200 text-sky-600 font-black rounded-2xl transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-4 rounded-2xl font-black transition-all text-white flex justify-center items-center gap-2 ${isDangerous ? 'bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-200' : 'bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200'} active:scale-95 text-lg`}
            >
              {isDangerous ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
