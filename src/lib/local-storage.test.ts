import { afterEach, expect, it, vi } from "vitest";
import {
  localStorageEnabled,
  localObjectPath,
  localUploadUrl,
  verifyLocalUpload,
} from "./local-storage";
afterEach(() => vi.unstubAllEnvs());
it("local image storage is unavailable in production and S3 integration tests", () => {
  vi.stubEnv("LOCAL_IMAGE_STORAGE", "true");
  vi.stubEnv("NODE_ENV", "production");
  expect(localStorageEnabled()).toBe(false);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("MARKETPLACE_INTEGRATION", "true");
  expect(localStorageEnabled()).toBe(false);
  vi.stubEnv("MARKETPLACE_INTEGRATION", "false");
  expect(localStorageEnabled()).toBe(true);
});
it("signed local uploads reject changes to key, MIME, length, expiration and token", () => {
  vi.stubEnv("AUTH_SECRET", "unit-test-only-secret");
  const key = "staging/student/test-upload";
  const url = new URL(
    localUploadUrl(key, 123, "image/webp"),
    "http://localhost:3000",
  );
  expect(verifyLocalUpload(key, url, "image/webp")).toBe(123);
  expect(() =>
    verifyLocalUpload("staging/other/test-upload", url, "image/webp"),
  ).toThrow("FORBIDDEN");
  expect(() => verifyLocalUpload(key, url, "image/png")).toThrow("FORBIDDEN");
  for (const [name, value] of [
    ["bytes", "124"],
    ["expires", "1"],
    ["token", "0".repeat(64)],
  ]) {
    const changed = new URL(url);
    changed.searchParams.set(name, value);
    expect(() => verifyLocalUpload(key, changed, "image/webp")).toThrow(
      "FORBIDDEN",
    );
  }
  expect(() => localObjectPath("images/../../secret.webp")).toThrow(
    "VALIDATION",
  );
});
