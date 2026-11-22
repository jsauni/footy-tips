import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/rules", "/privacy", "/terms", "/disclaimer"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.assign(cacheHeaders, headers);
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Refreshes the session if needed and verifies the JWT.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    // Carry refreshed auth cookies across the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    Object.entries(cacheHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };

  if (!claims) {
    if (isPublic) return response;
    const next = path + request.nextUrl.search;
    return redirectTo("/login", next === "/" ? undefined : { next });
  }

  if (path === "/login") return redirectTo("/");

  const displayName = (claims.user_metadata as { display_name?: string } | undefined)
    ?.display_name;
  if (!displayName && path !== "/onboarding" && !isPublic) {
    const next = path + request.nextUrl.search;
    return redirectTo("/onboarding", next === "/" ? undefined : { next });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|monitoring|sentry-tunnel|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
