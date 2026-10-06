import { z } from "zod";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { requireStudent } from "@/lib/session";
import { db } from "@/lib/db";
import { assertSameOrigin, apiError } from "@/lib/api";
import {
  storage,
  publicObjectUrl,
  assertStorageConfigured,
  writeImageObject,
} from "@/lib/storage";
import {
  localStorageEnabled,
  localUploadUrl,
  readLocalObject,
} from "@/lib/local-storage";
import { rateLimit } from "@/lib/rate-limit";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("presign"),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    bytes: z
      .number()
      .int()
      .min(1)
      .max(5 * 1024 * 1024),
  }),
  z.object({ action: z.literal("complete"), id: z.string().min(1) }),
]);
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const data = schema.parse(await request.json());
    assertStorageConfigured();
    if (data.action === "presign") {
      await rateLimit(user.id, "upload", 60);
      const key = `staging/${user.id}/${crypto.randomUUID()}`;
      const upload = await db.upload.create({
        data: {
          userId: user.id,
          key,
          mimeType: data.mimeType,
          bytes: data.bytes,
        },
      });
      const url = localStorageEnabled()
        ? localUploadUrl(key, data.bytes, data.mimeType)
        : await getSignedUrl(
            storage,
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: key,
              ContentType: data.mimeType,
              ContentLength: data.bytes,
            }),
            { expiresIn: 300 },
          );
      return Response.json({ id: upload.id, url });
    }
    const upload = await db.upload.findFirst({
      where: { id: data.id, userId: user.id, consumedAt: null },
    });
    if (!upload) throw new Error("NOT_FOUND");
    if (upload.completedAt) return Response.json({ id: upload.id });
    const localBuffer = localStorageEnabled()
      ? await readLocalObject(upload.key).catch(() => {
          throw new Error("VALIDATION");
        })
      : null;
    const object = localBuffer
      ? {
          ContentLength: localBuffer.length,
          ContentType: upload.mimeType,
          Body: undefined,
        }
      : await storage.send(
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: upload.key,
          }),
        );
    if (
      !object.ContentLength ||
      object.ContentLength > 5 * 1024 * 1024 ||
      object.ContentLength !== upload.bytes ||
      object.ContentType !== upload.mimeType
    )
      throw new Error("VALIDATION");
    const buffer =
      localBuffer ?? Buffer.from(await object.Body!.transformToByteArray());
    const image = sharp(buffer, { limitInputPixels: 40000000 });
    const meta = await image.metadata().catch(() => {
      throw new Error("VALIDATION");
    });
    const expected = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[upload.mimeType];
    if (meta.format !== expected) throw new Error("VALIDATION");
    const fullKey = `images/${upload.id}.webp`;
    const thumbKey = `images/${upload.id}-thumb.webp`;
    const full = await image
      .rotate()
      .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
      .catch(() => {
        throw new Error("VALIDATION");
      });
    const thumb = await sharp(full)
      .resize(480, 360, { fit: "cover" })
      .webp({ quality: 78 })
      .toBuffer();
    await writeImageObject(fullKey, full);
    await writeImageObject(thumbKey, thumb);
    await db.upload.update({
      where: { id: upload.id },
      data: {
        url: publicObjectUrl(fullKey),
        thumbUrl: publicObjectUrl(thumbKey),
        completedAt: new Date(),
      },
    });
    return Response.json({ id: upload.id });
  } catch (error) {
    return apiError(error);
  }
}
