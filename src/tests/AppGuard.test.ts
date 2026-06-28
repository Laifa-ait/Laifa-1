import { describe, it, expect } from "vitest";
import { ROLES } from "../constants/roles";

describe("AppGuard basic logic", () => {
  it("should evaluate allowed roles correctly", () => {
    const allowedRoles = [ROLES.BUYER, ROLES.SELLER];
    
    const userBuyer = { role: ROLES.BUYER };
    const userAdmin = { role: ROLES.ADMIN };

    expect(allowedRoles.includes(userBuyer.role)).toBe(true);
    expect(allowedRoles.includes(userAdmin.role)).toBe(false);
  });
});
