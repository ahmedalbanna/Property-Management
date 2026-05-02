import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Payment } from '../types';
import { queryKeys } from '../lib/queryKeys';

export function usePayments(contractId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.list(contractId),
    queryFn: async () => {
      if (!user) return [];
      try {
        let q = query(
          collection(db, 'payments'), 
          where('ownerId', '==', user.uid),
          orderBy('paymentDate', 'desc')
        );
        
        if (contractId) {
          q = query(q, where('contractId', '==', contractId));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment));
      } catch (err) {
        handleFirestoreError(err, 'list', 'payments');
      }
    },
    enabled: !!user,
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (newPayment: Omit<Payment, 'id' | 'ownerId'>) => {
      if (!user) throw new Error('User not authenticated');
      let paymentDate: Date;
      if (newPayment.paymentDate instanceof Date) {
        paymentDate = newPayment.paymentDate;
      } else if (typeof newPayment.paymentDate === 'string') {
        const [year, month, day] = newPayment.paymentDate.split('-').map(Number);
        paymentDate = new Date(year, month - 1, day);
      } else {
        paymentDate = new Date(newPayment.paymentDate as any);
      }
      
      const docData = {
        ...newPayment,
        paymentDate: Timestamp.fromDate(paymentDate),
        ownerId: user.uid,
      };
      
      if (isNaN(docData.paymentDate.toDate().getTime())) {
          console.error('Invalid payment date:', newPayment.paymentDate);
          throw new Error('Invalid date value');
      }
      
      const docRef = await addDoc(collection(db, 'payments'), docData);
      return { ...docData, id: docRef.id, paymentDate: docData.paymentDate.toDate() } as Payment;
    },
    onSuccess: (newPayment) => {
      queryClient.setQueryData<Payment[]>(queryKeys.payments.list(newPayment.contractId), (old) => {
        return old ? [newPayment, ...old] : [newPayment];
      });
      // Also update generic list
      queryClient.setQueryData<Payment[]>(queryKeys.payments.list(), (old) => {
        return old ? [newPayment, ...old] : [newPayment];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'payments', id));
      return id;
    },
    onSuccess: (deletedId) => {
       queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() });
    },
  });

  return {
    payments: paymentsQuery.data || [],
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    addPayment: addPaymentMutation.mutateAsync,
    isAdding: addPaymentMutation.isPending,
    deletePayment: deletePaymentMutation.mutateAsync,
  };
}
