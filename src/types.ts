export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export interface Translation {
  common: {
    logo: string;
    logoFull: string;
    years: string;
    yearsExperience: string;
  };
  nav: {
    home: string;
    services: string;
    about: string;
    contact: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  values: {
    quality: string;
    expert: string;
    fast: string;
    fair: string;
  };
  services: {
    title: string;
    subtitle: string;
    maintenance: {
      title: string;
      desc: string;
    };
    renovation: {
      title: string;
      desc: string;
    };
    paint: {
      title: string;
      desc: string;
    };
  };
  about: {
    title: string;
    owner: string;
    desc: string;
    features: string[];
    learnMore: string;
  };
  footer: {
    description: string;
    quickLinks: string;
    contact: string;
    address: string;
    copyright: string;
    credit: string;
  };
}
