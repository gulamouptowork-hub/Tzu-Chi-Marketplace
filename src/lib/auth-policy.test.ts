import { describe, expect, it } from "vitest";
import {
  isAdminEmail,
  isAllowedSchoolEmail,
  isVerifiedSchoolIdentity,
} from "./auth-policy";

describe("school identity policy", () => {
  it("requires Google verification and matching profile identity", () => {
    const email = "student@gms.tcu.edu.tw";
    const profile = { email, email_verified: true };
    expect(
      isVerifiedSchoolIdentity("google", email, profile, "gms.tcu.edu.tw"),
    ).toBe(true);
    expect(
      isVerifiedSchoolIdentity(
        "google",
        email,
        { ...profile, email_verified: false },
        "gms.tcu.edu.tw",
      ),
    ).toBe(false);
    expect(
      isVerifiedSchoolIdentity(
        "google",
        email,
        { ...profile, email: "other@gms.tcu.edu.tw" },
        "gms.tcu.edu.tw",
      ),
    ).toBe(false);
    expect(
      isVerifiedSchoolIdentity("other", email, profile, "gms.tcu.edu.tw"),
    ).toBe(false);
    expect(
      isVerifiedSchoolIdentity("google", email, undefined, "gms.tcu.edu.tw"),
    ).toBe(false);
  });
  it("accepts only exact allowed domains", () => {
    expect(
      isAllowedSchoolEmail("student@gms.tcu.edu.tw", "gms.tcu.edu.tw"),
    ).toBe(true);
    expect(
      isAllowedSchoolEmail("student@GMS.TCU.EDU.TW", "gms.tcu.edu.tw"),
    ).toBe(true);
    for (const email of [
      "a@gmail.com",
      "a@gms.tcu.edu.tw.attacker.com",
      "a@sub.gms.tcu.edu.tw",
      "a@@gms.tcu.edu.tw",
      null,
    ]) {
      expect(isAllowedSchoolEmail(email, "gms.tcu.edu.tw")).toBe(false);
    }
  });
  it("fails closed when domains are unconfigured", () => {
    expect(isAllowedSchoolEmail("student@gms.tcu.edu.tw", "")).toBe(false);
  });
  it("matches admin email exactly", () => {
    expect(isAdminEmail("ADMIN@gms.tcu.edu.tw", "admin@gms.tcu.edu.tw")).toBe(
      true,
    );
    expect(isAdminEmail("other@gms.tcu.edu.tw", "admin@gms.tcu.edu.tw")).toBe(
      false,
    );
  });
});
