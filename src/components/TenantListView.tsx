import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2, User, Phone, Mail, FileText, Send, Clock, CreditCard, ChevronRight, MessageSquare } from 'lucide-react';
import { Tenant, Contract, Payment, Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useTenants } from '../hooks/useTenants';

export default function TenantListView() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { tenants, isLoading: loading, addTenant, deleteTenant: deleteTenantHook } = useTenants();
  
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  });

  // Details State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const fetchTenantDetails = async (tenant: Tenant) => {
    try {
      // 1. Contracts
      const cQ = query(collection(db, 'contracts'), where('ownerId', '==', user?.uid), where('tenantPhone', '==', tenant.phone));
      const cSnap = await getDocs(cQ);
      const cData = cSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contract));
      setContracts(cData);

      // 2. Payments
      const contractIds = cData.map(c => c.id);
      if (contractIds.length > 0) {
        const pQ = query(collection(db, 'payments'), where('ownerId', '==', user?.uid));
        const pSnap = await getDocs(pQ);
        const pData = pSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment))
          .filter(p => contractIds.includes(p.contractId));
        setPayments(pData);
      } else {
        setPayments([]);
      }

      // 3. Messages
      const mQ = query(collection(db, 'messages'), where('tenantId', '==', tenant.id), orderBy('timestamp', 'asc'));
      const mSnap = await getDocs(mQ);
      setMessages(mSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message)));

    } catch (err) {
      console.error("Error fetching details:", err);
    }
  };

  useEffect(() => {
    if (selectedTenant) {
      fetchTenantDetails(selectedTenant);
    }
  }, [selectedTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTenant(formData);
      setIsAdding(false);
      setFormData({ name: '', email: '', phone: '', idNumber: '' });
    } catch (err) {
      // Error handled in hook
    }
  };

  const deleteTenant = async (id: string) => {
    if (!confirm('سيتم حذف سجل المستأجر نهائياً. هل أنت متأكد؟')) return;
    try {
      await deleteTenantHook(id);
      if (selectedTenant?.id === id) setSelectedTenant(null);
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !newMessage.trim() || !user) return;
    try {
      const activeContract = contracts.find(c => c.status === 'active');
      const msgData = {
        contractId: activeContract?.id || 'no-contract',
        tenantId: selectedTenant.id,
        senderId: user.uid,
        content: newMessage,
        timestamp: Timestamp.now(),
        ownerId: user.uid,
      };
      await addDoc(collection(db, 'messages'), msgData);
      setNewMessage('');
      fetchTenantDetails(selectedTenant);
    } catch (err) {
      handleFirestoreError(err, 'create', 'messages');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
      {/* Left Column: Tenant List */}
      <div className={cn("lg:col-span-4 flex flex-col gap-6", selectedTenant && "hidden lg:flex")}>
        <header className="flex justify-between items-center bg-slate-900/50 p-6 border border-border rounded-xl backdrop-blur-md">
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">{t('tenant.list_title')}</h2>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-bold"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <AnimatePresence>
          {isAdding && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
               <form onSubmit={handleSubmit} className="geometric-card p-6 space-y-4">
                  <input required placeholder={t('tenant.add_name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-sm" />
                  <input required placeholder={t('tenant.add_phone')} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-sm" />
                  <input placeholder={t('tenant.add_email')} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-sm" />
                  <input placeholder={t('tenant.add_id')} value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} className="w-full px-4 py-2 bg-black border border-border rounded text-white text-sm" />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-slate-500 font-bold uppercase tracking-widest px-4 py-2">{t('tenant.cancel')}</button>
                    <button type="submit" className="bg-primary text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">{t('tenant.save')}</button>
                  </div>
               </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
             <div className="text-center py-10 text-slate-500 animate-pulse font-mono text-xs uppercase">{t('tenant.loading_records')}</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-20 geometric-card bg-slate-900/10 border-dashed">
               <User className="w-8 h-8 text-slate-800 mx-auto mb-2" />
               <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">{t('tenant.no_tenants')}</p>
            </div>
          ) : (
            tenants.map(tenant => (
              <button 
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className={cn(
                  "w-full text-right geometric-card p-5 transition-all group relative overflow-hidden",
                  selectedTenant?.id === tenant.id ? "bg-primary/5 border-primary/50" : "hover:bg-slate-900/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center border transition-all",
                    selectedTenant?.id === tenant.id ? "bg-primary text-white border-primary" : "bg-slate-950 border-border text-slate-500"
                  )}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors">{tenant.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-1">{tenant.phone}</p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-slate-700 transition-transform", selectedTenant?.id === tenant.id && "rotate-90 text-primary")} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Details & Messaging */}
      <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
        {selectedTenant ? (
          <div className="flex flex-col h-full space-y-6">
            <header className="bg-slate-900/80 p-6 border border-border rounded-xl backdrop-blur-md flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-lg"></div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-950 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-2xl font-display font-bold text-white tracking-tight">{selectedTenant.name}</h2>
                   <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                        <Phone className="w-3 h-3 text-primary" /> {selectedTenant.phone}
                      </span>
                      {selectedTenant.email && (
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                           <Mail className="w-3 h-3 text-primary" /> {selectedTenant.email}
                        </span>
                      )}
                   </div>
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setSelectedTenant(null)} className="lg:hidden p-2 text-slate-400 hover:text-white">{t('tenant.close')}</button>
                 <button onClick={() => deleteTenant(selectedTenant.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
               {/* Left: Contracts & Payments */}
               <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="geometric-card p-6 space-y-6">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        {t('tenant.contracts_history')}
                     </h3>
                     <div className="space-y-4">
                        {contracts.length === 0 ? (
                          <p className="text-xs text-slate-600 italic">{t('tenant.no_contracts_found')}</p>
                        ) : (
                          contracts.map(c => (
                            <div key={c.id} className="p-4 bg-slate-950 border border-border rounded-lg relative overflow-hidden group">
                               <div className={cn("absolute right-0 top-0 w-1 h-full", c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-700')}></div>
                               <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-white">{c.baseRent.toLocaleString()} {c.baseCurrency}</span>
                                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">{c.status}</span>
                               </div>
                               <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {format(c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate), 'yyyy/MM')}</span>
                                  <span>-</span>
                                  <span className="flex items-center gap-1">{format(c.endDate instanceof Timestamp ? c.endDate.toDate() : new Date(c.endDate), 'yyyy/MM')}</span>
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                  </div>

                  <div className="geometric-card p-6 space-y-6">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        {t('tenant.payments_history')}
                     </h3>
                     <div className="space-y-3">
                        {payments.length === 0 ? (
                           <p className="text-xs text-slate-600 italic">{t('tenant.no_payments_found')}</p>
                        ) : (
                          payments.slice(0, 5).map(p => (
                             <div key={p.id} className="flex justify-between items-center p-3 border-b border-border last:border-0">
                                <div>
                                   <p className="text-xs font-bold text-white">{p.amountPaidLocal.toLocaleString()} YER</p>
                                   <p className="text-[10px] text-slate-600 font-mono">{p.monthCovered}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-mono text-slate-500">{format(p.paymentDate instanceof Timestamp ? p.paymentDate.toDate() : new Date(p.paymentDate), 'yyyy-MM-dd')}</p>
                                </div>
                             </div>
                          ))
                        )}
                     </div>
                  </div>
               </div>

               {/* Right: Messaging */}
               <div className="geometric-card flex flex-col overflow-hidden">
                  <header className="p-4 border-b border-border bg-slate-950/50 flex justify-between items-center">
                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        {t('tenant.messages_and_alerts')}
                     </h3>
                  </header>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                     {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 scale-90">
                           <Send className="w-12 h-12 text-slate-500 mb-2" />
                           <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('tenant.no_messages')}</p>
                        </div>
                     ) : (
                        messages.map(msg => (
                          <div key={msg.id} className="flex flex-col items-start gap-1">
                             <div className="max-w-[85%] bg-slate-900 border border-border p-3 rounded-2xl rounded-tr-none">
                                <p className="text-xs text-white leading-relaxed">{msg.content}</p>
                             </div>
                             <span className="text-[9px] font-mono text-slate-700 px-2 uppercase">{format(msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp), 'HH:mm')}</span>
                          </div>
                        ))
                     )}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-slate-950/50 flex gap-2">
                     <input 
                       placeholder={t('tenant.write_message_placeholder')}
                       value={newMessage}
                       onChange={e => setNewMessage(e.target.value)}
                       className="flex-1 bg-black border border-border rounded-lg px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-primary" 
                     />
                     <button type="submit" className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                        <Send className="w-4 h-4" />
                     </button>
                  </form>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center geometric-card opacity-50 bg-slate-900/5">
             <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-slate-800" />
             </div>
             <p className="font-display font-medium text-slate-600 uppercase tracking-widest text-sm">{t('tenant.select_placeholder')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
