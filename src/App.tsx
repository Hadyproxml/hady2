/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import RegistrationForm from './components/RegistrationForm';
import DoctorSection from './components/DoctorSection';
import PaymentSection from './components/PaymentSection';
import ServicesSection from './components/ServicesSection';
import SearchSection from './components/SearchSection';
import SettingsSection from './components/SettingsSection';
import LoginScreen from './components/LoginScreen';
import { Visit, ServiceItem, MedicationItem, ClientRecord, Owner, Pet, Clinic, INITIAL_CLINICS, UserAccount, DEFAULT_ADMIN, DEVELOPER_ACCOUNT } from './types';
import { UserPlus, Stethoscope, Wallet, Search, Settings, LogOut, LayoutDashboard } from 'lucide-react';

type NavigationTab = 'REGISTRATION' | 'DOCTOR' | 'PAYMENT' | 'SERVICES' | 'SEARCH' | 'SETTINGS';

export default function App() {
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('vita_user_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserAccount[];
        return parsed.map(acc => {
          if (acc.username === 'admin' && acc.password === 'password') {
            return { ...acc, password: '123' };
          }
          return acc;
        });
      } catch (e) {
        // Fallback
      }
    }
    return [DEFAULT_ADMIN, DEVELOPER_ACCOUNT];
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('vita_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserAccount;
        if (parsed.username === 'admin' && parsed.password === 'password') {
          return { ...parsed, password: '123' };
        }
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const savedUser = localStorage.getItem('vita_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser) as UserAccount;
      if (user.permissions.canViewRegistration) return 'REGISTRATION';
      if (user.permissions.canViewDoctor) return 'DOCTOR';
      if (user.permissions.canViewPayment) return 'PAYMENT';
      if (user.permissions.canViewServices) return 'SERVICES';
      if (user.permissions.canViewSearch) return 'SEARCH';
      if (user.permissions.canViewSettings) return 'SETTINGS';
    }
    return 'REGISTRATION';
  });

  useEffect(() => {
    localStorage.setItem('vita_user_accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vita_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vita_current_user');
    }
  }, [currentUser]);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [patientDataPath, setPatientDataPath] = useState('C:\\ClinicData\\Patients');
  
  const [hospitalName, setHospitalName] = useState(() => {
    return localStorage.getItem('vita_hospital_name') || 'عيادات هادي';
  });
  const [hospitalAddress, setHospitalAddress] = useState(() => {
    const saved = localStorage.getItem('vita_hospital_address');
    return (!saved || saved === 'شارع الملك فهد، حي الياسمين، الرياض') ? 'سموحه-الاسكندريه' : saved;
  });
  const [hospitalPhone, setHospitalPhone] = useState(() => {
    const saved = localStorage.getItem('vita_hospital_phone');
    return (!saved || saved === '+966 50 123 4567') ? '01017485367' : saved;
  });

  useEffect(() => {
    localStorage.setItem('vita_hospital_name', hospitalName);
  }, [hospitalName]);

  useEffect(() => {
    localStorage.setItem('vita_hospital_address', hospitalAddress);
  }, [hospitalAddress]);

  useEffect(() => {
    localStorage.setItem('vita_hospital_phone', hospitalPhone);
  }, [hospitalPhone]);
  
  const [clinics, setClinics] = useState<Clinic[]>(INITIAL_CLINICS);
  
  const [servicesCatalog, setServicesCatalog] = useState<ServiceItem[]>([
    { id: 's1', name: 'كشف عام', price: 150 },
    { id: 's2', name: 'تطعيم سداسي', price: 450 },
    { id: 's3', name: 'سونار', price: 300 },
    { id: 's4', name: 'تحليل دم شامل', price: 500 },
  ]);

  const [medicationsCatalog, setMedicationsCatalog] = useState<MedicationItem[]>([
    { id: 'm1', name: 'مضاد حيوي للقطط', price: 80 },
    { id: 'm2', name: 'خافض حرارة', price: 50 },
    { id: 'm3', name: 'فيتامينات', price: 120 },
  ]);

  const [clients, setClients] = useState<ClientRecord[]>(() => {
    const saved = localStorage.getItem('vita_clients');
    return saved ? JSON.parse(saved) : [
      {
        id: 'c1',
        owner: { fullName: 'سارة خالد', phone: '0501234567', email: '' },
        pets: [{ id: 'p1', name: 'لوسي', species: 'قط شيرازي', age: 'سنتين' }]
      }
    ];
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem('vita_visits');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'demo-1',
        owner: { fullName: 'سارة خالد', phone: '0501234567', email: '' },
        pet: { id: 'p1', name: 'لوسي', species: 'قط شيرازي', age: 'سنتين', condition: 'فقدان شهية وخمول منذ يومين' },
        clinicId: '1',
        status: 'WAITING',
        createdAt: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('vita_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('vita_visits', JSON.stringify(visits));
  }, [visits]);

  const handleRegister = (newVisits: Visit[], owner: Owner, pets: Pet[]) => {
    setVisits(prev => [...prev, ...newVisits]);

    setClients(prev => {
      const existingClientIndex = prev.findIndex(c => c.owner.phone === owner.phone);
      if (existingClientIndex >= 0) {
        // Merge pets (in a real app we'd compare deeply, here we just append non-existing by name)
        const updatedClients = [...prev];
        const currentPets = updatedClients[existingClientIndex].pets;
        
        pets.forEach(p => {
           if (!currentPets.find(cp => cp.name === p.name)) {
              currentPets.push({ id: p.id, name: p.name, species: p.species, age: p.age });
           }
        });
        
        return updatedClients;
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          owner,
          pets: pets.map(p => ({ id: p.id, name: p.name, species: p.species, age: p.age }))
        }];
      }
    });
  };

  const updateClient = (clientId: string, updates: Partial<ClientRecord>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c));
    // Optional: Also sync updates to active visits to keep data consistent
    if (updates.owner) {
      setVisits(prev => prev.map(v => v.owner.phone === updates.owner?.phone ? { ...v, owner: updates.owner as Owner } : v));
    }
  };

  const addNewVisit = (clientId: string, petId: string, clinicId: string | undefined, condition: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const pet = client.pets.find(p => p.id === petId);
    if (!pet) return;

    setVisits(prev => [...prev, {
      id: crypto.randomUUID(),
      owner: client.owner,
      pet: { ...pet, condition },
      clinicId: clinicId || undefined,
      status: 'WAITING',
      createdAt: new Date().toISOString()
    }]);
  };

  const updateVisit = (id: string, updates: Partial<Visit>) => {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setVisits(prev => prev.filter(v => v.owner.phone !== client.owner.phone));
    }
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const deleteVisit = (visitId: string) => {
    setVisits(prev => prev.filter(v => v.id !== visitId));
  };

  if (!currentUser) {
    return <LoginScreen accounts={userAccounts} onLogin={(user) => {
      setCurrentUser(user);
      // Auto-select the first available tab
      if (user.permissions.canViewRegistration) setActiveTab('REGISTRATION');
      else if (user.permissions.canViewDoctor) setActiveTab('DOCTOR');
      else if (user.permissions.canViewPayment) setActiveTab('PAYMENT');
      else if (user.permissions.canViewServices) setActiveTab('SERVICES');
      else if (user.permissions.canViewSearch) setActiveTab('SEARCH');
      else if (user.permissions.canViewSettings) setActiveTab('SETTINGS');
    }} />;
  }

  const statusCounts = {
    waiting: visits.filter(v => v.status === 'WAITING' || v.status === 'EXAMINING').length,
    payment: visits.filter(v => v.status === 'AWAITING_PAYMENT').length,
  };

  return (
    <div className="min-h-screen font-sans bg-[#f4f7fe]" dir="rtl">
      {/* Reverted Header with Tabs */}
      <header className="bg-[#0f2e46] text-white pt-6 pb-4 px-8 sticky top-0 z-50 shadow-2xl overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-white rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-[95%] mx-auto flex items-center justify-between gap-4 relative z-10 w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white p-2 rounded-xl shadow-xl shadow-black/20 transform -rotate-3 group cursor-pointer hover:rotate-0 transition-all">
              <Stethoscope className="text-[#0f2e46]" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none mb-0.5">{hospitalName}</h1>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-[7px] font-bold text-white/50 tracking-widest uppercase">مركز طبي متكامل</span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'REGISTRATION', label: 'الاستقبال', icon: UserPlus, perm: currentUser.permissions.canViewRegistration },
              { id: 'DOCTOR', label: 'الفحوصات', icon: Stethoscope, perm: currentUser.permissions.canViewDoctor, count: statusCounts.waiting },
              { id: 'PAYMENT', label: 'الخزينة', icon: Wallet, perm: currentUser.permissions.canViewPayment, count: statusCounts.payment },
              { id: 'SERVICES', label: 'الخدمات', icon: LayoutDashboard, perm: currentUser.permissions.canViewServices },
              { id: 'SEARCH', label: 'الأرشيف', icon: Search, perm: currentUser.permissions.canViewSearch },
              { id: 'SETTINGS', label: 'الإعدادات', icon: Settings, perm: currentUser.permissions.canViewSettings },
            ].map((item) => item.perm && (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavigationTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[11px] transition-all whitespace-nowrap group ${
                  activeTab === item.id 
                    ? 'bg-white text-[#0f2e46] shadow-lg scale-102' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={14} className={`${activeTab === item.id ? 'text-[#0f2e46]' : 'text-white/20 group-hover:text-emerald-400'} transition-all`} />
                {item.label}
                {item.count ? (
                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                    activeTab === item.id ? 'bg-[#0f2e46] text-white' : 'bg-emerald-400 text-[#0f2e46]'
                  }`}>
                    {item.count}
                  </span>
                ) : (
                  activeTab === item.id && <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
             <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-all">
                <div className="text-left pr-2 border-r border-white/10">
                   <p className="text-[10px] font-black text-white leading-none mb-0.5">{currentUser.fullName}</p>
                   <p className="text-[7px] text-emerald-400 font-bold uppercase tracking-widest">{currentUser.role === 'MANAGER' ? 'المدير' : 'طبيب'}</p>
                </div>
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[#0f2e46] font-black text-[11px] shadow-lg group-hover:scale-110 transition-all">
                   {currentUser.fullName.charAt(0)}
                </div>
             </div>
             <button 
                onClick={() => setCurrentUser(null)}
                className="bg-white/5 hover:bg-red-500 hover:text-white p-2 rounded-xl border border-white/10 transition-all group"
                title="تسجيل الخروج"
             >
                <LogOut size={14} />
             </button>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-10 py-10">
        <div className="max-w-[95%] mx-auto w-full">
          {activeTab === 'REGISTRATION' && currentUser.permissions.canViewRegistration && <RegistrationForm onRegister={handleRegister} clinics={clinics} />}
          {activeTab === 'DOCTOR' && currentUser.permissions.canViewDoctor && (
            <DoctorSection 
              visits={visits} 
              updateVisit={updateVisit} 
              servicesCatalog={servicesCatalog}
              medicationsCatalog={medicationsCatalog}
              clinics={clinics}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'PAYMENT' && currentUser.permissions.canViewPayment && (
            <PaymentSection 
              visits={visits} 
              updateVisit={updateVisit} 
              clinics={clinics}
              autoPrintInvoice={autoPrintInvoice}
              hospitalName={hospitalName}
              hospitalAddress={hospitalAddress}
              hospitalPhone={hospitalPhone}
            />
          )}
          {activeTab === 'SERVICES' && currentUser.permissions.canViewServices && (
            <ServicesSection 
              services={servicesCatalog}
              medications={medicationsCatalog}
              setServices={setServicesCatalog}
              setMedications={setMedicationsCatalog}
              clinics={clinics}
              setClinics={setClinics}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'SEARCH' && currentUser.permissions.canViewSearch && (
             <SearchSection 
               clients={clients}
               allVisits={visits}
               updateClient={updateClient}
               addNewVisit={addNewVisit}
               clinics={clinics}
               currentUser={currentUser}
               deleteClient={deleteClient}
               deleteVisit={deleteVisit}
               hospitalName={hospitalName}
               hospitalAddress={hospitalAddress}
               hospitalPhone={hospitalPhone}
             />
          )}
          {activeTab === 'SETTINGS' && currentUser.permissions.canViewSettings && (
            <SettingsSection 
              autoPrintInvoice={autoPrintInvoice}
              setAutoPrintInvoice={setAutoPrintInvoice}
              patientDataPath={patientDataPath}
              setPatientDataPath={setPatientDataPath}
              userAccounts={userAccounts}
              setUserAccounts={setUserAccounts}
              clinics={clinics}
              currentUser={currentUser}
              hospitalName={hospitalName}
              setHospitalName={setHospitalName}
              hospitalAddress={hospitalAddress}
              setHospitalAddress={setHospitalAddress}
              hospitalPhone={hospitalPhone}
              setHospitalPhone={setHospitalPhone}
            />
          )}
        </div>
      </main>
    </div>
  );
}
