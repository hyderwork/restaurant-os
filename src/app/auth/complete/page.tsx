"use client";

import {useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function AuthCompletePage() {
  const router=useRouter();
  const params=useSearchParams();
  const [message,setMessage]=useState("Confirming your email securely…");

  useEffect(()=>{
    let active=true;
    const complete=async()=>{
      const hash=window.location.hash.startsWith("#")?window.location.hash.slice(1):"";
      const values=new URLSearchParams(hash);
      const accessToken=values.get("access_token");
      const refreshToken=values.get("refresh_token");
      const error=values.get("error_description")||values.get("error");
      if(error) {
        if(active) setMessage(decodeURIComponent(error.replace(/\+/g," ")));
        return;
      }
      if(!accessToken||!refreshToken) {
        if(active) setMessage("This email link is incomplete or has expired. Please request a new verification email.");
        return;
      }
      const supabase=createClient();
      const {error:sessionError}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      if(sessionError) {
        if(active) setMessage(sessionError.message);
        return;
      }
      const requestedNext=params.get("next")||"/auth/set-password";
      const next=requestedNext.startsWith("/")&&!requestedNext.startsWith("//")?requestedNext:"/auth/set-password";
      router.replace(next);
    };
    void complete();
    return()=>{active=false;};
  },[params,router]);

  return <main className="grid min-h-screen place-items-center px-5">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-400/10 text-2xl text-orange-300">✉</div>
      <h1 className="mt-6 text-2xl font-black">Completing verification</h1>
      <p role="status" className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
      <a href="/auth/verify" className="mt-6 inline-block text-sm text-orange-300">Request a new verification link</a>
    </section>
  </main>;
}
