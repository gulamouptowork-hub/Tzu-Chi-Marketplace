import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export function localStorageEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_IMAGE_STORAGE === "true" &&
    process.env.MARKETPLACE_INTEGRATION !== "true"
  );
}
export function localObjectPath(key: string) {
  if (
    !/^(staging\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+|images\/[a-zA-Z0-9_-]+(?:-thumb)?\.webp)$/.test(
      key,
    )
  )
    throw new Error("VALIDATION");
  return resolve(process.cwd(), ".dev-data", "media", key);
}
function signature(key: string, expires: string, bytes: string, mime: string) {
  if (!process.env.AUTH_SECRET) throw new Error("STORAGE_NOT_CONFIGURED");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(JSON.stringify([key, expires, bytes, mime]))
    .digest("hex");
}
export function localUploadUrl(key: string, bytes: number, mime: string) {
  localObjectPath(key);
  const expires = String(Date.now() + 300000);
  const query = new URLSearchParams({
    expires,
    bytes: String(bytes),
    mime,
    token: signature(key, expires, String(bytes), mime),
  });
  return "/api/local-storage/" + key + "?" + query;
}
export function verifyLocalUpload(key: string, url: URL, mime: string | null) {
  localObjectPath(key);
  if (!key.startsWith("staging/")) throw new Error("FORBIDDEN");
  const expires = url.searchParams.get("expires") ?? "";
  const bytes = url.searchParams.get("bytes") ?? "";
  const declaredMime = url.searchParams.get("mime") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (
    !/^\d+$/.test(expires) ||
    Number(expires) < Date.now() ||
    Number(expires) > Date.now() + 300000 ||
    !/^\d+$/.test(bytes) ||
    Number(bytes) < 1 ||
    Number(bytes) > 5 * 1024 * 1024 ||
    declaredMime !== mime ||
    !["image/jpeg", "image/png", "image/webp"].includes(declaredMime) ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    throw new Error("FORBIDDEN");
  if (
    !timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(signature(key, expires, bytes, declaredMime), "hex"),
    )
  )
    throw new Error("FORBIDDEN");
  return Number(bytes);
}
export async function readLocalObject(key: string) {
  return readFile(localObjectPath(key));
}
export async function writeLocalObject(
  key: string,
  body: Buffer,
  staging = false,
) {
  const path = localObjectPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, { flag: staging ? "wx" : "w" });
}
