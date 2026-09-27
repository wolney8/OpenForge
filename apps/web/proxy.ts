import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE, verifyFounderSessionToken } from "@/lib/auth-session";

function authenticationRequired() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.OPENFORGE_E2E_AUTH_BYPASS === "true"
  ) return false;
  return process.env.OPENFORGE_AUTH_REQUIRED === "true" || Boolean(process.env.VERCEL);
}

export async function proxy(request: NextRequest) {
  const subscriberPath = request.nextUrl.pathname.startsWith("/subscriber");
  if (!authenticationRequired() && !subscriberPath && !request.cookies.has(AUTH_SESSION_COOKIE)) return NextResponse.next();

  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? "";
  const isAuthenticated = await verifyFounderSessionToken(
    token,
    process.env.OPENFORGE_AUTH_SESSION_SECRET ?? "",
    process.env.OPENFORGE_AUTH_OWNER_EMAILS ?? ""
  );
  const isSubscriber = await verifyFounderSessionToken(token, process.env.OPENFORGE_AUTH_SESSION_SECRET ?? "", "", true);
  if (subscriberPath && isSubscriber) return NextResponse.next();
  if (isSubscriber) return NextResponse.redirect(new URL("/subscriber", request.url));
  if (isAuthenticated && !subscriberPath) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/profiles/:path*",
    "/subscriber/:path*",
    "/performance/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/tasks/:path*",
    "/settings/:path*",
    "/account/:path*",
    "/calculator",
    "/fund-manager/:path*",
    "/imports/:path*",
  ],
};
