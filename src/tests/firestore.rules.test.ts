import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { readFileSync } from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "olmart-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore Security Rules", () => {
  it("should allow public read on banners", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "banners", "test"), { title: "Test" });
    });
    
    const unauthed = testEnv.unauthenticatedContext();
    const bannerDoc = doc(unauthed.firestore(), "banners", "test");
    const snapshot = await getDoc(bannerDoc);
    expect(snapshot.exists()).toBe(true);
  });
  
  it("should deny unauthenticated write on banners", async () => {
    const unauthed = testEnv.unauthenticatedContext();
    const bannerDoc = doc(unauthed.firestore(), "banners", "test2");
    
    await expect(setDoc(bannerDoc, { title: "Hack" })).rejects.toThrow();
  });
  
  it("should allow admin to write banners", async () => {
    const admin = testEnv.authenticatedContext("admin1", { role: "admin" });
    const bannerDoc = doc(admin.firestore(), "banners", "new");
    
    await expect(setDoc(bannerDoc, { title: "New Banner" })).resolves.not.toThrow();
  });
});
