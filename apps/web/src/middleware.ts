import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const MANAGER_ONLY_PREFIXES = ["/vendedores", "/ranking"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn) {
    const role = req.auth!.user.role;

    if (isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
    }

    const isManager = role === "ADMIN" || role === "GESTOR";
    if (MANAGER_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && !isManager) {
      return NextResponse.redirect(new URL("/leads", req.nextUrl.origin));
    }

    // Vendedores work leads directly; the real-time funnel dashboard is a manager view.
    if (pathname.startsWith("/dashboard") && role === "VENDEDOR") {
      return NextResponse.redirect(new URL("/leads", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  // API routes handle their own auth (requireSession() returns JSON 401/403);
  // middleware only guards page navigation, where an HTML redirect makes sense.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
