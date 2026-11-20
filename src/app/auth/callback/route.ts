import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export async function GET(request:Request) {
  const url=new URL(request.url);
  const authError=url.searchParams.get("error_description") || url.searchParams.get("error") || url.searchParams.get("error_code");
  if(authError) {
    const params=new URLSearchParams({error:authError});
    const code=url.searchParams.get("error_code");
    if(code) params.set("code",code);
    return NextResponse.redirect(new URL(`/auth/verify?${params.toString()}`,url.origin));
  }

  const code=url.searchParams.get("code");
  if(!code) return NextResponse.redirect(new URL("/auth/verify?error=The%20verification%20link%20is%20missing%20its%20authorization%20code.",url.origin));

  const supabase=await createClient();
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error) return NextResponse.redirect(new URL("/auth/verify?error="+encodeURIComponent(error.message),url.origin));

  return NextResponse.redirect(new URL("/auth/verify?status=success",url.origin));
}
