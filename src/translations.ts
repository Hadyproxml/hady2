import { Translation } from './types';

export const translations: Record<'en' | 'ar', Translation> = {
  en: {
    common: {
      logo: 'ELITE GARAGE',
      logoFull: 'ELITE GARAGE DUBAI',
      years: '15+',
      yearsExperience: 'Years in Dubai',
    },
    nav: {
      home: 'Home',
      services: 'Services',
      about: 'About Us',
      contact: 'Contact',
    },
    hero: {
      badge: 'Elite Standards in Dubai',
      title: 'Precision Performance. Unmatched Elegance.',
      subtitle: 'Dubai’s premier destination for luxury car maintenance, restoration, and custom painting. Led by Waleed El-Sayed.',
      cta: 'Book a Service',
    },
    values: {
      quality: 'Quality Parts',
      expert: 'Expert Techs',
      fast: 'Fast Service',
      fair: 'Fair Pricing',
    },
    services: {
      title: 'Our Specialist Services',
      subtitle: 'We provide world-class automotive care, ensuring your vehicle performs as beautifully as it looks.',
      maintenance: {
        title: 'Full Maintenance',
        desc: 'Advanced diagnostics and mechanical repairs for high-performance vehicles using state-of-the-art technology.',
      },
      renovation: {
        title: 'Total Renovation',
        desc: 'Bringing classic and luxury cars back to their peak condition with meticulous attention to detail.',
      },
      paint: {
        title: 'Duco & Custom Color',
        desc: 'Professional painting services including full color changes and precision duco finishes with high-gloss durability.',
      },
    },
    about: {
      title: 'The Elite Standard',
      owner: 'Owner: Waleed El-Sayed',
      desc: 'With years of experience in the heart of Dubai, our garage stands as a beacon of quality. We treat every vehicle as a masterpiece, ensuring that safety and aesthetics meet the highest international standards.',
      features: ['European Specialists', 'Lifetime Warranty on Paint', 'Pick-up & Delivery Service', 'Premium Parts Only'],
      learnMore: 'Learn more about our process',
    },
    footer: {
      description: 'Visit us in Dubai for a consultation or reach out via our social channels.',
      quickLinks: 'Quick Links',
      contact: 'Contact',
      address: 'Al Quoz Industrial Area 4, Dubai, UAE',
      copyright: 'All rights reserved.',
      credit: 'Crafted with passion for performance',
    },
  },
  ar: {
    common: {
      logo: 'إليت جراج',
      logoFull: 'إليت جراج دبي',
      years: '+١٥',
      yearsExperience: 'عاماً في دبي',
    },
    nav: {
      home: 'الرئيسية',
      services: 'خدماتنا',
      about: 'من نحن',
      contact: 'اتصل بنا',
    },
    hero: {
      badge: 'معايير النخبة في دبي',
      title: 'أداء دقيق. فخامة لا تضاهى.',
      subtitle: 'الوجهة الأولى في دبي لصيانة السيارات الفاخرة، والترميم، والدهان المخصص. تحت إشراف وليد السيد.',
      cta: 'احجز موعداً',
    },
    values: {
      quality: 'قطع غيار أصلية',
      expert: 'فنيون خبراء',
      fast: 'خدمة سريعة',
      fair: 'أسعار عادلة',
    },
    services: {
      title: 'خدماتنا المتخصصة',
      subtitle: 'نقدم رعاية سيارات عالمية المستوى، مما يضمن أداء سيارتك بجمال يضاهي مظهرها.',
      maintenance: {
        title: 'صيانة كاملة',
        desc: 'تشخيص متقدم وإصلاحات ميكانيكية للسيارات عالية الأداء باستخدام أحدث التقنيات.',
      },
      renovation: {
        title: 'تجديد شامل',
        desc: 'إعادة السيارات الكلاسيكية والفاخرة إلى حالتها المثالية مع اهتمام دقيق بالتفاصيل.',
      },
      paint: {
        title: 'دوكو وتغيير اللون',
        desc: 'خدمات دهان احترافية تشمل تغيير اللون بالكامل وتشطيبات دوكو دقيقة بمتانة عالية ولمعان فائق.',
      },
    },
    about: {
      title: 'معيار النخبة',
      owner: 'المالك: وليد السيد',
      desc: 'مع سنوات من الخبرة في قلب دبي، يقف الكراج كرمز للجودة. نتعامل مع كل سيارة كتحفة فنية، مع ضمان تلبية معايير السلامة والجمال لأعلى المستويات العالمية.',
      features: ['متخصصون في السيارات الأوروبية', 'ضمان مدى الحياة على الدهان', 'خدمة الاستلام والتوصيل', 'قطع غيار ممتازة فقط'],
      learnMore: 'تعرف على المزيد حول عمليتنا',
    },
    footer: {
      description: 'تفضل بزيارتنا في دبي للاستشارة أو تواصل معنا عبر قنواتنا الاجتماعية.',
      quickLinks: 'روابط سريعة',
      contact: 'اتصل بنا',
      address: 'منطقة القوز الصناعية ٤، دبي، الإمارات العربية المتحدة',
      copyright: 'جميع الحقوق محفوظة.',
      credit: 'صُنع بشغف للأداء العالي',
    },
  },
};
