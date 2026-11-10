import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/auth", "/configuracao", "/privacidade"];
const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha"];

function startsWithAny(path: string, list: string[]) {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Sem Supabase configurado, não fingimos que existe banco: mostramos o guia.
  if (!isSupabaseConfigured) {
    if (path === "/configuracao") return NextResponse.next();
    return NextResponse.redirect(new URL("/configuracao", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Renova a sessão e confirma o usuário no servidor do Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !startsWithAny(path, PUBLIC_PATHS)) {
    const url = new URL("/login", request.url);
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && startsWithAny(path, AUTH_PAGES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
