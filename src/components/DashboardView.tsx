import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Building2, Box, FileText, AlertCircle, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { Contract, Unit, Payment, ExchangeRate } from '../types';
import { currencyService } from '../services/currencyService';
import { addDays, isAfter, isBefore } from 'date-fns';

export default function DashboardView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalUnits: 0,
    occupiedUnits: 0,
    activeContracts: 0,
    expiringSoon: 0,
    totalRevenueYER: 0,
  });
  const [rates, setRates] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        const unitsSnap = await getDocs(query(collection(db, 'units'), where('ownerId', '==', user.uid)));
        const units = unitsSnap.docs.map(doc => doc.data() as Unit);
        
        const contractsSnap = await getDocs(query(collection(db, 'contracts'), where('ownerId', '==', user.uid)));
        const contracts = contractsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contract));

        const activeBatch = contracts.filter(c => c.status === 'active');
        
        const now = new Date();
        const ninetyDaysFromNow = addDays(now, 90);
        
        const expiring = activeBatch.filter(c => {
          const endDate = c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate);
          return isAfter(endDate, now) && isBefore(endDate, ninetyDaysFromNow);
        });

        // Fetch payments for revenue
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('ownerId', '==', user.uid)));
        const userPayments = paymentsSnap.docs.map(doc => doc.data() as Payment);
        const totalRev = userPayments.reduce((acc, p) => acc + (p.amountPaidLocal || 0), 0);

        setStats({
          totalUnits: units.length,
          occupiedUnits: units.filter(u => u.status === 'occupied').length,
          activeContracts: activeBatch.length,
          expiringSoon: expiring.length,
          totalRevenueYER: totalRev,
        });

        // Fetch rates
        const latestRates = await currencyService.getLatestRates();
        setRates(latestRates);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const cards = [
    { label: t('dashboard.occupancy'), value: `${stats.totalUnits ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0}%`, icon: Box, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: t('dashboard.active_contracts'), value: stats.activeContracts, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'إجمالي الإيرادات (YER)', value: stats.totalRevenueYER.toLocaleString(), icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    { label: t('dashboard.pending_expiry'), value: stats.expiringSoon, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'إجمالي الوحدات', value: stats.totalUnits, icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500 font-mono animate-pulse uppercase tracking-widest text-xs">جمع البيانات الهندسية...</div>
    </div>
  );

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('nav.dashboard')}</h2>
          <p className="text-slate-400 text-sm mt-1">تحديثات فورية للأصول العقارية</p>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-border">
          <Calendar className="w-3 h-3" />
          <span>{new Date().toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' })}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="geometric-card p-6 flex flex-col gap-4 group">
            <div className={`w-12 h-12 rounded-lg ${card.bg} ${card.color} flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-3xl font-display font-bold text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {rates && (
        <div className="geometric-card p-6 bg-slate-900/30 border-dashed border-primary/20">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">أسعار الصرف اللحظية (USD Reference)</h3>
             </div>
             <span className="text-[10px] font-mono text-slate-600">تحديث: {new Date(rates.lastUpdated instanceof Timestamp ? rates.lastUpdated.toDate() : rates.lastUpdated).toLocaleTimeString()}</span>
          </div>
          <div className="flex gap-8">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">YER / USD</span>
                <span className="text-xl font-display font-bold text-white">{rates.rates.YER?.toLocaleString()} <span className="text-[10px] text-slate-500">YER</span></span>
             </div>
             <div className="flex flex-col border-r border-border pr-8">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">SAR / USD</span>
                <span className="text-xl font-display font-bold text-white">{rates.rates.SAR?.toLocaleString()} <span className="text-[10px] text-slate-500">SAR</span></span>
             </div>
             <div className="flex-1 flex items-center justify-end">
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-500 font-bold uppercase tracking-widest">مفعلة وتلقائية</div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="geometric-card p-8 min-h-[350px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-violet-500"></div>
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
               <TrendingUp className="w-5 h-5 text-primary" />
               <h3 className="text-lg font-display font-bold text-white uppercase tracking-tight">نظرة عامة على الإيرادات</h3>
             </div>
             <span className="text-[10px] font-mono text-slate-500 border border-border px-2 py-0.5 rounded uppercase">Experimental</span>
          </div>
          <div className="flex flex-col items-center justify-center h-[200px] border border-dashed border-border rounded-xl bg-slate-950/20">
            <TrendingUp className="w-12 h-12 text-slate-800 mb-4" />
            <p className="text-slate-600 font-medium text-sm">سيتم تفعيل الرسوم البيانية الهندسية عند اكتمال البيانات</p>
          </div>
        </div>
        
        <div className="geometric-card p-8">
          <div className="flex items-center gap-3 mb-8">
             <AlertCircle className="w-5 h-5 text-amber-400" />
             <h3 className="text-lg font-display font-bold text-white uppercase tracking-tight">{t('dashboard.pending_expiry')}</h3>
          </div>
          <div className="space-y-6">
            {stats.expiringSoon === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-slate-600 font-medium italic">لا توجد عقود تنتهي قريباً ضمن النطاق الهندسي المحدد</p>
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-xl">
                <p className="text-slate-300 font-medium leading-relaxed">
                  هناك <span className="text-amber-400 font-bold text-xl px-1">{stats.expiringSoon}</span> عقود تقترب من نقطة النهاية. يوصى بالمراجعة الفورية لضمان الاستقرار.
                </p>
              </div>
            )}
            
            <div className="pt-4 space-y-3">
               <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-primary w-[65%]" />
               </div>
               <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                  <span>نسبة الإشغال الحالية</span>
                  <span>65% Target</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
