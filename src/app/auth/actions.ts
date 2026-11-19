"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function signIn(formData:FormData){
 const email=String(formData.get("email")||"").trim(),password=String(formData.get("password")||"");
 const supabase=await createClient(); const {error}=await supabase.auth.signInWithPassword({email,password});
 if(error) redirect("/login?error="+encodeURIComponent(error.message)); redirect("/admin");
}
export async function signUp(formData:FormData){
 const email=String(formData.get("email")||"").trim().toLowerCase(),password=String(formData.get("password")||"");
 const base=(process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000").replace(/\/$/,"");
 const supabase=await createClient();
 const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:base+"/auth/callback"}});
 if(error) redirect("/signup?error="+encodeURIComponent(error.message));
 if(data.user && data.user.identities?.length===0) redirect("/login?message="+encodeURIComponent("This email already has an account. Please sign in instead of registering again."));
 redirect("/signup?message="+encodeURIComponent("Account request received. Check your inbox and spam folder for the verification email. If it does not arrive, wait before requesting another email."));
}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();redirect("/");}
