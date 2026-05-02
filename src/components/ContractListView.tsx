import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Calendar, DollarSign, User, BadgeAlert, FileText } from 'lucide-react';
import { Currency, ContractStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';
import { useContracts } from '../hooks/useContracts';
import { useUnits } from '../hooks/useUnits';
import { useProperties } from '../hooks/useProperties';
import { useTenants } from '../hooks/useTenants';

export default function ContractListView() {
  const { t } = useLanguage();
  const { contracts, isLoading: cLoading, addContract, deleteContract } = useContracts();
  const { units, isLoading: uLoading } = useUnits();
  const { properties, isLoading: pLoading } = useProperties();
  const { tenants, isLoading: tLoading } = useTenants();

  const loading = cLoading || uLoading || pLoading || tLoading;
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    unitId: '',
    tenantId: '',
    tenantName: '',
    tenantPhone: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
    baseRent: 0,
    baseCurrency: 'USD' as Currency,
    conversionRate: 1,
    escalationPercentage: 10,
    status: 'active' as ContractStatus,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const contractData = {
        ...formData,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
      };
      
      await addContract(contractData);
      setIsAdding(false);
      setFormData({ 
        unitId: '', tenantId: '', tenantName: '', tenantPhone: '', 
        startDate: format(new Date(), 'yyyy-MM-dd'), 
        endDate: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
        baseRent: 0, baseCurrency: 'USD', conversionRate: 1, escalationPercentage: 10, status: 'active' 
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleDeleteClick = async (contract: any) => {
    if (!confirm('هل أنت متأكد من حذف هذا العقد؟')) return;
    try {
      await deleteContract(contract.id);
    } catch (err) {
      // Error handled in hook
    }
  };

  const getDaysRemaining = (endDateStr: any) => {
    const end = endDateStr instanceof Timestamp ? endDateStr.toDate() : new Date(endDateStr);
    return differenceInDays(end, new Date());
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('nav.contracts')}</h2>
          <p className="text-slate-400 text-sm mt-1">إدارة الاتفاقيات المالية وتحديثات العملات</p>
        </div>
        <button 
          disabled={units.filter(u => u.status === 'vacant').length === 0}
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>{t('contract.add')}</span>
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="geometric-card p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/30"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">الوحدة المتاحة</label>
                    <select 
                      required
                      value={formData.unitId}
                      onChange={e => {
                        const unit = units.find(u => u.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          unitId: e.target.value,
                          baseRent: unit?.baseMonthlyRent || 0,
                          baseCurrency: unit?.currency || 'USD'
                        });
                      }}
                      className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white appearance-none outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">اختر الوحدة الشاغرة</option>
                      {units.filter(u => u.status === 'vacant').map(u => (
                        <option key={u.id} value={u.id}>{properties.find(p => p.id === u.propertyId)?.name} - {u.unitNumber}</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">ربط بمستأجر مسجل</label>
                    <select 
                      value={formData.tenantId}
                      onChange={e => {
                        const tenant = tenants.find(t => t.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          tenantId: e.target.value,
                          tenantName: tenant?.name || '',
                          tenantPhone: tenant?.phone || ''
                        });
                      }}
                      className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white appearance-none outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">(اختياري) اختر مستأجر</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('contract.tenant')}</label>
                    <input 
                      required
                      value={formData.tenantName}
                      onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">هاتف المستأجر</label>
                    <input 
                      required
                      value={formData.tenantPhone}
                      onChange={e => setFormData({ ...formData, tenantPhone: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-border">
                 <div className="space-y-6">
                    <h3 className="font-display font-bold text-white uppercase tracking-tight flex items-center gap-3">
                       <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                         <Calendar className="w-4 h-4 text-primary" />
                       </div>
                       مدة العقد الهندسية
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">تاريخ التنفيذ</label>
                          <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white font-mono text-sm uppercase tracking-tighter" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">نهاية الصلاحية</label>
                          <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white font-mono text-sm uppercase tracking-tighter" />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6 text-right">
                    <h3 className="font-display font-bold text-white uppercase tracking-tight flex items-center gap-3 justify-end leading-none">
                       القيم المالية والصرف
                       <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                         <DollarSign className="w-4 h-4 text-emerald-500" />
                       </div>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">الإيجار (Base)</label>
                          <input type="number" value={formData.baseRent} onChange={e => setFormData({ ...formData, baseRent: Number(e.target.value) })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-left font-mono" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">الصرف (YER)</label>
                          <input type="number" value={formData.conversionRate} onChange={e => setFormData({ ...formData, conversionRate: Number(e.target.value) })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-left font-mono" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-8 border-t border-border">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">{t('common.cancel')}</button>
                <button type="submit" className="px-12 py-3 bg-primary text-white rounded-lg font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">{t('common.save')}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {loading ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-64 bg-slate-900/50 animate-pulse rounded-xl border border-border" />
           ))
        ) : contracts.length === 0 ? (
          <div className="col-span-full py-24 text-center border border-dashed border-border rounded-2xl bg-slate-900/20">
             <FileText className="w-16 h-16 text-slate-800 mx-auto mb-6" />
             <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">لا توجد سجلات تعاقدية حالية</p>
          </div>
        ) : (
          contracts.map(contract => {
            const unit = units.find(u => u.id === contract.unitId);
            const property = properties.find(p => unit && p.id === unit.propertyId);
            const daysLeft = getDaysRemaining(contract.endDate);
            const isExpiringSoon = daysLeft > 0 && daysLeft <= 90;
            const isOverdue = daysLeft <= 0;

            return (
              <motion.div 
                layout
                key={contract.id}
                className="group geometric-card relative overflow-hidden flex flex-col h-full"
              >
                <div className="absolute top-0 right-0 w-1.5 h-full bg-primary/20 transition-all group-hover:bg-primary"></div>
                
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-950 border border-border text-primary rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                        <User className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-white text-xl leading-tight group-hover:text-primary transition-colors">{contract.tenantName}</h3>
                        <p className="text-sm text-slate-500 font-mono mt-1 font-medium">{contract.tenantPhone}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={cn(
                         "px-3 py-1 rounded border text-[10px] font-black uppercase tracking-tighter",
                         contract.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-slate-500/20 bg-slate-500/5 text-slate-500'
                       )}>
                         {contract.status === 'active' ? 'ACTIVE' : 'EXPIRED'}
                       </span>
                       {isExpiringSoon && (
                         <span className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black uppercase tracking-tighter bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                           <BadgeAlert className="w-3.5 h-3.5" />
                           {daysLeft} DAYS LEFT
                         </span>
                       )}
                       {isOverdue && (
                         <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-tighter bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                           <BadgeAlert className="w-3.5 h-3.5" />
                           TERM EXPIRED
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 bg-black/40 p-5 border border-border rounded-xl mb-8">
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest leading-none">Structure Node</p>
                        <p className="text-sm font-bold text-white truncate uppercase tracking-tight">{property?.name} / {unit?.unitNumber}</p>
                     </div>
                     <div className="space-y-1 border-r border-border pr-5">
                        <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest leading-none">Market Rate</p>
                        <p className="text-sm font-mono font-bold text-slate-300">1 {contract.baseCurrency} = {contract.conversionRate.toLocaleString()} YER</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border">
                     <div>
                        <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest leading-none mb-2">Monthly Resource Yield</p>
                        <div className="flex items-baseline gap-3">
                           <p className="text-3xl font-display font-bold text-primary tracking-tighter">{contract.baseRent.toLocaleString()} {contract.baseCurrency}</p>
                           <p className="text-xs font-mono font-bold text-slate-500 opacity-60">≈ {(contract.baseRent * contract.conversionRate).toLocaleString()} YER</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => handleDeleteClick(contract)}
                       className="p-3 text-slate-700 hover:text-red-500 transition-colors bg-slate-950 border border-border rounded-lg hover:border-red-500/50"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
