import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. ALWAYS run the Supabase client first to refresh the session/cookies
  const { supabase, supabaseResponse } = createMiddlewareClient(request);
  
  // Refresh session if it exists
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Define protected boundaries
  const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // 3. Handle Unauthorized access
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Handle Role-based access
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "employee";

    if (pathname.startsWith("/admin") && role !== "admin") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    if (pathname.startsWith("/dashboard") && role === "admin") {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      return NextResponse.redirect(adminUrl);
    }
  }

  // 5. Always return the modified supabaseResponse (keeps cookies synced!)
  return supabaseResponse;
}

// 6. Update matcher to listen to ALL routes except internal system files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to include any images/public files here
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};