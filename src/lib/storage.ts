import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { localStorageEnabled, writeLocalObject } from "@/lib/local-storage";
export function assertStorageConfigured() {
  if (
    !localStorageEnabled() &&
    [
      "S3_BUCKET",
      "S3_ENDPOINT",
      "S3_PUBLIC_URL",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ].some((name) => !process.env[name])
  )
    throw new Error("STORAGE_NOT_CONFIGURED");
}
export async function writeImageObject(key: string, body: Buffer) {
  if (localStorageEnabled()) return writeLocalObject(key, body);
  await storage.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
    }),
  );
}
export function uploadBucket() {
  return process.env.S3_UPLOAD_BUCKET || process.env.S3_BUCKET;
}
export const storage = new S3Client({
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});
export function publicObjectUrl(key: string) {
  if (localStorageEnabled()) return "/api/local-storage/" + key;
  if (!process.env.S3_PUBLIC_URL) throw new Error("STORAGE_NOT_CONFIGURED");
  return process.env.S3_PUBLIC_URL.replace(/\/$/, "") + "/" + key;
}
