import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Contract } from '../types';
import { queryKeys } from '../lib/queryKeys';

export function useContracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: queryKeys.contracts.list(),
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(collection(db, 'contracts'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contract));
      } catch (err) {
        handleFirestoreError(err, 'list', 'contracts');
      }
    },
    enabled: !!user,
  });

  const addContractMutation = useMutation({
    mutationFn: async (newContract: Omit<Contract, 'id' | 'ownerId'>) => {
      if (!user) throw new Error('User not authenticated');
      try {
        const parseDate = (d: any) => {
          if (d instanceof Date) return d;
          if (typeof d === 'string') {
            const [year, month, day] = d.split('-').map(Number);
            return new Date(year, month - 1, day);
          }
          return new Date(d);
        };

        const docData = {
          ...newContract,
          startDate: Timestamp.fromDate(parseDate(newContract.startDate)),
          endDate: Timestamp.fromDate(parseDate(newContract.endDate)),
          ownerId: user.uid,
        };
        console.log('Contract creation payload:', docData);
        const docRef = await addDoc(collection(db, 'contracts'), docData);
        return { ...docData, id: docRef.id, startDate: docData.startDate.toDate(), endDate: docData.endDate.toDate() } as Contract;
      } catch (err) {
        handleFirestoreError(err, 'create', 'contracts');
      }
    },
    onSuccess: (newContract) => {
      queryClient.setQueryData<Contract[]>(queryKeys.contracts.list(), (old) => {
        return old ? [...old, newContract] : [newContract];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });

  const updateContractStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: Contract['status'] }) => {
      await updateDoc(doc(db, 'contracts', id), { status });
      return { id, status };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Contract[]>(queryKeys.contracts.list(), (old) => {
        return old ? old.map(c => c.id === updated.id ? { ...c, status: updated.status } : c) : [];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'contracts', id));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Contract[]>(queryKeys.contracts.list(), (old) => {
        return old ? old.filter(c => c.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all() });
    },
  });

  return {
    contracts: contractsQuery.data || [],
    isLoading: contractsQuery.isLoading,
    isError: contractsQuery.isError,
    addContract: addContractMutation.mutateAsync,
    isAdding: addContractMutation.isPending,
    updateStatus: updateContractStatusMutation.mutateAsync,
    deleteContract: deleteContractMutation.mutateAsync,
  };
}
