import {
  localStorageEnabled,
  readLocalObject,
  verifyLocalUpload,
  writeLocalObject,
} from "@/lib/local-storage";
import { apiError, assertSameOrigin } from "@/lib/api";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!localStorageEnabled()) return new Response(null, { status: 404 });
  try {
    assertSameOrigin(request);
    const key = (await params).key.join("/");
    const bytes = verifyLocalUpload(
      key,
      new URL(request.url),
      request.headers.get("content-type"),
    );
    const reader = request.body?.getReader();
    if (!reader) throw new Error("VALIDATION");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > bytes) {
        await reader.cancel();
        throw new Error("VALIDATION");
      }
      chunks.push(value);
    }
    if (length !== bytes) throw new Error("VALIDATION");
    await writeLocalObject(key, Buffer.concat(chunks), true);
    return new Response(null, { status: 200 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return Response.json({ error: "CONFLICT" }, { status: 409 });
    return apiError(error);
  }
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  if (!localStorageEnabled()) return new Response(null, { status: 404 });
  const key = (await params).key.join("/");
  if (!key.startsWith("images/")) return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await readLocalObject(key)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
