import { useState, useCallback } from "react";
import { db, storage } from "../lib/firebase";
import { collection, doc, getDocs, updateDoc, deleteDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

export const useFirebaseHomepage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (collectionName: string) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, collectionName), orderBy("orderIndex", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      toast.error("Erreur de chargement");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveItem = useCallback(async (collectionName: string, id: string | null, payload: any) => {
    setIsLoading(true);
    try {
      if (id) {
        await updateDoc(doc(db, collectionName, id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        toast.success("Élément mis à jour !");
      } else {
        await addDoc(collection(db, collectionName), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success("Élément ajouté !");
      }

      // Clear homepage compile cache so storefront picks up live edits instantly
      try {
        await deleteDoc(doc(db, "public", "homepage_cache"));
      } catch (cacheErr) {
        console.warn("Could not clear homepage cache:", cacheErr);
      }
    } catch (err) {
      toast.error("Erreur de sauvegarde");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadMedia = useCallback(async (file: File) => {
    try {
      toast.loading("Upload en cours...", { id: "upload" });
      const storageRef = ref(storage, `homepage_media/${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      toast.success("Importé !", { id: "upload" });
      return url;
    } catch (err) {
      toast.error("Erreur d'import", { id: "upload" });
      throw err;
    }
  }, []);

  return { isLoading, fetchData, saveItem, uploadMedia };
};
