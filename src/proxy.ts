import { NextResponse } from "next/server";
import { auth } from "@/auth";
export default auth((request) => {
  const path = request.nextUrl.pathname;
  // API handlers enforce fresh account checks and return JSON errors.
  if (path.startsWith("/api/")) return NextResponse.next();
  const publicPage = ["/sign-in", "/about", "/auth-error"].includes(path);
  if (!request.auth && !publicPage)
    return NextResponse.redirect(new URL("/sign-in", request.url));
});
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|brand/|demo/).*)",
  ],
};
