import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

export const subscribeToNewsletter = async (email: string) => {
  const normEmail = email.trim();
  const q = query(collection(db, "newsletterEmails"), where("email", "==", normEmail));
  const existing = await getDocs(q);
  
  if (!existing.empty) {
    throw new Error("ALREADY_SUBSCRIBED");
  }

  await addDoc(collection(db, "newsletterEmails"), {
    email: normEmail,
    subscribedAt: serverTimestamp(),
  });
};
