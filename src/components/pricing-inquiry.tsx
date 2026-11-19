"use client";

import { useState } from "react";
import { X, Send, CheckCircle2, Loader2 } from "lucide-react";

type Props = { plan?: string; className?: string; children: React.ReactNode };

export function PricingInquiryButton({ plan = "Professional", className = "", children }: Props) {
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [done,setDone]=useState(false);
 const [form,setForm]=useState({name:"",restaurant:"",email:"",phone:"",message:""});
 const change=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const res=await fetch("/api/pricing-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,plan})});
   const data=await res.json();
   if(!res.ok) throw new Error(data.error||"Unable to send your inquiry. Please try again.");
   setDone(true);
  }catch(err){setError(err instanceof Error?err.message:"Something went wrong.");}
  finally{setBusy(false);}
 }
 return <>
  <button type="button" onClick={()=>{setOpen(true);setDone(false);setError("");}} className={className}>{children}</button>
  {open&&<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <div role="dialog" aria-modal="true" aria-labelledby="pricing-inquiry-title" className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#101827] shadow-2xl shadow-black/60">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-300 via-orange-500 to-amber-300"/>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Close form" className="absolute right-5 top-5 rounded-full border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18}/></button>
    <div className="p-6 sm:p-8">
     {!done?<><p className="text-xs font-black tracking-[.22em] text-orange-300">LET'S TALK RESTAURANT TECH</p><h2 id="pricing-inquiry-title" className="mt-3 text-3xl font-black tracking-tight">Request a <span className="text-orange-400">pricing quote.</span></h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Tell us a little about your restaurant. Our team will get back to you about the {plan} plan.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
       <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-300">Your name *<input required maxLength={100} value={form.name} onChange={e=>change("name",e.target.value)} placeholder="Full name" className="field mt-2"/></label><label className="block text-xs font-semibold text-slate-300">Restaurant name *<input required maxLength={120} value={form.restaurant} onChange={e=>change("restaurant",e.target.value)} placeholder="Restaurant name" className="field mt-2"/></label></div>
       <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-300">Email address *<input required type="email" maxLength={254} value={form.email} onChange={e=>change("email",e.target.value)} placeholder="you@example.com" className="field mt-2"/></label><label className="block text-xs font-semibold text-slate-300">Phone / WhatsApp *<input required type="tel" maxLength={30} value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="+92 3XX XXXXXXX" className="field mt-2"/></label></div>
       <label className="block text-xs font-semibold text-slate-300">What do you need? <textarea rows={3} maxLength={1500} value={form.message} onChange={e=>change("message",e.target.value)} placeholder="Number of branches, tables, or any questions..." className="field mt-2 resize-y"/></label>
       {error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p>}
       <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60">{busy?<Loader2 size={17} className="animate-spin"/>:<Send size={16}/>}Send pricing inquiry</button>
       <p className="text-center text-[11px] text-slate-500">Your details will only be used to respond to this inquiry.</p>
      </form>
     </>:<div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={34}/></span><h2 className="mt-5 text-2xl font-black">Inquiry received!</h2><p className="mt-2 text-sm leading-6 text-slate-400">Thanks for contacting RestaurantOS. We’ll reach out to you shortly.</p><button type="button" onClick={()=>setOpen(false)} className="mt-7 rounded-xl bg-orange-400 px-6 py-3 text-sm font-black text-slate-950">Close</button></div>}
    </div>
   </div>
  </div>}
 </>;
}
