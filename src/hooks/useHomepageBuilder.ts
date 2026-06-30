import { useState, useCallback } from "react";
import {
  collection,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs,
  query,
  orderBy,
  getDoc,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export const useHomepageBuilder = () => {
  const { currentUser } = useAuth();

  const deleteItem = useCallback(async (activeTab: string, id: string) => {
    try {
      const collectionName = activeTab === "sections" ? "homepage_sections" : "banners";
      await deleteDoc(doc(db, collectionName, id));
      toast.success("Élément supprimé");

      // Clear homepage compile cache so storefront picks up live edits instantly
      try {
        await deleteDoc(doc(db, "public", "homepage_cache"));
      } catch (cacheErr) {
        console.warn("Could not clear homepage cache:", cacheErr);
      }

      return true;
    } catch (err) {
      toast.error("Erreur de suppression");
      return false;
    }
  }, []);

  const uploadMedia = useCallback(async (file: File) => {
    try {
      toast.loading("Upload de l'image/GIF en cours...", { id: "upload-hp" });
      const storageRef = ref(storage, `homepage_media/${Date.now()}_${file.name.replace(/\s+/g, "_")}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      toast.success("Média importé avec succès !", { id: "upload-hp" });
      return url;
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation.", { id: "upload-hp" });
      throw err;
    }
  }, []);

  return {
    deleteItem,
    uploadMedia,
  };
};
