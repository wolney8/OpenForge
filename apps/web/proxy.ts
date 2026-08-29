import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE, verifyFounderSessionToken } from "@/lib/auth-session";

function authenticationRequired() {
  return process.env.OPENFORGE_AUTH_REQUIRED === "true" || Boolean(process.env.VERCEL);
}

export async function proxy(request: NextRequest) {
  if (!authenticationRequired()) return NextResponse.next();

  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? "";
  const isAuthenticated = await verifyFounderSessionToken(
    token,
    process.env.OPENFORGE_AUTH_SESSION_SECRET ?? "",
    process.env.OPENFORGE_AUTH_OWNER_EMAILS ?? ""
  );
  if (isAuthenticated) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/profiles/:path*",
    "/performance/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/account/:path*",
  ],
};
