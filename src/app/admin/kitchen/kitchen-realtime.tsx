"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import type {FormEvent} from "react";
import {createClient} from "@/lib/supabase/client";
import {BellRing,Check,Volume2,VolumeX,ChefHat,Clock3, X,Radio} from "lucide-react";

type Order=any;
type Props={restaurantId:string;initialOrders:Order[];updateOrderStatus:(formData:FormData)=>void|Promise<void>;mode?:"ADMIN"|"CHEF"};
const cols=[{key:"NEW",title:"New orders"},{key:"ACCEPTED",title:"Accepted"},{key:"COOKING",title:"Preparing"},{key:"READY",title:"Ready to serve"}];

export default function KitchenRealtime({restaurantId,initialOrders,updateOrderStatus,mode="ADMIN"}:Props){
 const [orders,setOrders]=useState<Order[]>(initialOrders||[]);
 const [incoming,setIncoming]=useState<Order|null>(null);
 const [audioReady,setAudioReady]=useState(false);
 const [connection,setConnection]=useState("CONNECTING");
 const incomingRef=useRef<Order|null>(null);
 const [pendingOrderId,setPendingOrderId]=useState<string|null>(null);
 const [actionError,setActionError]=useState("");
 const audioRef=useRef<AudioContext|null>(null);
 const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
 const seenRef=useRef(new Set<string>((initialOrders||[]).map(o=>o.id)));
 const supabase=useRef(createClient());

 const stopRing=useCallback(()=>{
   if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
 },[]);
 const ring=useCallback(()=>{
   const ctx=audioRef.current;
   if(!ctx||ctx.state!=="running")return;
   const play=(frequency:number,at:number)=>{
     const osc=ctx.createOscillator();const gain=ctx.createGain();
     osc.type="sine";osc.frequency.setValueAtTime(frequency,at);
     gain.gain.setValueAtTime(0.0001,at);gain.gain.exponentialRampToValueAtTime(0.16,at+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,at+0.32);
     osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+0.34);
   };
   const now=ctx.currentTime;play(880,now);play(1174,now+0.22);
 },[]);
 const startRing=useCallback(()=>{
   stopRing();ring();timerRef.current=setInterval(ring,1450);
 },[ring,stopRing]);
 const acknowledge=()=>{stopRing();setIncoming(null);};
 const handleMove=async(e:FormEvent<HTMLFormElement>,orderId:string)=>{
   e.preventDefault();
   if(pendingOrderId)return;
   const form=e.currentTarget;
   const fd=new FormData(form);
   const nextStatus=String(fd.get("status")||"");
   setPendingOrderId(orderId);setActionError("");
   try{
     await updateOrderStatus(fd);
     if(["SERVED","CANCELLED"].includes(nextStatus)){
       setOrders((current:Order[])=>current.filter(o=>o.id!==orderId));
       setIncoming((current:Order|null)=>current?.id===orderId?null:current);
     }else{
       setOrders((current:Order[])=>current.map(o=>o.id===orderId?{...o,status:nextStatus}:o));
       setIncoming((current:Order|null)=>current?.id===orderId?{...current,status:nextStatus}:current);
     }
   }catch(err){
     setActionError(err instanceof Error?err.message:"Could not update this ticket. Please try again.");
   }finally{setPendingOrderId(null);}
 };

 useEffect(()=>{incomingRef.current=incoming;},[incoming]);

 // Realtime is the fast path; poll as a recovery path so a dropped socket/event
 // can never leave the kitchen unaware of a newly placed QR order.
 useEffect(()=>{
   let active=true;
   const checkForNewOrders=async()=>{
     const {data,error}=await supabase.current.from("orders")
       .select("id,order_number,status,created_at,customer_name,notes,restaurant_tables(number,name),order_items(product_name,quantity,special_instructions,is_addon)")
       .eq("restaurant_id",restaurantId).eq("status","NEW")
       .order("created_at",{ascending:false}).limit(30);
     if(!active||error||!data)return;
     for(const order of [...data].reverse()){
       if(seenRef.current.has(order.id))continue;
       seenRef.current.add(order.id);
       setOrders((current:Order[])=>[order,...current.filter(o=>o.id!==order.id)]);
       setIncoming(order);
     }
   };
   void checkForNewOrders();
   const poll=setInterval(()=>void checkForNewOrders(),2500);
   return()=>{active=false;clearInterval(poll);};
 },[restaurantId]);

 // Keep the alert ring enabled. Browsers require a user gesture before audio can play,
 // so unlock audio on the first click/tap/key press and ring automatically thereafter.
 useEffect(()=>{
   let unlocked=false;
   const unlock=async()=>{
     if(unlocked)return;
     try{
       const AudioCtx=window.AudioContext||(window as any).webkitAudioContext;
       if(!AudioCtx)return;
       if(!audioRef.current)audioRef.current=new AudioCtx();
       await audioRef.current.resume();
       if(audioRef.current.state!=="running")return;
       unlocked=true;
       setAudioReady(true);
       window.removeEventListener("pointerdown",unlock);
       window.removeEventListener("keydown",unlock);
       if(incomingRef.current)startRing();
     }catch{/* Browser may still be blocking audio; retry on the next user gesture. */}
   };
   window.addEventListener("pointerdown",unlock);
   window.addEventListener("keydown",unlock);
   return()=>{
     window.removeEventListener("pointerdown",unlock);
     window.removeEventListener("keydown",unlock);
   };
 },[startRing]);

 useEffect(()=>{
   if(incoming&&audioReady)startRing();else stopRing();
   return()=>stopRing();
 },[incoming,audioReady,startRing,stopRing]);

 useEffect(()=>{
   let active=true;
   const channel=supabase.current.channel("kitchen-orders-"+restaurantId)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"orders",filter:"restaurant_id=eq."+restaurantId},async(payload:any)=>{
      const id=String(payload.new?.id||"");
      if(!id||seenRef.current.has(id))return;
      const {data,error}=await supabase.current.from("orders")
       .select("id,order_number,status,created_at,customer_name,notes,restaurant_tables(number,name),order_items(product_name,quantity,special_instructions,is_addon)")
       .eq("id",id).eq("restaurant_id",restaurantId).maybeSingle();
      if(!active||error||!data||seenRef.current.has(id))return;
      seenRef.current.add(id);
      if(!["NEW","ACCEPTED","COOKING","READY"].includes(data.status))return;
      setOrders((current:Order[])=>[data,...current.filter(o=>o.id!==data.id)]);
      if(data.status==="NEW")setIncoming(data);
   })
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"orders",filter:"restaurant_id=eq."+restaurantId},async(payload:any)=>{
      const id=String(payload.new?.id||"");
      if(!id)return;
      const status=String(payload.new?.status||"");
      if(["SERVED","CANCELLED"].includes(status)){
        setOrders((current:Order[])=>current.filter(o=>o.id!==id));
        setIncoming((current:Order|null)=>current?.id===id?null:current);
        return;
      }
      const {data,error}=await supabase.current.from("orders")
       .select("id,order_number,status,created_at,customer_name,notes,restaurant_tables(number,name),order_items(product_name,quantity,special_instructions,is_addon)")
       .eq("id",id).eq("restaurant_id",restaurantId).maybeSingle();
      if(!active||error||!data)return;
      if(!["NEW","ACCEPTED","COOKING","READY"].includes(data.status))return;
      setOrders((current:Order[])=>[data,...current.filter(o=>o.id!==id)]);
      setIncoming((current:Order|null)=>current?.id===id?data:current);
   })
   .subscribe((status:string)=>{if(active)setConnection(status==="SUBSCRIBED"?"LIVE":status==="CHANNEL_ERROR"?"OFFLINE":status);});
   return()=>{active=false;stopRing();supabase.current.removeChannel(channel);};
 },[restaurantId,stopRing]);

 const formatTime=(value:string)=>new Date(value).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4">
   <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/10 text-orange-300"><Radio size={19}/></span><div><p className="text-sm font-bold">Live kitchen connection</p><p className="mt-1 text-xs text-slate-400">New customer orders appear here instantly.</p></div></div>
   <div className="flex flex-wrap items-center gap-2">
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold tracking-wider"><i className={`h-2 w-2 rounded-full ${connection==="LIVE"?"bg-emerald-400 shadow-[0_0_10px_#34d399]":"bg-amber-400"}`}/>{connection==="LIVE"?"LIVE":connection}</span>
    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs font-bold text-emerald-300"><Volume2 size={15}/> Ring always enabled{!audioReady?" · waiting for first interaction":""}</span>
   </div>
  </div>
  {actionError&&<p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{actionError}</p>}
  <div className="grid gap-4 xl:grid-cols-4">{cols.map(col=>{const list=orders.filter(o=>o.status===col.key);return <section key={col.key} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-center justify-between px-1 py-2"><h2 className="font-bold">{col.title}</h2><span className="count-pill">{list.length}</span></div><div className="mt-2 space-y-3">{list.map((o:any)=><article key={o.id} className={`rounded-xl border p-4 ${o.status==="NEW"?"border-orange-400/40 bg-orange-400/[.06]":"border-white/[.08] bg-[#111827]"}`}><div className="flex justify-between gap-2"><p className="font-bold">#{o.order_number}</p><span className="text-[10px] text-slate-500">{formatTime(o.created_at)}</span></div><p className="mt-1 text-xs text-slate-400">{o.restaurant_tables?.name||"Table "+(o.restaurant_tables?.number||"—")} · {o.customer_name||"Guest"}</p><div className="my-3 space-y-2 border-y border-white/[.06] py-3">{(o.order_items||[]).map((it:any,i:number)=><div key={i}><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{it.quantity} × {it.product_name}</p>{it.is_addon&&<span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">Added later</span>}</div>{it.special_instructions&&<p className="mt-1 text-[11px] text-amber-200">{it.special_instructions}</p>}</div>)}</div>{o.notes&&<p className="mb-3 text-xs text-slate-400">Note: {o.notes}</p>}{mode==="CHEF"&&(col.key==="NEW"||col.key==="READY")?<p className="rounded-lg bg-white/[.04] px-3 py-2 text-center text-[11px] text-slate-500">{col.key==="NEW"?"Waiting for manager to accept this order.":"Waiting for service staff to mark this order served."}</p>:<form onSubmit={(e)=>handleMove(e,o.id)} className="space-y-2"><input type="hidden" name="id" value={o.id}/><select name="status" defaultValue={col.key==="NEW"?"ACCEPTED":col.key==="ACCEPTED"?"COOKING":col.key==="COOKING"?"READY":"SERVED"} className="field w-full">{(mode==="CHEF"?(col.key==="ACCEPTED"?["COOKING"]:col.key==="COOKING"?["READY"]:[]):(col.key==="NEW"?["ACCEPTED","CANCELLED"]:col.key==="ACCEPTED"?["COOKING","CANCELLED"]:col.key==="COOKING"?["READY","CANCELLED"]:["SERVED"])).map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select><button type="submit" disabled={pendingOrderId===o.id} className="btn-primary w-full disabled:cursor-wait disabled:opacity-60">{pendingOrderId===o.id?"Updating...":col.key==="READY"?"Mark served":"Move ticket"}</button></form>}</article>)}{!list.length&&<p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-600">No tickets</p>}</div></section>})}</div>
  {incoming&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-labelledby="incoming-order-title"><div className="kitchen-alert-ring relative w-full max-w-md overflow-hidden rounded-[28px] border border-orange-300/40 bg-[#111827] p-7 text-center shadow-[0_0_90px_rgba(249,115,22,.28)]"><div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-orange-500 to-amber-300"/><div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-orange-400/15 text-orange-300"><BellRing size={36} className="animate-bounce"/></div><span className="rounded-full border border-orange-300/30 bg-orange-300/10 px-3 py-1 text-[9px] font-black tracking-[.2em] text-orange-200">NEW CUSTOMER ORDER</span><h2 id="incoming-order-title" className="mt-4 text-3xl font-black text-white">Order #{incoming.order_number}</h2><p className="mt-2 text-sm text-slate-300">{incoming.restaurant_tables?.name||"Table "+(incoming.restaurant_tables?.number||"—")} · {incoming.customer_name||"Guest"}</p><div className="my-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>ORDER ITEMS</span><span>{formatTime(incoming.created_at)}</span></div>{(incoming.order_items||[]).map((it:any,i:number)=><div key={i} className="flex justify-between gap-3 py-1.5 text-sm"><span className="text-white">{it.quantity} × {it.product_name}</span>{it.special_instructions&&<span className="text-right text-xs text-amber-300">{it.special_instructions}</span>}</div>)}{incoming.notes&&<p className="mt-3 border-t border-white/10 pt-3 text-xs text-amber-200">Note: {incoming.notes}</p>}</div><button type="button" onClick={acknowledge} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20 hover:brightness-110"><Check size={18}/> Acknowledge order</button><p className="mt-3 text-[10px] text-slate-500">The ticket will remain in the New Orders column until your team accepts it.</p></div></div>}
  <style jsx>{`@keyframes kitchenPulse{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,.35),0 0 60px rgba(249,115,22,.15)}50%{box-shadow:0 0 0 14px rgba(251,146,60,0),0 0 95px rgba(249,115,22,.35)}}.kitchen-alert-ring{animation:kitchenPulse 1.25s ease-in-out infinite}`}</style>
 </div>;
}
