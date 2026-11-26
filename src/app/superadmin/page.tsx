import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {createRestaurant,updateRestaurantAccess,savePackage,resendOwnerSetupEmail} from "./actions";
import DeleteRestaurantButton from "./delete-restaurant-button";
import {Activity,ArrowRight,Building2,CheckCircle2,ChevronDown,Clock3,Crown,Mail,Package,Plus,RefreshCw,Settings2,Store,Wallet} from "lucide-react";

const field="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const label="block text-[10px] font-bold uppercase tracking-wide text-slate-500";
const button="sa-primary-btn";
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
 return <div className="superadmin-page space-y-7 text-slate-800">
  <section className="flex flex-wrap items-end justify-between gap-4">
   <div>
    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Good to see you.</h1>
    <p className="mt-2 text-sm text-slate-500">Your command center for restaurant workspaces, subscriptions and platform health.</p>
   </div>
   <div className="flex flex-wrap items-center gap-2">
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Platform protected</span>
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600"><Activity size={12}/> Live workspace overview</span>
   </div>
  </section>
  {params.error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div>}
  {params.success&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{params.success}</div>}
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {stats.map(([name,value,desc],i)=><div key={name as string} className="sa-stat-card"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold text-slate-500">{name}</p><p className="mt-2 text-[26px] font-black tracking-tight text-slate-950">{value}</p></div><span className={`sa-stat-icon ${i===0?"blue":i===1?"green":i===2?"violet":"orange"}`}>{i===0?<Building2 size={19}/>:i===1?<Activity size={19}/>:i===2?<Clock3 size={19}/>:<Wallet size={19}/>}</span></div><div className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">{desc}</div></div>)}
  </section>
  <section id="create-workspace" className="sa-panel scroll-mt-5">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5"><div className="flex items-center gap-3"><span className="sa-section-icon"><Store size={17}/></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-600">Workspace provisioning</p><h2 className="mt-1 text-sm font-extrabold text-slate-900">Create restaurant workspace</h2><p className="mt-1 text-xs text-slate-500">Add a restaurant and invite its owner to complete account setup.</p></div></div><span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-extrabold text-orange-700"><Plus size={12}/> NEW WORKSPACE</span></div>
   <form action={createRestaurant} className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
    {([[ "name","Restaurant name","text"],["slug","URL slug","text"],["owner_email","Owner email","email"],["owner_name","Owner full name","text"],["phone","Phone / WhatsApp","text"],["address","Restaurant address","text"]] as const).map(([n,l,t])=><label key={n} className={label}>{l}<input required={n==="name"||n==="owner_email"} name={n} type={t} placeholder={n==="slug"?"e.g. spicy-dera":n==="owner_email"?"owner@example.com":""} className={field}/></label>)}
    <label className={label}>Subscription plan<select name="plan_id" required className={field}>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name} · PKR {p.monthly_price}</option>)}</select></label>
    <label className={label}>Trial days<input name="trial_days" type="number" min="0" max="90" defaultValue="14" className={field}/></label>
    <div className="flex items-end sm:col-span-2 xl:col-span-4"><button className={button}><Plus size={15}/> Create workspace <ArrowRight size={14}/></button></div>
   </form>
  </section>
  <section id="restaurant-accounts" className="scroll-mt-5 space-y-4">
   <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-3"><span className="sa-section-icon"><Building2 size={17}/></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-600">Tenant management</p><h2 className="text-lg font-black tracking-tight text-slate-950">Restaurant accounts</h2><p className="mt-1 text-xs text-slate-500">Manage workspace access, subscriptions and owner invitations.</p></div></div><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold text-slate-600"><Store size={13}/>{rs.length} total workspaces</span></div>
   <div className="sa-panel overflow-hidden">
    <div className="hidden grid-cols-[minmax(180px,1.6fr)_minmax(140px,1fr)_110px_120px_90px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[9px] font-extrabold uppercase tracking-[.13em] text-slate-400 md:grid"><span>Restaurant</span><span>Owner</span><span>Plan</span><span>Status</span><span className="text-right">Manage</span></div>
    {rs.map((r:any)=>{const owner=r.memberships?.find((m:any)=>m.role==="OWNER");const u=Array.isArray(owner?.users)?owner.users[0]:owner?.users;const sub=r.subscriptions?.[0];return <article key={r.id} className="border-b border-slate-100 last:border-0">
     <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(180px,1.6fr)_minmax(140px,1fr)_110px_120px_90px] md:items-center md:gap-3 md:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-sm font-black text-orange-700">{String(r.name||"R").slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{r.name}</p><p className="truncate text-[10px] text-slate-400">/{r.slug}</p></div></div>
      <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{u?.full_name||"Owner not linked"}</p><p className="flex items-center gap-1 truncate text-[10px] text-slate-400"><Mail size={11}/>{u?.email||r.email||"—"}</p></div>
      <div><span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><Crown size={13} className="text-orange-500"/>{sub?.subscription_plans?.name||"No plan"}</span></div>
      <div><span className={`sa-status ${r.status==="ACTIVE"?"active":r.status==="SUSPENDED"?"suspended":"pending"}`}><span/>{r.status}</span></div>
      <div className="flex justify-start md:justify-end"><span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold text-slate-600"><Settings2 size={13}/> Manage below</span></div>
     </div>
     <details className="group border-t border-slate-100 bg-slate-50/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 text-[10px] font-extrabold text-slate-500 hover:bg-orange-50/50 hover:text-orange-700 [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><Settings2 size={13}/> Workspace settings · {r.name}</span><ChevronDown size={14} className="transition-transform group-open:rotate-180"/></summary>
      <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
       <form action={updateRestaurantAccess} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input type="hidden" name="restaurant_id" value={r.id}/>
        <label className={label}>Workspace status<select name="status" defaultValue={r.status} className={field}>{["ACTIVE","SUSPENDED","CLOSED","PENDING"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className={label}>Package<select name="plan_id" defaultValue={sub?.subscription_plans?.id||""} className={field}><option value="">Keep current</option>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className={label}>Subscription<select name="subscription_status" defaultValue={sub?.status||"ACTIVE"} className={field}>{["TRIALING","ACTIVE","PAST_DUE","CANCELED","EXPIRED"].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="flex items-end"><button className={button+" w-full"}><CheckCircle2 size={14}/> Save changes</button></div>
       </form>
       <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">{u?.email&&<form action={resendOwnerSetupEmail}><input type="hidden" name="restaurant_id" value={r.id}/><input type="hidden" name="owner_email" value={u.email}/><button className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-3.5 py-2.5 text-[10px] font-bold text-orange-700 hover:bg-orange-50"><RefreshCw size={13}/> Resend setup email</button></form>}<DeleteRestaurantButton restaurantId={r.id} restaurantName={r.name}/></div>
      </div>
     </details>
    </article>})}
    {!rs.length&&<p className="p-10 text-center text-sm text-slate-400">No restaurant accounts yet.</p>}
   </div>
   <p className="text-[10px] text-slate-400">{suspended} suspended · {ps.length} active packages available</p>
  </section>
  <section id="package-management" className="scroll-mt-5 space-y-4">
   <div className="flex items-center gap-3"><span className="sa-section-icon"><Package size={17}/></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-orange-600">Commercial configuration</p><h2 className="text-lg font-black tracking-tight text-slate-950">Plans & pricing</h2><p className="mt-1 text-xs text-slate-500">Update monthly pricing and workspace limits.</p></div></div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ps.map((p:any)=><form key={p.id} action={savePackage} className="sa-plan-card"><input type="hidden" name="plan_id" value={p.id}/><div className="mb-4 flex items-center justify-between"><span className="sa-plan-icon"><Package size={18}/></span><span className="sa-status active"><span/> ACTIVE</span></div><p className="text-sm font-extrabold text-slate-900">{p.name}</p><p className="mt-1 text-[10px] text-slate-400">Subscription package</p>
    <label className={label}>Package name<input name="plan_name" defaultValue={p.name} className={field}/></label><label className={label+" mt-3"}>Monthly price (PKR)<input name="monthly_price" type="number" min="0" step="1" defaultValue={p.monthly_price} className={field}/></label>
    <div className="mt-3 grid grid-cols-2 gap-2"><label className={label}>Max tables<input name="max_tables" type="number" min="1" defaultValue={p.max_tables} className={field}/></label><label className={label}>Max staff<input name="max_staff" type="number" min="1" defaultValue={p.max_staff} className={field}/></label></div>
    <input type="hidden" name="active" value="true"/><button className={button+" mt-5 w-full"}><CheckCircle2 size={14}/> Save package</button>
   </form>)}</div>
   <form action={savePackage} className="sa-new-plan grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-5"><div className="sm:col-span-2 xl:col-span-5"><p className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Plus size={14} className="text-orange-500"/> Add a new package</p><p className="mt-1 text-[10px] text-slate-500">Create another pricing tier for restaurant workspaces.</p></div><input name="plan_name" required placeholder="New package name" className={field+" mt-0"}/><input name="monthly_price" type="number" min="0" required placeholder="Price PKR" className={field+" mt-0"}/><input name="max_tables" type="number" min="1" required placeholder="Max tables" className={field+" mt-0"}/><input name="max_staff" type="number" min="1" required placeholder="Max staff" className={field+" mt-0"}/><input type="hidden" name="active" value="true"/><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-extrabold text-white hover:bg-orange-600"><Plus size={14}/> Add package</button></form>
  </section>
 </div>;
}
