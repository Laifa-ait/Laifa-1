import { admin } from "./src/config/firebase-admin";

async function test() {
  try {
     console.log("Testing createCustomToken...");
     const token = await admin.auth().createCustomToken("test-uid");
     console.log("Success:", !!token);
  } catch (err: any) {
     console.error("Test error:", err);
  }
}

test();
