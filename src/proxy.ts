import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";

// Refreshes the Supabase session cookies on each page request, so a
// signed-in user stays signed in. Authorisation is still checked on the
// server in each page and action. This file only keeps sessions alive.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

// Skip static files and images, which never need a session.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
