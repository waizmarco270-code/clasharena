import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { CosmeticItem, AVATAR_REGISTRY } from '@/config/cosmetics';

export function useCosmetics() {
  const db = useFirestore();
  const [cosmetics, setCosmetics] = useState<Record<string, CosmeticItem>>(AVATAR_REGISTRY); // Fallback to local initially
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    
    const q = query(collection(db, 'cosmetics'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cosmeticsMap: Record<string, CosmeticItem> = {};
      
      // If collection is empty, we still keep AVATAR_REGISTRY as base
      snapshot.forEach(doc => {
        cosmeticsMap[doc.id] = doc.data() as CosmeticItem;
      });
      
      if (!snapshot.empty) {
        // If we have data in Firestore, we merge it with local. Firestore data takes precedence.
        setCosmetics({ ...AVATAR_REGISTRY, ...cosmeticsMap });
      } else {
        setCosmetics({ ...AVATAR_REGISTRY });
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cosmetics from Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const addOrUpdateCosmetic = async (item: CosmeticItem) => {
    if (!db) throw new Error("Firestore not initialized");
    await setDoc(doc(db, 'cosmetics', item.id), item);
  };

  const deleteCosmetic = async (id: string) => {
    if (!db) throw new Error("Firestore not initialized");
    await deleteDoc(doc(db, 'cosmetics', id));
  };

  return { cosmetics, loading, addOrUpdateCosmetic, deleteCosmetic };
}
