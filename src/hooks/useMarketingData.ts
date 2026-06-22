import { useState, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export const useMarketingData = () => {
  const { currentUser, userProfile } = useAuth();

  const logAudit = useCallback(
    async (action: string, details: any) => {
      if (!currentUser || userProfile?.role !== "admin") {
        console.warn("[Access Violation] Non-admin tried to log audit action:", action);
        return;
      }
      try {
        await addDoc(collection(db, "audit_logs"), {
          adminId: currentUser.uid,
          adminEmail: currentUser.email,
          action,
          details,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Audit log failed", e);
      }
    },
    [currentUser, userProfile]
  );

  // Coupon CRUD Logic
  const createCoupon = useCallback(
    async (payload: any) => {
      if (!currentUser || userProfile?.role !== "admin") {
        toast.error("Non autorisé");
        throw new Error("Unauthorized - admin role required");
      }
      try {
        const docRef = await addDoc(collection(db, "coupons"), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logAudit("CREATE_COUPON", { couponId: docRef.id, ...payload });
        toast.success(`Coupon ${payload.code} créé !`);
        return docRef.id;
      } catch (error) {
        toast.error("Erreur création coupon");
        throw error;
      }
    },
    [currentUser, userProfile, logAudit]
  );

  const updateCoupon = useCallback(
    async (id: string, updates: any, code: string) => {
      if (!currentUser || userProfile?.role !== "admin") {
        toast.error("Non autorisé");
        throw new Error("Unauthorized - admin role required");
      }
      try {
        await updateDoc(doc(db, "coupons", id), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await logAudit("UPDATE_COUPON", { couponId: id, code, updates });
        toast.success("Coupon mis à jour");
      } catch (error) {
        toast.error("Erreur mise à jour");
        throw error;
      }
    },
    [currentUser, userProfile, logAudit]
  );

  const deleteCoupon = useCallback(
    async (id: string, code: string) => {
      if (!currentUser || userProfile?.role !== "admin") {
        toast.error("Non autorisé");
        throw new Error("Unauthorized - admin role required");
      }
      try {
        await deleteDoc(doc(db, "coupons", id));
        await logAudit("DELETE_COUPON", { couponId: id, code });
        toast.success("Coupon supprimé");
      } catch (error) {
        toast.error("Erreur suppression");
        throw error;
      }
    },
    [currentUser, userProfile, logAudit]
  );

  // Category Hierarchy Logic
  const saveCategoryHierarchy = useCallback(
    async (newHierarchy: Record<string, any>) => {
      if (!currentUser || userProfile?.role !== "admin") {
        toast.error("Non autorisé");
        throw new Error("Unauthorized - admin role required");
      }
      try {
        await setDoc(doc(db, "settings", "categories"), { hierarchy: newHierarchy }, { merge: true });
        await logAudit("UPDATE_CATEGORIES", { updatedAt: new Date().toISOString() });
        toast.success("Catégories sauvegardées");
      } catch (err) {
        console.error("Error saving hierarchy:", err);
        toast.error("Erreur sauvegarde catégories");
        throw err;
      }
    },
    [currentUser, userProfile, logAudit]
  );

  return { createCoupon, updateCoupon, deleteCoupon, saveCategoryHierarchy, logAudit };
};
