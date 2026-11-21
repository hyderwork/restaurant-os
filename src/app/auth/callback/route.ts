import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(request:Request) {
  const url=new URL(request.url);
  const next=url.searchParams.get("next");
  const safeNext=next && next.startsWith("/") && !next.startsWith("//") ? next : "/auth/set-password";
  const authError=url.searchParams.get("error_description") || url.searchParams.get("error") || url.searchParams.get("error_code");
  if(authError) {
    const params=new URLSearchParams({error:authError});
    const code=url.searchParams.get("error_code");
    if(code) params.set("code",code);
    return NextResponse.redirect(new URL(`/auth/verify?${params.toString()}`,url.origin));
  }

  const supabase=await createClient();
  const code=url.searchParams.get("code");
  if(code) {
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error) return NextResponse.redirect(new URL("/auth/verify?error="+encodeURIComponent(error.message),url.origin));
    return NextResponse.redirect(new URL(safeNext,url.origin));
  }

  // Support Supabase email templates that send token_hash instead of a PKCE code.
  const tokenHash=url.searchParams.get("token_hash");
  const type=url.searchParams.get("type");
  if(tokenHash && (type==="signup" || type==="recovery" || type==="email" || type==="invite" || type==="magiclink")) {
    const {error}=await supabase.auth.verifyOtp({token_hash:tokenHash,type});
    if(error) return NextResponse.redirect(new URL("/auth/verify?error="+encodeURIComponent(error.message),url.origin));
    return NextResponse.redirect(new URL(type==="recovery"?"/auth/set-password":safeNext,url.origin));
  }

  // Some legacy Supabase confirmation templates return access_token in the URL hash.
  // URL fragments are not sent to the server, so let the browser establish the session.
  return NextResponse.redirect(new URL("/auth/complete?next="+encodeURIComponent(safeNext),url.origin));
}
