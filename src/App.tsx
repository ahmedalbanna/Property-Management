/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { 
  Building2, 
  LayoutDashboard, 
  Box, 
  FileText, 
  CreditCard, 
  LogOut, 
  Languages,
  Plus,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  User,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Views
import DashboardView from './components/DashboardView';
import PropertyListView from './components/PropertyListView';
import UnitListView from './components/UnitListView';
import ContractListView from './components/ContractListView';
import PaymentListView from './components/PaymentListView';
import TenantListView from './components/TenantListView';
import ReportsView from './components/ReportsView';
import MaintenanceListView from './components/MaintenanceListView';

type ViewType = 'dashboard' | 'properties' | 'units' | 'contracts' | 'payments' | 'tenants' | 'reports' | 'maintenance';

function Sidebar({ currentView, setView }: { currentView: ViewType; setView: (v: ViewType) => void }) {
  const { t, language, setLanguage } = useLanguage();
  const { logout, user } = useAuth();

  const navItems: { id: ViewType; label: string; icon: any }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'properties', label: t('nav.properties'), icon: Building2 },
    { id: 'units', label: t('nav.units'), icon: Box },
    { id: 'contracts', label: t('nav.contracts'), icon: FileText },
    { id: 'payments', label: t('nav.payments'), icon: CreditCard },
    { id: 'tenants', label: t('nav.tenants'), icon: User },
    { id: 'maintenance', label: t('nav.maintenance'), icon: Wallet },
    { id: 'reports', label: t('nav.reports'), icon: TrendingUp },
  ];

  return (
    <div className="w-64 bg-slate-950 text-white flex flex-col h-screen fixed inset-y-0 right-0 lg:static z-50 border-l border-border">
      <div className="p-8 border-b border-border">
        <h1 className="text-xl font-display font-bold flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center border border-primary/20">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <span className="truncate">{t('app.title')}</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 py-6">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 text-right group",
              currentView === item.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform",
              currentView === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="font-semibold text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-border space-y-4">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
        >
          <Languages className="w-4 h-4" />
          <span>{language === 'ar' ? 'English' : 'بالعربية'}</span>
        </button>
        
        <div className="pt-2 flex items-center justify-between px-3">
           <div className="flex flex-col truncate">
             <span className="text-[10px] text-slate-500 uppercase tracking-tighter truncate">{user?.email}</span>
           </div>
           <button 
             onClick={logout}
             className="p-2 text-slate-500 hover:text-red-400 transition-colors"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
}

function MainContent({ view }: { view: ViewType }) {
  return (
    <motion.main
      key={view}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex-1 p-10 overflow-y-auto geometric-grid"
    >
      <AnimatePresence mode="wait">
        {view === 'dashboard' && <DashboardView />}
        {view === 'properties' && <PropertyListView />}
        {view === 'units' && <UnitListView />}
        {view === 'contracts' && <ContractListView />}
        {view === 'payments' && <PaymentListView />}
        {view === 'tenants' && <TenantListView />}
        {view === 'reports' && <ReportsView />}
        {view === 'maintenance' && <MaintenanceListView />}
      </AnimatePresence>
    </motion.main>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface geometric-grid p-6">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900 p-10 rounded-xl border border-border shadow-2xl max-w-md w-full text-center space-y-8"
      >
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto border border-primary/20">
          <Building2 className="w-12 h-12" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold text-white leading-tight">{t('app.title')}</h1>
          <p className="text-slate-400 font-medium">{t('app.subtitle')}</p>
        </div>
        <button
          onClick={login}
          className="w-full py-4 px-6 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-3 active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 brightness-200" alt="Google" />
          {t('auth.login')}
        </button>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest pt-4">© 2026 Ink & Quill Property</p>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { dir } = useLanguage();
  const [currentView, setView] = useState<ViewType>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-2 border-primary/20 rounded-xl"></div>
          <div className="absolute inset-0 border-t-2 border-primary rounded-xl animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden font-sans" dir={dir}>
      <Sidebar currentView={currentView} setView={setView} />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <MainContent view={currentView} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
