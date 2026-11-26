import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {createRestaurant,updateRestaurantAccess,savePackage,resendOwnerSetupEmail} from "./actions";
import DeleteRestaurantButton from "./delete-restaurant-button";

const field="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const label="block text-[10px] font-bold uppercase tracking-wide text-slate-500";
const button="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-orange-600";
export default async function Page({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){
 const params=await searchParams; const {supabase}=await requirePlatformAdmin();
 const [a,b]=await Promise.all([
  supabase.from("restaurants").select("id,name,slug,email,status,created_at,memberships(role,users(email,full_name)),subscriptions(status,subscription_plans(id,name,monthly_price))").order("created_at",{ascending:false}),
  supabase.from("subscription_plans").select("id,name,monthly_price,max_tables,max_staff").eq("active",true).order("monthly_price")
 ]);
 if(a.error) throw new Error(a.error.message); if(b.error) throw new Error(b.error.message);
 const rs=a.data||[],ps=b.data||[];
 const active=rs.filter((r:any)=>r.status==="ACTIVE").length, suspended=rs.filter((r:any)=>r.status==="SUSPENDED").length;
 const trialing=rs.filter((r:any)=>r.subscriptions?.[0]?.status==="TRIALING").length;
 const mrr=rs.reduce((n:number,r:any)=>{const s=r.subscriptions?.[0];return n+(s?.status==="ACTIVE"?Number(s?.subscription_plans?.monthly_price||0):0)},0);
 const stats=[["Workspaces",rs.length,"Registered accounts"],["Active",active,"Operational"],["On trial",trialing,"Trial subscriptions"],["Monthly revenue",`PKR ${mrr.toLocaleString("en-PK")}`,"From active plans"]];
 return <div className="space-y-7 text-slate-800">
  <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
   <div><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-orange-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Platform overview</div><h1 className="text-3xl font-black tracking-[-.045em] text-slate-950 md:text-4xl">Good to see you.</h1><p className="mt-2 text-sm text-slate-500">Here’s what’s happening across your restaurant network.</p></div>
   <a href="#create-workspace" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600">＋ Add restaurant</a>
  </section>
  {params.error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div>}
  {params.success&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{params.success}</div>}
  <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
   {stats.map(([name,value,desc],i)=><div key={name as string} className={`relative p-5 ${i?"border-t border-slate-100 sm:border-l sm:border-t-0":""} `}><p className="text-xs font-semibold text-slate-500">{name}</p><p className="mt-2 text-[27px] font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-[10px] text-slate-400">{desc}</p></div>)}
  </section>
  <section id="create-workspace" className="scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
   <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-extrabold text-slate-900">Create restaurant workspace</h2><p className="mt-1 text-xs text-slate-500">Add a restaurant and send its owner an account setup invitation.</p></div><span className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-[10px] font-bold text-orange-700">NEW WORKSPACE</span></div>
   <form action={createRestaurant} className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
    {([[ "name","Restaurant name","text"],["slug","URL slug","text"],["owner_email","Owner email","email"],["owner_name","Owner full name","text"],["phone","Phone / WhatsApp","text"],["address","Restaurant address","text"]] as const).map(([n,l,t])=><label key={n} className={label}>{l}<input required={n==="name"||n==="owner_email"} name={n} type={t} placeholder={n==="slug"?"e.g. spicy-dera":n==="owner_email"?"owner@example.com":""} className={field}/></label>)}
    <label className={label}>Subscription plan<select name="plan_id" required className={field}>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name} · PKR {p.monthly_price}</option>)}</select></label>
    <label className={label}>Trial days<input name="trial_days" type="number" min="0" max="90" defaultValue="14" className={field}/></label>
    <div className="flex items-end sm:col-span-2 xl:col-span-4"><button className={button}>Create workspace & invite owner <span aria-hidden="true">→</span></button></div>
   </form>
  </section>
  <section id="restaurant-accounts" className="scroll-mt-5 space-y-3">
   <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black tracking-tight text-slate-950">Restaurant accounts</h2><p className="mt-1 text-xs text-slate-500">Manage workspace access, subscription and owner invitations.</p></div><span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">{rs.length} total</span></div>
   <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="hidden grid-cols-[minmax(180px,1.6fr)_minmax(140px,1fr)_110px_120px_90px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[9px] font-extrabold uppercase tracking-[.13em] text-slate-400 md:grid"><span>Restaurant</span><span>Owner</span><span>Plan</span><span>Status</span><span className="text-right">Manage</span></div>
    {rs.map((r:any)=>{const owner=r.memberships?.find((m:any)=>m.role==="OWNER");const u=Array.isArray(owner?.users)?owner.users[0]:owner?.users;const sub=r.subscriptions?.[0];return <article key={r.id} className="border-b border-slate-100 last:border-0">
     <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(180px,1.6fr)_minmax(140px,1fr)_110px_120px_90px] md:items-center md:gap-3 md:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-sm font-black text-orange-700">{String(r.name||"R").slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{r.name}</p><p className="truncate text-[10px] text-slate-400">/{r.slug}</p></div></div>
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{u?.full_name||"Owner not linked"}</p><p className="truncate text-[10px] text-slate-400">{u?.email||r.email||"—"}</p></div>
      <div><span className="text-xs font-semibold text-slate-700">{sub?.subscription_plans?.name||"No plan"}</span></div>
      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold ${r.status==="ACTIVE"?"bg-emerald-50 text-emerald-700":r.status==="SUSPENDED"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-700"}`}>{r.status}</span></div>
      <div className="flex justify-start md:justify-end"><span className="text-[10px] text-slate-400">Workspace controls below</span></div>
     </div>
     <details className="group border-t border-slate-100 bg-slate-50/70">
      <summary className="flex cursor-pointer list-none items-center justify-end gap-2 px-5 py-3 text-[11px] font-bold text-slate-600 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><span>Manage workspace</span><span className="transition-transform group-open:rotate-180">⌄</span></summary>
      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
       <form action={updateRestaurantAccess} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="restaurant_id" value={r.id}/>
        <label className={label}>Workspace status<select name="status" defaultValue={r.status} className={field}>{["ACTIVE","SUSPENDED","CLOSED","PENDING"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className={label}>Package<select name="plan_id" defaultValue={sub?.subscription_plans?.id||""} className={field}><option value="">Keep current</option>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className={label}>Subscription<select name="subscription_status" defaultValue={sub?.status||"ACTIVE"} className={field}>{["TRIALING","ACTIVE","PAST_DUE","CANCELED","EXPIRED"].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="flex items-end"><button className={button+" w-full"}>Save changes</button></div>
       </form>
       <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">{u?.email&&<form action={resendOwnerSetupEmail}><input type="hidden" name="restaurant_id" value={r.id}/><input type="hidden" name="owner_email" value={u.email}/><button className="rounded-lg border border-orange-200 px-3 py-2 text-[10px] font-bold text-orange-700 hover:bg-orange-50">Resend setup email</button></form>}<DeleteRestaurantButton restaurantId={r.id} restaurantName={r.name}/></div>
      </div>
     </details>
    </article>})}
    {!rs.length&&<p className="p-10 text-center text-sm text-slate-400">No restaurant accounts yet.</p>}
   </div>
   <p className="text-[10px] text-slate-400">{suspended} suspended · {ps.length} active packages available</p>
  </section>
  <section id="package-management" className="scroll-mt-5 space-y-3">
   <div><h2 className="text-lg font-black tracking-tight text-slate-950">Plans & pricing</h2><p className="mt-1 text-xs text-slate-500">Update monthly pricing and workspace limits.</p></div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ps.map((p:any)=><form key={p.id} action={savePackage} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><input type="hidden" name="plan_id" value={p.id}/><div className="mb-4 flex items-center justify-between"><p className="text-sm font-extrabold text-slate-900">{p.name}</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">ACTIVE</span></div>
    <label className={label}>Package name<input name="plan_name" defaultValue={p.name} className={field}/></label><label className={label+" mt-3"}>Monthly price (PKR)<input name="monthly_price" type="number" min="0" step="1" defaultValue={p.monthly_price} className={field}/></label>
    <div className="mt-3 grid grid-cols-2 gap-2"><label className={label}>Max tables<input name="max_tables" type="number" min="1" defaultValue={p.max_tables} className={field}/></label><label className={label}>Max staff<input name="max_staff" type="number" min="1" defaultValue={p.max_staff} className={field}/></label></div>
    <input type="hidden" name="active" value="true"/><button className={button+" mt-4 w-full"}>Save plan</button>
   </form>)}</div>
   <form action={savePackage} className="grid gap-2 rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4 sm:grid-cols-2 xl:grid-cols-5"><input name="plan_name" required placeholder="New package name" className={field+" mt-0"}/><input name="monthly_price" type="number" min="0" required placeholder="Price PKR" className={field+" mt-0"}/><input name="max_tables" type="number" min="1" required placeholder="Max tables" className={field+" mt-0"}/><input name="max_staff" type="number" min="1" required placeholder="Max staff" className={field+" mt-0"}/><input type="hidden" name="active" value="true"/><button className="rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-orange-600">＋ Add package</button></form>
  </section>
 </div>;
}
