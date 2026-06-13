import React, { useState } from 'react';
import { UserAccount } from '../types';
import { ShieldCheck, User, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginScreenProps {
  accounts: UserAccount[];
  onLogin: (user: UserAccount) => void;
}

export default function LoginScreen({ accounts, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = accounts.find(
      (acc) => acc.username === username && acc.password === password
    );
    if (user) {
      setError('');
      onLogin(user);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#f0f4f8]">
      {/* Animated Background Elements (Light Mode) */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-100/70 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-teal-50/70 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/80 overflow-hidden relative">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
          
          <div className="p-8 relative z-20">
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-600 p-4 rounded-[1.2rem] shadow-xl shadow-indigo-200/50">
                <ShieldCheck size={36} className="text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl font-black text-center text-slate-800 mb-1">تسجيل الدخول</h1>
            <p className="text-center text-slate-600 mb-8 font-medium text-sm">نظام العيادة المتكامل</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 group-focus-within:text-indigo-600 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    dir="ltr"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200/60 rounded-xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium text-left text-sm placeholder:text-slate-400"
                    placeholder="اسم المستخدم"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 group-focus-within:text-indigo-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    dir="ltr"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200/60 rounded-xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium text-left text-sm placeholder:text-slate-400"
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-3 border border-red-100">
                      <AlertCircle className="shrink-0" size={16} />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                className="w-full bg-slate-900 text-white hover:bg-black hover:scale-[1.01] active:scale-[0.98] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 mt-6 text-sm"
              >
                دخول النظام <ArrowLeft size={18} />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
