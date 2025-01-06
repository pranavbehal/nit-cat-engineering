import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && !["/login", "/signup"].includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
      session &&
      ["/login", "/signup", "/"].includes(request.nextUrl.pathname)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}
