import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Unit } from '../types';
import { queryKeys } from '../lib/queryKeys';

export function useUnits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const unitsQuery = useQuery({
    queryKey: queryKeys.units.list(),
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(
          collection(db, 'units'), 
          where('ownerId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Unit));
      } catch (err) {
        handleFirestoreError(err, 'list', 'units');
      }
    },
    enabled: !!user,
  });

  const addUnitMutation = useMutation({
    mutationFn: async (newUnit: Omit<Unit, 'id' | 'ownerId'>) => {
      if (!user) throw new Error('User not authenticated');
      const docRef = await addDoc(collection(db, 'units'), {
        ...newUnit,
        ownerId: user.uid,
      });
      return { ...newUnit, id: docRef.id, ownerId: user.uid } as Unit;
    },
    onSuccess: (newUnit) => {
      queryClient.setQueryData<Unit[]>(queryKeys.units.list(), (old) => {
        return old ? [...old, newUnit] : [newUnit];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all() });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'units', id));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Unit[]>(queryKeys.units.list(), (old) => {
        return old ? old.filter(u => u.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all() });
    },
  });

  return {
    units: unitsQuery.data || [],
    isLoading: unitsQuery.isLoading,
    isError: unitsQuery.isError,
    addUnit: addUnitMutation.mutateAsync,
    isAdding: addUnitMutation.isPending,
    deleteUnit: deleteUnitMutation.mutateAsync,
  };
}
