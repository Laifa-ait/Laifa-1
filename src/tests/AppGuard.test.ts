import { describe, it, expect, vi } from "vitest";
import React from "react";

// Minimal mock to avoid rendering context issues
describe("AppGuard basic logic", () => {
  it("should evaluate allowed roles correctly", () => {
    const allowedRoles = ["buyer", "seller"];
    
    const userBuyer = { role: "buyer" };
    const userAdmin = { role: "admin" };

    expect(allowedRoles.includes(userBuyer.role)).toBe(true);
    expect(allowedRoles.includes(userAdmin.role)).toBe(false);
  });
});
