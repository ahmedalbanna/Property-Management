import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Search } from 'lucide-react';
import { ExchangeRate } from '../types';
import { currencyService } from '../services/currencyService';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { usePayments } from '../hooks/usePayments';
import { useContracts } from '../hooks/useContracts';

export default function PaymentListView() {
  const { t } = useLanguage();
  const { payments, isLoading: pLoading, addPayment, deletePayment } = usePayments();
  const { contracts, isLoading: cLoading } = useContracts();
  
  const loading = pLoading || cLoading;
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalRates, setGlobalRates] = useState<ExchangeRate | null>(null);

  useEffect(() => {
    currencyService.getLatestRates().then(setGlobalRates).catch(console.error);
  }, []);

  const [formData, setFormData] = useState({
    contractId: '',
    amountPaidBase: 0,
    amountPaidLocal: 0,
    exchangeRateAtPayment: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    monthCovered: format(new Date(), 'yyyy-MM'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentData = {
        ...formData,
        paymentDate: formData.paymentDate,
      };
      
      await addPayment(paymentData);
      setIsAdding(false);
      setFormData({
        contractId: '',
        amountPaidBase: 0,
        amountPaidLocal: 0,
        exchangeRateAtPayment: 0,
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        monthCovered: format(new Date(), 'yyyy-MM'),
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل المالي؟')) return;
    try {
      await deletePayment(id);
    } catch (err) {
      // Error handled in hook
    }
  };

  const filteredPayments = payments.filter(p => {
    const contract = contracts.find(c => c.id === p.contractId);
    return contract?.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-10 pb-12">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('nav.payments')}</h2>
          <p className="text-slate-400 text-sm mt-1">تتبع التدفقات النقدية والتحويلات للعملة المحلية</p>
        </div>
        <button 
          disabled={contracts.length === 0}
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold active:scale-95 disabled:opacity-30"
        >
          <Plus className="w-5 h-5" />
          <span>تسجيل دفعة</span>
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
            <form onSubmit={handleSubmit} className="geometric-card p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">العقد المستهدف</label>
                <select 
                  required
                  value={formData.contractId}
                  onChange={e => {
                    const contract = contracts.find(c => c.id === e.target.value);
                    let autoRate = contract?.conversionRate || 0;
                    
                    // Auto-suggest fresh global rate for USD contracts
                    if (globalRates && contract?.baseCurrency === 'USD') {
                      autoRate = globalRates.rates['YER'] || autoRate;
                    }

                    setFormData({ 
                      ...formData, 
                      contractId: e.target.value,
                      exchangeRateAtPayment: autoRate,
                      amountPaidBase: contract?.baseRent || 0,
                      amountPaidLocal: (contract?.baseRent || 0) * autoRate
                    });
                  }}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="">اختر المستأجر المقيد</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.tenantName} - {c.baseRent} {c.baseCurrency}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">المبلغ (Base Currency)</label>
                <input 
                  type="number"
                  required
                  value={formData.amountPaidBase}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData({ ...formData, amountPaidBase: val, amountPaidLocal: val * formData.exchangeRateAtPayment });
                  }}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">سعر الصرف وقت الدفع</label>
                <input 
                  type="number"
                  required
                  value={formData.exchangeRateAtPayment}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData({ ...formData, exchangeRateAtPayment: val, amountPaidLocal: formData.amountPaidBase * val });
                  }}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">المعادل بالريال اليمني (YER)</label>
                <div className="px-4 py-3 bg-slate-950 border border-border rounded-lg text-emerald-500 font-mono font-bold">
                  {formData.amountPaidLocal.toLocaleString()} YER
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">تاريخ السداد</label>
                <input 
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">عن شهر</label>
                <input 
                  type="month"
                  required
                  value={formData.monthCovered}
                  onChange={e => setFormData({ ...formData, monthCovered: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-border mt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">{t('common.cancel')}</button>
                <button type="submit" className="px-12 py-3 bg-primary text-white rounded-lg font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">تسجيل العملية</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="geometric-card overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-border flex items-center gap-4">
           <Search className="w-4 h-4 text-slate-600" />
           <input 
             placeholder="بحث باسم المستأجر..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="bg-transparent border-none outline-none text-sm text-white flex-1"
           />
        </div>
        <table className="w-full text-right">
          <thead className="bg-slate-950/50 border-b border-border">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">المستأجر</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">التاريخ</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">عن فترة</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">القيمة الأساسية</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">القيمة المحلية (YER)</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-slate-900/20">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-8 py-6"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                </tr>
              ))
            ) : filteredPayments.length === 0 ? (
               <tr>
                 <td colSpan={6} className="px-8 py-20 text-center text-slate-600 font-bold italic">لا توجد عمليات دفع قيد التسجيل</td>
               </tr>
            ) : (
              filteredPayments.map(payment => {
                const contract = contracts.find(c => c.id === payment.contractId);
                const paymentDate = payment.paymentDate instanceof Timestamp ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
                
                return (
                  <tr key={payment.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                          <span className="font-bold text-white">{contract?.tenantName || '---'}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-tight">{contract?.baseCurrency} Account</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-slate-400 font-mono text-sm">{format(paymentDate, 'yyyy-MM-dd')}</td>
                    <td className="px-8 py-5">
                       <span className="px-2 py-1 bg-slate-950 border border-border rounded text-[10px] font-black text-slate-300">
                         {payment.monthCovered}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-white font-mono font-bold">
                       {payment.amountPaidBase.toLocaleString()} <span className="text-[10px] text-primary">{contract?.baseCurrency}</span>
                    </td>
                    <td className="px-8 py-5 text-emerald-500 font-mono font-bold">
                       {payment.amountPaidLocal.toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                       <button 
                         onClick={() => handleDeleteClick(payment.id)}
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
