import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    'app.title': 'إدارة العقارات والعملات',
    'nav.dashboard': 'لوحة التحكم',
    'nav.properties': 'العقارات',
    'nav.units': 'الوحدات',
    'nav.contracts': 'العقود',
    'nav.payments': 'المدفوعات',
    'nav.tenants': 'المستأجرين',
    'nav.reports': 'التقارير',
    'payment.add': 'تسجيل دفعة',
    'payment.month': 'عن شهر',
    'payment.amount': 'المبلغ',
    'dashboard.occupancy': 'نسبة الإشغال',
    'dashboard.active_contracts': 'العقود النشطة',
    'dashboard.pending_expiry': 'تنبيهات انتهاء الصلاحية (90 يوم)',
    'property.add': 'إضافة عقار جديد',
    'property.name': 'اسم العقار',
    'property.address': 'العنوان',
    'property.type': 'نوع العقار',
    'unit.add': 'إضافة وحدة',
    'unit.number': 'رقم الوحدة',
    'unit.status': 'الحالة',
    'unit.rent': 'الإيجار الشهري',
    'contract.add': 'إنشاء عقد جديد',
    'contract.tenant': 'اسم المستأجر',
    'contract.start': 'تاريخ البدء',
    'contract.end': 'تاريخ الانتهاء',
    'contract.base_rent': 'الإيجار الأساسي',
    'contract.currency': 'العملة',
    'contract.rate': 'سعر الصرف (YER)',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'status.vacant': 'شاغرة',
    'status.occupied': 'مسكونة',
    'status.maintenance': 'صيانة',
    'currency.usd': 'دولار أمريكي',
    'currency.sar': 'ريال سعودي',
    'currency.yer': 'ريال يمني'
  },
  en: {
    'app.title': 'Property & Currency Management',
    'nav.dashboard': 'Dashboard',
    'nav.properties': 'Properties',
    'nav.units': 'Units',
    'nav.contracts': 'Contracts',
    'nav.payments': 'Payments',
    'nav.tenants': 'Tenants',
    'nav.reports': 'Reports',
    'payment.add': 'Record Payment',
    'payment.month': 'For Month',
    'payment.amount': 'Amount',
    'dashboard.occupancy': 'Occupancy Rate',
    'dashboard.active_contracts': 'Active Contracts',
    'dashboard.pending_expiry': 'Pending Expiry (90 days)',
    'property.add': 'Add New Property',
    'property.name': 'Property Name',
    'property.address': 'Address',
    'property.type': 'Property Type',
    'unit.add': 'Add Unit',
    'unit.number': 'Unit Number',
    'unit.status': 'Status',
    'unit.rent': 'Monthly Rent',
    'contract.add': 'Create New Contract',
    'contract.tenant': 'Tenant Name',
    'contract.start': 'Start Date',
    'contract.end': 'End Date',
    'contract.base_rent': 'Base Rent',
    'contract.currency': 'Currency',
    'contract.rate': 'Exchange Rate (YER)',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'status.vacant': 'Vacant',
    'status.occupied': 'Occupied',
    'status.maintenance': 'Maintenance',
    'currency.usd': 'USD',
    'currency.sar': 'SAR',
    'currency.yer': 'YER'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
