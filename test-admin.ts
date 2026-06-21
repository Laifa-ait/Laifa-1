import { admin, db } from "./src/config/firebase-admin";

async function test() {
  try {
     console.log("Testing db get...");
     const snap = await db.collection("settings").doc("shipping").get();
     console.log("Settings global exists?", snap.exists);
     console.log("Testing transaction query...");
     await db.runTransaction(async (t: any) => {
         const q = db.collection("coupons").where("code", "==", "TEST").limit(1);
         const res = await t.get(q);
         console.log("Transaction query success, empty:", res.empty);
     });
  } catch (err: any) {
     console.error("Test error:", err);
  }
}

test();
