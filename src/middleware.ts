import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/auth", "/configuracao", "/privacidade"];
const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha"];

/** Rota interna do painel admin: nunca acessível pelo próprio nome. */
const ADMIN_INTERNAL = "/painel-admin";

function startsWithAny(path: string, list: string[]) {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Endereço secreto do admin (variável só do servidor). Sem ela, o admin fica desligado. */
function adminSecret(): string | null {
  const v = process.env.ADMIN_PATH?.trim();
  return v && /^[A-Za-z0-9_-]{16,}$/.test(v) ? v : null;
}

function notFound(request: NextRequest) {
  // Reescreve para uma rota inexistente: resposta 404 idêntica a qualquer página que não existe.
  return NextResponse.rewrite(new URL("/__nao-encontrado", request.url), { status: 404 });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Ninguém acessa o painel pelo nome interno.
  if (startsWithAny(path, [ADMIN_INTERNAL])) return notFound(request);

  if (!isSupabaseConfigured) {
    if (path === "/configuracao") return NextResponse.next();
    return NextResponse.redirect(new URL("/configuracao", request.url));
  }

  const secret = adminSecret();
  const isAdminPath = secret !== null && (path === `/${secret}` || path.startsWith(`/${secret}/`));

  let response = isAdminPath
    ? NextResponse.rewrite(new URL(ADMIN_INTERNAL + path.slice(secret.length + 1) + request.nextUrl.search, request.url), { request })
    : NextResponse.next({ request });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = isAdminPath
          ? NextResponse.rewrite(new URL(ADMIN_INTERNAL + path.slice(secret!.length + 1) + request.nextUrl.search, request.url), { request })
          : NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath) {
    // Sem sessão: mesmo comportamento de qualquer página protegida (não revela nada).
    // Logado sem permissão: 404 idêntico ao de página inexistente (decidido no servidor e no banco).
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  if (!user && path !== "/" && !startsWithAny(path, PUBLIC_PATHS)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
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
