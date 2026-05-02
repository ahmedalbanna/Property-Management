import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Info } from 'lucide-react';
import { UnitStatus, Currency } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useUnits } from '../hooks/useUnits';
import { useProperties } from '../hooks/useProperties';

export default function UnitListView() {
  const { t } = useLanguage();
  const { properties, isLoading: pLoading } = useProperties();
  const { units, isLoading: uLoading, addUnit, deleteUnit } = useUnits();
  
  const loading = pLoading || uLoading;
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: '',
    unitNumber: '',
    status: 'vacant' as UnitStatus,
    area: 0,
    baseMonthlyRent: 0,
    currency: 'USD' as Currency,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addUnit(formData);
      setIsAdding(false);
      setFormData({ propertyId: '', unitNumber: '', status: 'vacant', area: 0, baseMonthlyRent: 0, currency: 'USD' });
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
    try {
      await deleteUnit(id);
    } catch (err) {
      // Error handled in hook
    }
  };

  const getStatusColor = (status: UnitStatus) => {
    switch (status) {
      case 'vacant': return 'bg-green-100 text-green-700';
      case 'occupied': return 'bg-blue-100 text-blue-700';
      case 'maintenance': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('nav.units')}</h2>
          <p className="text-slate-400 text-sm mt-1">تتبع حالة ومواصفات الوحدات العقارية</p>
        </div>
        <button 
          disabled={properties.length === 0}
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>{t('unit.add')}</span>
        </button>
      </header>

      {properties.length === 0 && !loading && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-xl flex gap-4 text-amber-500 items-start">
          <Info className="w-6 h-6 flex-shrink-0" />
          <div>
             <p className="font-bold text-sm uppercase tracking-wide">تنبيه هندسي</p>
             <p className="text-xs opacity-80 mt-1">يجب إضافة عقار واحد على الأقل قبل إضافة الوحدات لضمان توازن الهيكل التنظيمي.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="geometric-card p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">العقار</label>
                <select 
                  required
                  value={formData.propertyId}
                  onChange={e => setFormData({ ...formData, propertyId: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                >
                  <option value="">اختر العقار المعني</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.number')}</label>
                <input 
                  required
                  value={formData.unitNumber}
                  onChange={e => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.status')}</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as UnitStatus })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                >
                  <option value="vacant">{t('status.vacant')}</option>
                  <option value="occupied">{t('status.occupied')}</option>
                  <option value="maintenance">{t('status.maintenance')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المساحة الإجمالية</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={formData.area}
                    onChange={e => setFormData({ ...formData, area: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-black">M²</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.rent')}</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={formData.baseMonthlyRent}
                    onChange={e => setFormData({ ...formData, baseMonthlyRent: Number(e.target.value) })}
                    className="flex-1 px-4 py-3 bg-black border border-border rounded-lg text-white font-mono focus:ring-2 focus:ring-primary outline-none text-left"
                  />
                  <select 
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                    className="w-24 px-2 py-3 bg-black border border-border rounded-lg text-white font-black text-[10px] focus:ring-2 focus:ring-primary outline-none appearance-none text-center"
                  >
                    <option value="USD">USD</option>
                    <option value="SAR">SAR</option>
                    <option value="YER">YER</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-border">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-10 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden geometric-card">
        <table className="w-full text-right">
          <thead className="bg-slate-950 border-b border-border">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.number')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('nav.properties')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.status')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('unit.rent')}</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-slate-900/30">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                </tr>
              ))
            ) : units.length === 0 ? (
               <tr>
                 <td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold italic">لا توجد وحدات نشطة ضمن الهيكل الحالي</td>
               </tr>
            ) : (
              units.map(unit => {
                const property = properties.find(p => p.id === unit.propertyId);
                return (
                  <tr key={unit.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5 font-mono font-bold text-white tracking-widest">{unit.unitNumber}</td>
                    <td className="px-8 py-5 text-slate-400 font-medium">{property?.name || '---'}</td>
                    <td className="px-8 py-5">
                      <span className={cn("px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-tighter", 
                        unit.status === 'vacant' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' :
                        unit.status === 'occupied' ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-500' :
                        'border-amber-500/20 bg-amber-500/5 text-amber-500'
                      )}>
                        {t(`status.${unit.status}`)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-300 font-mono text-sm">
                      {unit.baseMonthlyRent.toLocaleString()} <span className="text-[10px] text-slate-500 font-black">{unit.currency}</span>
                    </td>
                    <td className="px-8 py-5">
                       <button 
                         onClick={() => handleDelete(unit.id)}
                         className="p-2 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
