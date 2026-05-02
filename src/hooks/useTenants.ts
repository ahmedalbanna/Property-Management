import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Tenant } from '../types';
import { queryKeys } from '../lib/queryKeys';

export function useTenants() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: queryKeys.tenants.list(),
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tenant));
      } catch (err) {
        handleFirestoreError(err, 'list', 'tenants');
      }
    },
    enabled: !!user,
  });

  const addTenantMutation = useMutation({
    mutationFn: async (newTenant: Omit<Tenant, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');
      const docRef = await addDoc(collection(db, 'tenants'), {
        ...newTenant,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
      });
      return { ...newTenant, id: docRef.id, ownerId: user.uid, createdAt: new Date() } as Tenant;
    },
    onSuccess: (newTenant) => {
      queryClient.setQueryData<Tenant[]>(queryKeys.tenants.list(), (old) => {
        return old ? [...old, newTenant] : [newTenant];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'tenants', id));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Tenant[]>(queryKeys.tenants.list(), (old) => {
        return old ? old.filter(t => t.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all() });
    },
  });

  return {
    tenants: tenantsQuery.data || [],
    isLoading: tenantsQuery.isLoading,
    isError: tenantsQuery.isError,
    addTenant: addTenantMutation.mutateAsync,
    isAdding: addTenantMutation.isPending,
    deleteTenant: deleteTenantMutation.mutateAsync,
  };
}
