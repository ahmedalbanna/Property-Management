import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp, 
  deleteDoc, 
  doc, 
  orderBy, 
  limit, 
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Property } from '../types';
import { queryKeys } from '../lib/queryKeys';

const PAGE_SIZE = 10;

export function useProperties() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all properties (One-time fetch with cache)
  const propertiesQuery = useQuery({
    queryKey: queryKeys.properties.list(),
    queryFn: async () => {
      if (!user) return [];
      try {
        const q = query(
          collection(db, 'properties'), 
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Property));
      } catch (err) {
        handleFirestoreError(err, 'list', 'properties');
      }
    },
    enabled: !!user,
  });

  // Infinite Scroll / Pagination fetcher
  const propertiesInfiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.properties.list({ paginated: true }),
    queryFn: async ({ pageParam }: { pageParam: QueryDocumentSnapshot<DocumentData> | null }) => {
      if (!user) return { data: [], lastDoc: null };
      
      try {
        let q = query(
          collection(db, 'properties'),
          where('ownerId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        if (pageParam) {
          q = query(q, startAfter(pageParam));
        }

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Property));
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

        return { data, lastDoc };
      } catch (err) {
        handleFirestoreError(err, 'list', 'properties');
      }
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    enabled: !!user,
  });

  // Add Property Mutation (Update Cache locally)
  const addPropertyMutation = useMutation({
    mutationFn: async (newProperty: Omit<Property, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const docRef = await addDoc(collection(db, 'properties'), {
        ...newProperty,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
      });
      
      return { ...newProperty, id: docRef.id, ownerId: user.uid, createdAt: new Date() };
    },
    onSuccess: (newProp) => {
      // Optimistically update the list cache
      queryClient.setQueryData<Property[]>(queryKeys.properties.list(), (old) => {
        return old ? [newProp as Property, ...old] : [newProp as Property];
      });
      // Invalidate if needed, but manual update is cleaner for "saving reads"
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    },
  });

  // Delete Property Mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'properties', id));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Property[]>(queryKeys.properties.list(), (old) => {
        return old ? old.filter(p => p.id !== deletedId) : [];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
    },
  });

  return {
    properties: propertiesQuery.data || [],
    isLoading: propertiesQuery.isLoading,
    isError: propertiesQuery.isError,
    // Pagination
    infiniteProperties: propertiesInfiniteQuery.data?.pages.flatMap(p => p.data) || [],
    fetchNextPage: propertiesInfiniteQuery.fetchNextPage,
    hasNextPage: propertiesInfiniteQuery.hasNextPage,
    isFetchingNextPage: propertiesInfiniteQuery.isFetchingNextPage,
    // Mutations
    addProperty: addPropertyMutation.mutateAsync,
    isAdding: addPropertyMutation.isPending,
    deleteProperty: deletePropertyMutation.mutateAsync,
  };
}
