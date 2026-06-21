import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

async function test() {
  const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app, "ai-studio-217f6d79-c758-4e14-845d-737228cd3915");
  
  // Fake or valid idToken? We don't have a valid one right now to test.
  console.log("App initialized.");
  process.exit(0);
}

test();
