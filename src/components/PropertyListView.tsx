import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Building2, Plus, MapPin, Trash2, Home, Briefcase, Building } from 'lucide-react';
import { Property, PropertyType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function PropertyListView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'residential' as PropertyType,
  });

  const fetchProperties = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'properties'), where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Property));
      setProperties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'properties'), {
        ...formData,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
      });
      setIsAdding(false);
      setFormData({ name: '', address: '', type: 'residential' });
      fetchProperties();
    } catch (err) {
      handleFirestoreError(err, 'create', 'properties');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return;
    try {
      await deleteDoc(doc(db, 'properties', id));
      fetchProperties();
    } catch (err) {
      handleFirestoreError(err, 'delete', `properties/${id}`);
    }
  };

  const getIcon = (type: PropertyType) => {
    switch (type) {
      case 'residential': return Home;
      case 'commercial': return Briefcase;
      case 'office': return Building;
      default: return Building2;
    }
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('nav.properties')}</h2>
          <p className="text-slate-400 text-sm mt-1">إدارة الأصول والعقارات الرئيسية</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>{t('property.add')}</span>
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
            <form onSubmit={handleSubmit} className="geometric-card p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('property.name')}</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white focus:ring-2 focus:ring-primary outline-none transition-all" 
                  placeholder="مثلاً: قصر النبلاء"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('property.address')}</label>
                <input 
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white focus:ring-2 focus:ring-primary outline-none transition-all" 
                  placeholder="المدينة، الحي..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('property.type')}</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as PropertyType })}
                  className="w-full px-4 py-3 bg-black border border-border rounded-lg text-white focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                >
                  <option value="residential">سكني</option>
                  <option value="commercial">تجاري</option>
                  <option value="office">مكاتب</option>
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-3 pt-6 border-t border-border mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
           Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="h-48 bg-slate-900/50 animate-pulse rounded-xl border border-border" />
           ))
        ) : properties.length === 0 ? (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-2xl bg-slate-900/20">
             <Building2 className="w-12 h-12 text-slate-800 mx-auto mb-4" />
             <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">لا توجد عقارات مضافة بعد</p>
          </div>
        ) : (
          properties.map(property => {
            const Icon = getIcon(property.type);
            return (
              <motion.div 
                layout
                key={property.id}
                className="group geometric-card p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 group-hover:bg-primary/10"></div>
                
                <button 
                  onClick={() => handleDelete(property.id)}
                  className="absolute top-4 left-4 p-2 text-slate-700 hover:text-red-500 transition-colors z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="relative flex flex-col gap-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-border flex items-center justify-center text-primary shadow-inner transition-transform group-hover:scale-110">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-xl leading-tight group-hover:text-primary transition-colors">{property.name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-2 font-medium">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span>{property.address}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                     <span className="px-3 py-1 bg-slate-950 border border-border text-slate-500 rounded-md text-[10px] font-black uppercase tracking-widest">
                       {property.type === 'residential' ? 'سكني' : property.type === 'commercial' ? 'تجاري' : 'مكاتب'}
                     </span>
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
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
