import { admin } from "./src/config/firebase-admin";

async function test() {
  try {
     const users = await admin.auth().listUsers(1);
     console.log("List users:", users.users.length);
  } catch (err: any) {
     console.error("Test error:", err);
  }
}

test();
