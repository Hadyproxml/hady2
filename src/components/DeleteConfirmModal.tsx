import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
  confirmText = 'نعم، احذف دائماً',
  cancelText = 'إلغاء'
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-red-50 p-6 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-inner">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-900 font-sans">{title}</h3>
              <p className="text-red-600/70 text-[10px] font-bold">لا يمكن التراجع عن هذا القرار لاحقاً</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-red-400 hover:text-red-700 bg-white hover:bg-red-100 p-2 rounded-xl transition-all border border-red-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-slate-600 text-sm font-bold leading-relaxed text-right font-sans">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-black text-sm transition-all text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 font-sans"
          >
            <Trash2 size={16} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
