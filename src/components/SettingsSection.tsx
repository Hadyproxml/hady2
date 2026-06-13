import React, { useState } from 'react';
import { Settings, Save, Database, Key, Layout, FolderOpen, Printer, Plus, Trash2, Shield, User, Edit, X, CheckCircle2, Stethoscope, Building, Phone, MapPin } from 'lucide-react';
import { UserAccount, UserRole, Clinic } from '../types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface SettingsSectionProps {
  autoPrintInvoice: boolean;
  setAutoPrintInvoice: React.Dispatch<React.SetStateAction<boolean>>;
  patientDataPath: string;
  setPatientDataPath: React.Dispatch<React.SetStateAction<string>>;
  userAccounts: UserAccount[];
  setUserAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  clinics: Clinic[];
  currentUser: UserAccount;
  hospitalName: string;
  setHospitalName: React.Dispatch<React.SetStateAction<string>>;
  hospitalAddress: string;
  setHospitalAddress: React.Dispatch<React.SetStateAction<string>>;
  hospitalPhone: string;
  setHospitalPhone: React.Dispatch<React.SetStateAction<string>>;
}

export default function SettingsSection({ 
  autoPrintInvoice, setAutoPrintInvoice, 
  patientDataPath, setPatientDataPath,
  userAccounts, setUserAccounts,
  clinics, currentUser,
  hospitalName, setHospitalName,
  hospitalAddress, setHospitalAddress,
  hospitalPhone, setHospitalPhone
}: SettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ACCOUNTS' | 'DEVELOPER'>('GENERAL');
  
  // Local state for edits
  const [localAutoPrint, setLocalAutoPrint] = useState(autoPrintInvoice);
  const [localPath, setLocalPath] = useState(patientDataPath);
  const [localHospitalName, setLocalHospitalName] = useState(hospitalName);
  const [localHospitalAddress, setLocalHospitalAddress] = useState(hospitalAddress);
  const [localHospitalPhone, setLocalHospitalPhone] = useState(hospitalPhone);
  
  const [isSaved, setIsSaved] = useState(false);

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

  // Accounts state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('RECEPTIONIST');
  const [newClinicId, setNewClinicId] = useState('');
  const [newPermissions, setNewPermissions] = useState({
    canViewRegistration: true,
    canViewDoctor: false,
    canViewPayment: true,
    canViewServices: false,
    canViewSearch: true,
    canViewSettings: false,
    canEdit: false,
    canDelete: false,
    canDeleteClientRecord: false,
  });

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    if (role === 'MANAGER') {
      setNewPermissions({
        canViewRegistration: true, canViewDoctor: true, canViewPayment: true,
        canViewServices: true, canViewSearch: true, canViewSettings: true,
        canEdit: true, canDelete: true, canDeleteClientRecord: true,
      });
    } else if (role === 'DOCTOR') {
      setNewPermissions({
        canViewRegistration: false, canViewDoctor: true, canViewPayment: false,
        canViewServices: false, canViewSearch: true, canViewSettings: false,
        canEdit: true, canDelete: false, canDeleteClientRecord: false,
      });
    } else {
      setNewPermissions({
        canViewRegistration: true, canViewDoctor: false, canViewPayment: true,
        canViewServices: false, canViewSearch: true, canViewSettings: false,
        canEdit: false, canDelete: false, canDeleteClientRecord: false,
      });
    }
  };

  const startEditing = (account: UserAccount) => {
    setEditingAccount(account);
    setNewUsername(account.username);
    setNewPassword(account.password);
    setNewFullName(account.fullName);
    setNewRole(account.role);
    setNewClinicId(account.clinicId || '');
    setNewPermissions(account.permissions);
    setShowAddAccount(true);
  };

  const addOrUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newFullName || (newRole === 'DOCTOR' && !newClinicId)) return;
    
    if (!editingAccount && userAccounts.find(u => u.username === newUsername)) {
      alert("اسم المستخدم موجود مسبقاً");
      return;
    }

    if (editingAccount) {
      const updatedAccounts = userAccounts.map(u => u.id === editingAccount.id ? {
        ...u,
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
        clinicId: newRole === 'DOCTOR' ? newClinicId : undefined,
        permissions: newPermissions
      } : u);
      setUserAccounts(updatedAccounts);
    } else {
      const newUser: UserAccount = {
        id: crypto.randomUUID(),
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
        clinicId: newRole === 'DOCTOR' ? newClinicId : undefined,
        permissions: newPermissions
      };
      setUserAccounts([...userAccounts, newUser]);
    }

    setShowAddAccount(false);
    setEditingAccount(null);
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewRole('RECEPTIONIST');
    setNewClinicId('');
  };

  const deleteAccount = (id: string) => {
    if (id === currentUser.id) return; 
    const account = userAccounts.find(a => a.id === id);
    if (!account) return;
    setDeleteModal({
      isOpen: true,
      title: 'حذف الحساب البرمجي',
      message: `هل أنت متأكد من حذف حساب المستخدم "${account.fullName}" (${account.username})؟ سيتم إلغاء صلاحياته وفقدان وصوله إلى النظام نهائياً.`,
      onConfirm: () => {
        setUserAccounts(userAccounts.filter(a => a.id !== id));
      }
    });
  };

  const handleSave = () => {
    setAutoPrintInvoice(localAutoPrint);
    setPatientDataPath(localPath);
    setHospitalName(localHospitalName);
    setHospitalAddress(localHospitalAddress);
    setHospitalPhone(localHospitalPhone);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-full w-full p-4 space-y-6">
      <header className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">إعدادات النظام</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">التحكم في خيارات العرض، الحسابات، وصلاحيات الوصول</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
           <button onClick={() => setActiveTab('GENERAL')} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${activeTab === 'GENERAL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>عام</button>
           <button onClick={() => setActiveTab('ACCOUNTS')} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${activeTab === 'ACCOUNTS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>الحسابات</button>
           <button onClick={() => setActiveTab('DEVELOPER')} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${activeTab === 'DEVELOPER' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>المطور</button>
        </div>
      </header>

      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
             <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <Printer size={18} className="text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm">خيارات الطباعة</h3>
             </div>
             
             <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:bg-white">
                <div>
                   <p className="font-black text-slate-800 text-xs">الطباعة التلقائية</p>
                   <p className="text-[9px] text-slate-400 font-bold mt-0.5">استخراج الفاتورة فور إتمام عملية الدفع</p>
                </div>
                <button 
                  onClick={() => setLocalAutoPrint(!localAutoPrint)}
                  className={`w-10 h-5 rounded-full relative transition-all ${localAutoPrint ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${localAutoPrint ? 'left-0.5' : 'left-5.5'}`}></div>
                </button>
             </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
             <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <FolderOpen size={18} className="text-amber-600" />
                <h3 className="font-black text-slate-800 text-sm">بيانات الأرشفة</h3>
             </div>
             
             <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">مسار حفظ السجلات (Local Path)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    dir="ltr"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    className="flex-grow px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-amber-50 font-mono text-[10px] font-bold text-slate-800"
                  />
                </div>
                <p className="text-[9px] font-bold text-slate-400 italic">ملاحظة: تأكد من مشاركة المجلد في حال العمل عبر الشبكة المحلية</p>
             </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6 lg:col-span-2">
             <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <Building size={18} className="text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm">البيانات التعريفية للمنشأة على الفاتورة</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-1.5 pl-1">
                      <Building size={13} className="text-slate-400" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اسم المنشأة / المستشفى</label>
                   </div>
                   <input 
                     type="text" 
                     value={localHospitalName}
                     onChange={(e) => setLocalHospitalName(e.target.value)}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 font-black text-xs text-slate-800 transition-all font-sans"
                     placeholder="مثال: عيادات هادي"
                   />
                </div>
                
                <div className="space-y-2">
                   <div className="flex items-center gap-1.5 pl-1">
                      <Phone size={13} className="text-slate-400" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الهاتف</label>
                   </div>
                   <input 
                     type="text" 
                     value={localHospitalPhone}
                     onChange={(e) => setLocalHospitalPhone(e.target.value)}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 font-bold text-xs text-slate-800 transition-all"
                     placeholder="مثال: +966 50 123 4567"
                     dir="ltr"
                   />
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-1.5 pl-1">
                      <MapPin size={13} className="text-slate-400" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">العنوان بالتفصيل</label>
                   </div>
                   <input 
                     type="text" 
                     value={localHospitalAddress}
                     onChange={(e) => setLocalHospitalAddress(e.target.value)}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 font-bold text-xs text-slate-800 transition-all font-sans"
                     placeholder="مثال: الرياض، حي الياسمين، شارع الملك فهد"
                   />
                </div>
             </div>
          </section>

          <div className="col-span-full pt-2 flex justify-end">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white transition-all px-8 py-3 rounded-xl shadow-lg shadow-slate-200 font-black text-base active:scale-95"
            >
              <Save size={20} />
              {isSaved ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات الحالية'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Key size={18} />
                </div>
                <div>
                   <h3 className="text-base font-black text-slate-800 leading-tight">إدارة المستخدمين</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">إضافة موظفين، تعديل الصلاحيات والمسميات الوظيفية</p>
                </div>
             </div>
             <button 
               onClick={() => {
                 setEditingAccount(null);
                 setNewUsername('');
                 setNewPassword('');
                 setNewFullName('');
                 setNewRole('RECEPTIONIST');
                 setNewClinicId('');
                 setShowAddAccount(!showAddAccount);
               }}
               className="bg-indigo-600 hover:bg-slate-900 text-white transition-all px-4 py-2 rounded-xl font-black flex items-center gap-2 active:scale-95 text-[10px]"
             >
               {showAddAccount ? <><X size={14} /> إغلاق</> : <><Plus size={14} /> مستخدم جديد</>}
             </button>
          </div>

          {showAddAccount && (
            <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-50 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
               <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-600"></div>
               <h4 className="text-base font-black text-slate-800 mb-6 border-b border-slate-50 pb-3">
                 {editingAccount ? 'تعديل الصلاحيات والبيانات' : 'إنشاء حساب مستخدم جديد'}
               </h4>
               <form onSubmit={addOrUpdateAccount} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">الاسم الكامل</label>
                      <input type="text" required value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white font-bold text-xs" placeholder="د. علي أحمد" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">اسم المستخدم</label>
                      <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)} dir="ltr" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white font-mono text-xs text-left font-bold" placeholder="user_login" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">كلمة المرور</label>
                      <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white font-mono text-xs text-left font-bold" placeholder="••••••••" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المسمى الوظيفي</label>
                      <select required value={newRole} onChange={(e) => handleRoleChange(e.target.value as UserRole)} className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white font-bold text-xs cursor-pointer">
                        <option value="RECEPTIONIST">موظف استقبال</option>
                        <option value="DOCTOR">طبيب معالج</option>
                        <option value="MANAGER">مدير مسؤول</option>
                      </select>
                    </div>
                  </div>

                  {newRole === 'DOCTOR' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">عيادة الطبيب</label>
                      <select required value={newClinicId} onChange={(e) => setNewClinicId(e.target.value)} className="w-full md:w-1/3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white font-bold text-xs">
                        <option value="">-- اختر العيادة --</option>
                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">بوابة الصلاحيات المخصصة</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[
                         {id: 'canViewRegistration', label: 'الاستقبال', color: 'indigo'},
                         {id: 'canViewDoctor', label: 'شاشة الطبيب', color: 'indigo'},
                         {id: 'canViewPayment', label: 'الحسابات', color: 'indigo'},
                         {id: 'canViewSearch', label: 'الأرشيف', color: 'indigo'},
                         {id: 'canViewServices', label: 'الخدمات', color: 'emerald'},
                         {id: 'canViewSettings', label: 'الإعدادات', color: 'emerald'},
                         {id: 'canEdit', label: 'تعديل البيانات', color: 'emerald'},
                         {id: 'canDeleteClientRecord', label: 'حذف السجلات', color: 'red'},
                       ].map(perm => (
                         <label key={perm.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={newPermissions[perm.id as keyof typeof newPermissions]} 
                              onChange={(e) => setNewPermissions({...newPermissions, [perm.id]: e.target.checked})}
                              className={`w-3.5 h-3.5 text-${perm.color}-600 rounded`}
                            />
                            <span className="text-[10px] font-bold text-slate-700">{perm.label}</span>
                         </label>
                       ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setShowAddAccount(false); setEditingAccount(null); }} className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-600">إلغاء</button>
                    <button type="submit" className="bg-slate-900 text-white px-8 py-2 rounded-xl font-black text-sm hover:bg-indigo-600 transition-all shadow-lg active:scale-95">
                      {editingAccount ? 'تأكيد التعديلات' : 'إضافة الحساب'}
                    </button>
                  </div>
               </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userAccounts.map(account => (
              <div key={account.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all relative group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                      account.role === 'MANAGER' ? 'bg-slate-900' :
                      account.role === 'DOCTOR' ? 'bg-indigo-600' : 'bg-slate-400'
                    }`}>
                      {account.role === 'MANAGER' ? <Shield size={20} /> :
                       account.role === 'DOCTOR' ? <Stethoscope size={20} /> : <User size={20} />}
                    </div>
                    <div className="flex gap-1">
                       <button onClick={() => startEditing(account)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-all"><Edit size={14} /></button>
                       {account.id !== currentUser.id && (
                         <button onClick={() => deleteAccount(account.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                       )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                     <h4 className="font-black text-slate-800 text-base leading-tight">{account.fullName}</h4>
                     <p className="text-[9px] font-bold text-slate-400 font-mono mt-0.5" dir="ltr">@{account.username}</p>
                  </div>

                  <div className="space-y-1.5">
                     <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">الدور</span>
                        <span className="text-[9px] font-black text-slate-800">{
                          account.role === 'MANAGER' ? 'مدير' : account.role === 'DOCTOR' ? 'طبيب' : 'استقبال'
                        }</span>
                     </div>
                     {account.role === 'DOCTOR' && account.clinicId && (
                        <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg">
                           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">العيادة</span>
                           <span className="text-[9px] font-black text-indigo-800">{clinics.find(c => c.id === account.clinicId)?.name}</span>
                        </div>
                     )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex -space-x-1 rtl:space-x-reverse">
                      {account.permissions.canViewSettings && <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-white" title="Settings"></div>}
                      {account.permissions.canViewDoctor && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 border border-white" title="Doctor"></div>}
                      {account.permissions.canEdit && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white" title="Edit"></div>}
                   </div>
                   {account.id === currentUser.id && <span className="text-[7px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">أنت</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'DEVELOPER' && (
        <div className="bg-slate-900 p-6 rounded-2xl shadow-inner text-emerald-400 font-mono text-xs animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <Database size={18} className="text-emerald-500" />
              <h3 className="text-white font-bold tracking-widest">DEVELOPER CONSOLE</h3>
           </div>
           <div className="space-y-3">
              <div className="flex gap-4">
                 <span className="text-emerald-600">SYST_VER:</span>
                 <span>1.0.8-rev.2</span>
              </div>
              <div className="flex gap-4">
                 <span className="text-emerald-600">DB_PATH:</span>
                 <span className="text-slate-400">{patientDataPath || '/root/data'}</span>
              </div>
              <div className="flex gap-4">
                 <span className="text-emerald-600">ACTIVE_SESSIONS:</span>
                 <span>1</span>
              </div>
              <div className="pt-3 text-slate-600 border-t border-slate-800 text-[10px]">
                 // System logs and direct database operations will appear here in future updates.
              </div>
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
