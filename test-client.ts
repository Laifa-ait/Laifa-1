import { clientDb as db } from "./src/config/firebase-admin";
import { getDoc, doc } from "firebase/firestore";

async function test() {
  try {
     console.log("Testing clientDb get...");
     const snap = await getDoc(doc(db, "settings", "shipping"));
     console.log("Settings shipping exists?", snap.exists());
     process.exit(0);
  } catch (err: any) {
     console.error("Test error:", err);
  }
}

test();
