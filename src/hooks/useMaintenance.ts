import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { MaintenanceRecord } from '../types';
import { queryKeys } from '../lib/queryKeys';

export function useMaintenance(propertyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const maintenanceQuery = useQuery({
    queryKey: queryKeys.maintenance.list(propertyId),
    queryFn: async () => {
      if (!user) return [];
      try {
        let q = query(
          collection(db, 'maintenance'), 
          where('ownerId', '==', user.uid),
          orderBy('date', 'desc')
        );
        
        if (propertyId) {
          q = query(q, where('propertyId', '==', propertyId));
        }

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MaintenanceRecord));
      } catch (err) {
        handleFirestoreError(err, 'list', 'maintenance');
      }
    },
    enabled: !!user,
  });

  const addRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<MaintenanceRecord, 'id' | 'ownerId'>) => {
      if (!user) throw new Error('User not authenticated');
      const docRef = await addDoc(collection(db, 'maintenance'), {
        ...newRecord,
        ownerId: user.uid,
      });
      return { ...newRecord, id: docRef.id, ownerId: user.uid } as MaintenanceRecord;
    },
    onSuccess: (newRecord) => {
      queryClient.setQueryData<MaintenanceRecord[]>(queryKeys.maintenance.list(newRecord.propertyId), (old) => {
        return old ? [newRecord, ...old] : [newRecord];
      });
      queryClient.setQueryData<MaintenanceRecord[]>(queryKeys.maintenance.list(), (old) => {
        return old ? [newRecord, ...old] : [newRecord];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all() });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'maintenance', id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all() });
    },
  });

  return {
    records: maintenanceQuery.data || [],
    isLoading: maintenanceQuery.isLoading,
    isError: maintenanceQuery.isError,
    addRecord: addRecordMutation.mutateAsync,
    isAdding: addRecordMutation.isPending,
    deleteRecord: deleteRecordMutation.mutateAsync,
  };
}
