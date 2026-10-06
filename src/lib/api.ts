import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (!origin || origin !== expected) throw new Error("FORBIDDEN");
}
export function apiError(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "VALIDATION", issues: error.flatten() },
      { status: 400 },
    );
  const code = error instanceof Error ? error.message : "INTERNAL";
  const statuses: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT: 429,
    VALIDATION: 400,
    EXCHANGE_TIME_INVALID: 400,
    EXCHANGE_TIME_PAST: 400,
    EXCHANGE_TIME_TOO_FAR: 400,
    EXCHANGE_TIME_HOURS: 400,
    CONFLICT: 409,
    STORAGE_NOT_CONFIGURED: 503,
  };
  if (!statuses[code]) console.error("API request failed", error);
  return NextResponse.json(
    { error: statuses[code] ? code : "INTERNAL" },
    { status: statuses[code] ?? 500 },
  );
}
