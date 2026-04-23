import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, TrendingUp, AlertCircle, Calendar, Download, Filter, DollarSign, Wallet } from 'lucide-react';
import { Property, Unit, Payment, MaintenanceRecord, Contract, Currency } from '../types';
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '../lib/utils';

export default function ReportsView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  const fetchData = async () => {
    if (!user) return;
    try {
      const [pSnap, uSnap, paySnap, mSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'properties'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'units'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'payments'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'maintenance'), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, 'contracts'), where('ownerId', '==', user.uid))),
      ]);

      setProperties(pSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Property)));
      setUnits(uSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Unit)));
      setPayments(paySnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment)));
      setMaintenance(mSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MaintenanceRecord)));
      setContracts(cSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contract)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Derived Metrics
  const filteredData = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const checkDate = (date: any) => {
      const d = date instanceof Timestamp ? date.toDate() : new Date(date);
      return isWithinInterval(d, { start, end });
    };

    const pFiltered = payments.filter(p => {
      const contract = contracts.find(c => c.id === p.contractId);
      const unit = units.find(u => u.id === contract?.unitId);
      const matchesProp = selectedPropertyId === 'all' || unit?.propertyId === selectedPropertyId;
      return matchesProp && checkDate(p.paymentDate);
    });

    const mFiltered = maintenance.filter(m => {
      const matchesProp = selectedPropertyId === 'all' || m.propertyId === selectedPropertyId;
      return matchesProp && checkDate(m.date);
    });

    return { payments: pFiltered, maintenance: mFiltered };
  }, [payments, maintenance, contracts, units, dateRange, selectedPropertyId]);

  // Income by Currency
  const incomeByCurrency = useMemo(() => {
    const totals: Record<string, number> = { USD: 0, SAR: 0, YER: 0 };
    filteredData.payments.forEach(p => {
      const contract = contracts.find(c => c.id === p.contractId);
      if (contract) {
        totals[contract.baseCurrency] += p.amountPaidBase;
      }
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [filteredData, contracts]);

  // Profitability Chart Data (Monthly)
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; income: number; expense: number }> = {};
    
    filteredData.payments.forEach(p => {
      const month = p.monthCovered; // YYYY-MM
      if (!data[month]) data[month] = { month, income: 0, expense: 0 };
      data[month].income += p.amountPaidLocal;
    });

    filteredData.maintenance.forEach(m => {
      const d = m.date instanceof Timestamp ? m.date.toDate() : new Date(m.date);
      const month = format(d, 'yyyy-MM');
      if (!data[month]) data[month] = { month, income: 0, expense: 0 };
      // Simplified: assume maintenance cost is in YER for reporting or convert if needed
      // Here we assume it's stored in YER or converted during save typically
      data[month].expense += m.cost; 
    });

    return Object.values(data).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  // Vacancy Rate
  const vacancyStats = useMemo(() => {
    const relevantUnits = selectedPropertyId === 'all' 
      ? units 
      : units.filter(u => u.propertyId === selectedPropertyId);
    
    if (relevantUnits.length === 0) return { total: 0, vacant: 0, rate: 0 };
    const vacant = relevantUnits.filter(u => u.status === 'vacant').length;
    return {
      total: relevantUnits.length,
      vacant,
      rate: Math.round((vacant / relevantUnits.length) * 100)
    };
  }, [units, selectedPropertyId]);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b'];

  if (loading) return <div className="p-10 text-center text-slate-500 font-mono animate-pulse uppercase tracking-widest text-xs">جاري تحليل البيانات المالية...</div>;

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">التقارير المالية</h2>
          <p className="text-slate-400 text-sm mt-1">تحليل شامل للإيرادات، المصاريف، ونسب الإشغال</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black border border-border rounded-lg px-3 py-1.5">
             <Calendar className="w-4 h-4 text-primary" />
             <input 
               type="date" 
               value={dateRange.start} 
               onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
               className="bg-transparent text-xs text-white outline-none font-mono"
             />
             <span className="text-slate-700">-</span>
             <input 
               type="date" 
               value={dateRange.end} 
               onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
               className="bg-transparent text-xs text-white outline-none font-mono"
             />
          </div>

          <div className="flex items-center gap-2 bg-black border border-border rounded-lg px-3 py-1.5">
             <Filter className="w-4 h-4 text-primary" />
             <select 
               value={selectedPropertyId}
               onChange={e => setSelectedPropertyId(e.target.value)}
               className="bg-transparent text-xs text-white outline-none appearance-none cursor-pointer pr-4"
             >
               <option value="all">كافة العقارات</option>
               {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>

          <button className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="geometric-card p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">إجمالي الدخل (YER)</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {filteredData.payments.reduce((acc, p) => acc + p.amountPaidLocal, 0).toLocaleString()}
            </div>
         </div>

         <div className="geometric-card p-6 border-l-4 border-l-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">إجمالي المصاريف (YER)</span>
            </div>
            <div className="text-2xl font-display font-bold text-white">
              {filteredData.maintenance.reduce((acc, m) => acc + m.cost, 0).toLocaleString()}
            </div>
         </div>

         <div className="geometric-card p-6 border-l-4 border-l-indigo-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">نسبة الشواغر</span>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-2xl font-display font-bold text-white">{vacancyStats.rate}%</div>
              <div className="text-[10px] text-slate-500 mb-1">({vacancyStats.vacant} / {vacancyStats.total} وحدة)</div>
            </div>
         </div>

         <div className="geometric-card p-6 border-l-4 border-l-primary">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">صافي الربح التقديري</span>
            </div>
            <div className="text-2xl font-display font-bold text-emerald-500">
              {(filteredData.payments.reduce((acc, p) => acc + p.amountPaidLocal, 0) - filteredData.maintenance.reduce((acc, m) => acc + m.cost, 0)).toLocaleString()}
              <span className="text-xs text-slate-500 mr-2 font-mono">YER</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-8 geometric-card p-8">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">أداء التدفق النقدي الشهري (YER)</h3>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] text-slate-500 font-bold">الدخل</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[10px] text-slate-500 font-bold">المصاريف</span>
                 </div>
              </div>
           </div>
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickFormatter={val => val.split('-').reverse().join('/')} 
                    />
                    <YAxis stroke="#475569" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '10px' }}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Side Charts */}
        <div className="lg:col-span-4 flex flex-col gap-8">
           <div className="geometric-card p-8 flex-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300 mb-8 border-b border-border pb-4">توزيع الدخل حسب العملة</h3>
              <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={incomeByCurrency}
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                       >
                         {incomeByCurrency.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '10px' }}
                       />
                       <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="geometric-card p-8 flex-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300 mb-6 border-b border-border pb-4">أعلى وحدات مدرة للربح</h3>
              <div className="space-y-4">
                 {units.sort((a, b) => b.baseMonthlyRent - a.baseMonthlyRent).slice(0, 3).map((u, i) => (
                   <div key={u.id} className="flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center text-[10px] font-black text-slate-600 border border-border group-hover:border-primary transition-colors">#{i+1}</div>
                         <div className="text-[10px] font-bold text-white uppercase tracking-tight">{u.unitNumber} <span className="text-slate-600 font-normal">({u.currency})</span></div>
                      </div>
                      <div className="text-right">
                         <div className="text-xs font-mono font-bold text-emerald-500">{u.baseMonthlyRent.toLocaleString()}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
