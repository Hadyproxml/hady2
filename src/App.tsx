import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Language, Theme } from './types';
import { translations } from './translations';
import { Sun, Moon, Languages, Phone, Facebook, MessageCircle, Info, Hammer, Paintbrush, ShieldCheck, Wrench } from 'lucide-react';

const App = () => {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [isScrolled, setIsScrolled] = useState(false);

  const t = translations[lang];
  
  useEffect(() => {
    // Preload slider images for faster display
    const imagesToPreload = [
      "/images/hero_car_dubai.png",
      "/images/luxury_suv_dubai.png",
      "/images/classic_sports_car_restored.png",
      "/images/supercar_rear_detail.png",
      "/images/performance_tuning_v8.png",
      "/images/offroad_custom_4x4.png",
      "/images/luxury_sedan_detailing.png",
      "/images/modified_jdm_drift.png"
    ];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = () => setLang(l => (l === 'en' ? 'ar' : 'en'));
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <div className={`min-h-screen w-full overflow-x-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Subtle Background Blobs (Premium Touch) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] mix-blend-soft-light transition-colors duration-1000 ${theme === 'dark' ? 'bg-red-900/10' : 'bg-red-200/20'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] mix-blend-soft-light transition-colors duration-1000 ${theme === 'dark' ? 'bg-zinc-800/20' : 'bg-zinc-200/30'}`} />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? (theme === 'dark' ? 'bg-zinc-950/90 backdrop-blur-md py-3' : 'bg-white/90 backdrop-blur-md py-3 shadow-md') : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
              <Wrench size={24} />
            </div>
            <span className="text-xl sm:text-2xl font-bold tracking-tighter">{t.common.logo}</span>
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={toggleLang} className="p-2 rounded-full hover:bg-zinc-500/10 transition-colors flex items-center gap-1.5">
              <Languages size={18} />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-zinc-500/10 transition-colors">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <a href="https://wa.me/971554661718" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all shadow-lg shadow-red-600/20 font-bold text-sm">
              <Phone size={16} className="shrink-0" />
              <span className="hidden sm:inline">{t.hero.cta}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src="/images/hero_car_dubai.png" 
            className="w-full h-full object-cover"
            alt="Hero Background"
          />
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-b from-zinc-950/20 via-zinc-950/60 to-zinc-950' : 'bg-gradient-to-b from-transparent via-zinc-50/40 to-zinc-50'}`} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="max-w-3xl pt-20"
          >
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="inline-block px-4 py-1 rounded-full bg-red-600/10 border border-red-600/20 text-red-600 text-xs sm:text-sm font-bold tracking-widest uppercase mb-6"
            >
              {t.hero.badge}
            </motion.span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              {t.hero.title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.a 
                href="https://wa.me/971554661718"
                target="_blank"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-red-600/30 transition-all cursor-pointer w-full sm:w-auto"
              >
                <MessageCircle size={22} />
                {t.hero.cta}
              </motion.a>
              <motion.a 
                href="#services"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-zinc-500/10 hover:bg-zinc-500/20 backdrop-blur-md px-8 py-4 rounded-xl font-bold transition-all border border-zinc-500/20 cursor-pointer flex items-center justify-center w-full sm:w-auto text-center"
              >
                {t.nav.services}
              </motion.a>
            </div>
          </motion.div>
        </div>

          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-50 hidden sm:block"
          >
            <div className="w-6 h-10 border-2 border-zinc-500 rounded-full flex justify-center p-1">
              <motion.div className="w-1 h-2 bg-zinc-500 rounded-full" />
            </div>
          </motion.div>
        </section>

        {/* Value Strip */}
      <section className={`py-12 border-y ${theme === 'dark' ? 'border-zinc-900 bg-zinc-950' : 'border-zinc-200 bg-white'}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
            {[
              { label: t.values.quality, icon: <ShieldCheck className="text-red-600 shrink-0" size={20} /> },
              { label: t.values.expert, icon: <ShieldCheck className="text-red-600 shrink-0" size={20} /> },
              { label: t.values.fast, icon: <ShieldCheck className="text-red-600 shrink-0" size={20} /> },
              { label: t.values.fair, icon: <ShieldCheck className="text-red-600 shrink-0" size={20} /> },
            ].map((v, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 justify-center md:justify-start overflow-hidden"
              >
                {v.icon}
                <span className="font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate">{v.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Marquee */}
      <div className={`py-8 overflow-hidden border-b ${theme === 'dark' ? 'bg-zinc-900/30 border-zinc-900' : 'bg-zinc-50 border-zinc-200'}`} dir="ltr">
        <motion.div 
          className="flex whitespace-nowrap"
          animate={{ x: [0, -1000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {["PORSCHE", "FERRARI", "LAMBORGHINI", "BENTLEY", "ROLLS ROYCE", "MERCEDES-BENZ", "BMW", "AUDI", "RANGE ROVER", "ASTON MARTIN", "MCLAREN", "MASERATI"].map((brand, i) => (
            <div key={i} className="flex items-center gap-4 mx-12">
              <span className="text-xl font-black tracking-[0.3em] text-zinc-500/30 hover:text-red-600/50 transition-colors cursor-default">
                {brand}
              </span>
              <div className="w-2 h-2 rounded-full bg-red-600/20" />
            </div>
          ))}
          {/* Duplicate set for loop */}
          {["PORSCHE", "FERRARI", "LAMBORGHINI", "BENTLEY", "ROLLS ROYCE", "MERCEDES-BENZ", "BMW", "AUDI", "RANGE ROVER", "ASTON MARTIN", "MCLAREN", "MASERATI"].map((brand, i) => (
            <div key={`d-${i}`} className="flex items-center gap-4 mx-12">
              <span className="text-xl font-black tracking-[0.3em] text-zinc-500/30 hover:text-red-600/50 transition-colors cursor-default">
                {brand}
              </span>
              <div className="w-2 h-2 rounded-full bg-red-600/20" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Services Section */}
      <section id="services" className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.services.title}</h2>
              <div className="h-1.5 w-20 bg-red-600 rounded-full" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md text-sm sm:text-base">
              {t.services.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <ServiceCard 
              icon={<Hammer size={28} />}
              title={t.services.maintenance.title}
              desc={t.services.maintenance.desc}
              image="/images/garage_tools_mechanic.png"
              theme={theme}
            />
            <ServiceCard 
              icon={<Info size={28} />}
              title={t.services.renovation.title}
              desc={t.services.renovation.desc}
              image="/images/hero_car_dubai.png"
              theme={theme}
            />
            <ServiceCard 
              icon={<Paintbrush size={28} />}
              title={t.services.paint.title}
              desc={t.services.paint.desc}
              image="/images/garage_interior_paint.png"
              theme={theme}
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className={`py-20 ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-100'}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: lang === 'en' ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="h-[300px] sm:h-[400px] md:h-[500px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative bg-zinc-900/5 flex items-center" dir="ltr">
                <motion.div 
                  className="flex h-full items-center"
                  animate={{ x: [0, "-50%"] }}
                  transition={{ 
                    duration: 35, 
                    ease: "linear", 
                    repeat: Infinity 
                  }}
                  style={{ width: "max-content" }} 
                >
                  {[
                    "/images/hero_car_dubai.png",
                    "/images/luxury_suv_dubai.png",
                    "/images/performance_tuning_v8.png",
                    "/images/offroad_custom_4x4.png",
                    "/images/classic_sports_car_restored.png",
                    "/images/supercar_rear_detail.png",
                    "/images/luxury_sedan_detailing.png",
                    "/images/modified_jdm_drift.png"
                  ].map((img, idx) => (
                    <div key={idx} className="w-[85vw] sm:w-[50vw] md:w-[40vw] h-full px-1.5 sm:px-2 flex-shrink-0">
                      <img 
                        src={img} 
                        alt={`Gallery ${idx}`} 
                        className="w-full h-full object-cover rounded-[1.5rem] sm:rounded-[2.5rem] shadow-lg"
                        loading="eager"
                      />
                    </div>
                  ))}
                  {/* Duplicate set for infinite effect */}
                  {[
                    "/images/hero_car_dubai.png",
                    "/images/luxury_suv_dubai.png",
                    "/images/performance_tuning_v8.png",
                    "/images/offroad_custom_4x4.png",
                    "/images/classic_sports_car_restored.png",
                    "/images/supercar_rear_detail.png",
                    "/images/luxury_sedan_detailing.png",
                    "/images/modified_jdm_drift.png"
                  ].map((img, idx) => (
                    <div key={`dup-${idx}`} className="w-[85vw] sm:w-[50vw] md:w-[40vw] h-full px-1.5 sm:px-2 flex-shrink-0">
                      <img 
                        src={img} 
                        alt={`Gallery-dup ${idx}`} 
                        className="w-full h-full object-cover rounded-[1.5rem] sm:rounded-[2.5rem] shadow-lg"
                        loading="eager"
                      />
                    </div>
                  ))}
                </motion.div>
              </div>

              <div className="absolute -bottom-6 -right-6 sm:-bottom-10 sm:-right-10 w-32 h-32 sm:w-48 sm:h-48 bg-red-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col justify-end text-white shadow-2xl z-20">
                <span className="text-2xl sm:text-4xl font-bold">{t.common.years}</span>
                <span className="text-[10px] sm:text-sm font-bold uppercase tracking-tighter opacity-90 leading-tight">{t.common.yearsExperience}</span>
              </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, x: lang === 'en' ? 50 : -50 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">{t.about.title}</h2>
              <h3 className="text-lg sm:text-xl text-red-600 font-bold mb-6 sm:mb-8">{t.about.owner}</h3>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
                {t.about.desc}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {t.about.features.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center text-red-600 shrink-0">
                      <ShieldCheck size={14} />
                    </div>
                    <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>

              <motion.a 
                href="https://wa.me/971554661718"
                target="_blank"
                whileHover={{ x: 5 }}
                className="inline-flex items-center gap-2 text-base sm:text-lg font-bold border-b-2 border-red-600 pb-1 hover:text-red-600 transition-colors"
              >
                {t.about.learnMore}
                <Phone size={18} />
              </motion.a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer className="py-16 bg-zinc-950 text-white border-t border-zinc-900">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="text-2xl font-bold tracking-tighter flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/10">
                  <Wrench size={22} />
                </div>
                <span>{t.common.logoFull}</span>
              </div>
              <p className="text-zinc-500 max-w-sm mb-8">
                {t.footer.description}
              </p>
              <div className="flex gap-4">
                <SocialLink icon={<Facebook size={20} />} href="https://www.facebook.com/share/1H9y8Zqa68/" />
                <SocialLink icon={<Phone size={20} />} href="tel:+971554661718" />
                <SocialLink icon={<MessageCircle size={20} />} href="https://wa.me/971554661718" />
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 uppercase text-sm tracking-widest text-zinc-400">{t.footer.quickLinks}</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-zinc-500 hover:text-white transition-colors">{t.nav.home}</a></li>
                <li><a href="#services" className="text-zinc-500 hover:text-white transition-colors">{t.nav.services}</a></li>
                <li><a href="#about" className="text-zinc-500 hover:text-white transition-colors">{t.nav.about}</a></li>
                <li><a href="https://wa.me/971554661718" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">{t.nav.contact}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 uppercase text-sm tracking-widest text-zinc-400">{t.footer.contact}</h4>
              <ul className="space-y-4 text-zinc-500">
                <li>{t.footer.address}</li>
                <li>Walidradwan834@gmail.com</li>
                <li>+971 55 466 1718</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-sm">
            <p>&copy; {new Date().getFullYear()} {t.common.logoFull}. {t.footer.copyright}</p>
            <p className="flex items-center gap-1 italic">{t.footer.credit}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ServiceCard = ({ icon, title, desc, image, theme }: { icon: React.ReactNode, title: string, desc: string, image: string, theme: Theme }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className={`group relative overflow-hidden rounded-[2rem] transition-all duration-300 ${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-white shadow-xl shadow-zinc-200/50'}`}
  >
    <div className="h-48 overflow-hidden relative">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-4 left-6 text-white text-red-600">
        <div className="bg-zinc-950 p-3 rounded-2xl shadow-xl">
          {icon}
        </div>
      </div>
    </div>
    <div className="p-8">
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

const SocialLink = ({ icon, href }: { icon: React.ReactNode, href: string }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noreferrer"
    className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-zinc-800 transition-all shadow-xl shadow-black/20"
  >
    {icon}
  </a>
);

export default App;
