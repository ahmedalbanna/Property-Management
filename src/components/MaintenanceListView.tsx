import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, Wallet, Building2, Calendar, FileText } from 'lucide-react';
import { MaintenanceRecord, Property, Currency } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function MaintenanceListView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    propertyId: '',
    description: '',
    cost: 0,
    currency: 'YER' as Currency,
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchData = async () => {
    if (!user) return;
    try {
      const pQ = query(collection(db, 'properties'), where('ownerId', '==', user.uid));
      const pSnap = await getDocs(pQ);
      setProperties(pSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Property)));

      const rQ = query(collection(db, 'maintenance'), where('ownerId', '==', user.uid));
      const rSnap = await getDocs(rQ);
      setRecords(rSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MaintenanceRecord)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const recordData = {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        ownerId: user.uid,
      };
      await addDoc(collection(db, 'maintenance'), recordData);
      setIsAdding(false);
      setFormData({ propertyId: '', description: '', cost: 0, currency: 'YER', date: format(new Date(), 'yyyy-MM-dd') });
      fetchData();
    } catch (err) {
      handleFirestoreError(err, 'create', 'maintenance');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل المصروفي؟')) return;
    try {
      await deleteDoc(doc(db, 'maintenance', id));
      fetchData();
    } catch (err) {
      handleFirestoreError(err, 'delete', `maintenance/${id}`);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">إدارة المصاريف</h2>
          <p className="text-slate-400 text-sm mt-1">تتبع تكاليف الصيانة والتشغيل للعقارات</p>
        </div>
        <button 
          disabled={properties.length === 0}
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all font-bold active:scale-95 disabled:opacity-30"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصروف</span>
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="geometric-card p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">العقار</label>
                <select 
                  required
                  value={formData.propertyId}
                  onChange={e => setFormData({ ...formData, propertyId: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white appearance-none outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">اختر العقار</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">الوصف / البيان</label>
                <input 
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">التاريخ</label>
                <input 
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">المبلغ</label>
                <input 
                  type="number"
                  required
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white font-mono outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">العملة</label>
                <select 
                  required
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white appearance-none outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USD">USD</option>
                  <option value="SAR">SAR</option>
                  <option value="YER">YER</option>
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-6 border-t border-border">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">إلغاء</button>
                <button type="submit" className="px-12 py-3 bg-primary text-white rounded-lg font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all">حفظ المصروف</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="geometric-card overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-950/50 border-b border-border">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">العقار</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">التاريخ</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">البيان</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">القيمة</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-slate-900/20">
            {loading ? (
               <tr><td colSpan={5} className="p-10 text-center animate-pulse text-[10px] uppercase tracking-widest text-slate-600">جاري التحديث...</td></tr>
            ) : records.length === 0 ? (
               <tr><td colSpan={5} className="p-20 text-center text-slate-700 italic">لا توجد مصاريف مسجلة لهذا النطاق</td></tr>
            ) : (
              records.map(record => {
                const property = properties.find(p => p.id === record.propertyId);
                const date = record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date);
                return (
                  <tr key={record.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5 text-white font-bold">{property?.name || '---'}</td>
                    <td className="px-8 py-5 text-slate-400 font-mono text-sm">{format(date, 'yyyy-MM-dd')}</td>
                    <td className="px-8 py-5 text-slate-300">{record.description}</td>
                    <td className="px-8 py-5 text-red-400 font-mono font-bold tracking-tighter">
                       {record.cost.toLocaleString()} <span className="text-[9px] text-slate-600 uppercase ml-1">{record.currency}</span>
                    </td>
                    <td className="px-8 py-5">
                       <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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
