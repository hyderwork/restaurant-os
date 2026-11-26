import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {createRestaurant,updateRestaurantAccess,savePackage,resendOwnerSetupEmail} from "./actions";
import DeleteRestaurantButton from "./delete-restaurant-button";

export default async function Page({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){
 const params=await searchParams;
 const {supabase}=await requirePlatformAdmin();
 const [a,b]=await Promise.all([
  supabase.from("restaurants").select("id,name,slug,email,status,created_at,memberships(role,users(email,full_name)),subscriptions(status,subscription_plans(id,name,monthly_price))").order("created_at",{ascending:false}),
  supabase.from("subscription_plans").select("id,name,monthly_price,max_tables,max_staff").eq("active",true).order("monthly_price")
 ]);
 if(a.error) throw new Error(a.error.message);
 if(b.error) throw new Error(b.error.message);
 const rs=a.data||[],ps=b.data||[];
 const active=rs.filter((r:any)=>r.status==="ACTIVE").length;
 const suspended=rs.filter((r:any)=>r.status==="SUSPENDED").length;
 const trialing=rs.filter((r:any)=>r.subscriptions?.[0]?.status==="TRIALING").length;
 const mrr=rs.reduce((sum:number,r:any)=>{const s=r.subscriptions?.[0];return sum+(s?.status==="ACTIVE"?Number(s?.subscription_plans?.monthly_price||0):0)},0);
 const metrics=[
  {label:"Total workspaces",value:rs.length,detail:"All restaurant accounts",icon:"▦",tone:"orange"},
  {label:"Active workspaces",value:active,detail:"Currently operational",icon:"↗",tone:"green"},
  {label:"Trial accounts",value:trialing,detail:"In trial period",icon:"◷",tone:"blue"},
  {label:"Monthly recurring",value:`PKR ${mrr.toLocaleString("en-PK")}`,detail:"Based on active plans",icon:"₨",tone:"violet"}
 ];
 return <div className="space-y-8">
  <section className="relative overflow-hidden rounded-[26px] border border-orange-300/15 bg-[radial-gradient(ellipse_at_85%_10%,rgba(251,146,60,.22),transparent_38%),linear-gradient(125deg,#172235,#101827_58%,#1b1b25)] p-6 shadow-[0_24px_70px_rgba(0,0,0,.22)] md:p-8">
   <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-orange-200/10"/><div className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-orange-200/10"/>
   <div className="relative flex flex-wrap items-end justify-between gap-6">
    <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[.18em] text-orange-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"/> PLATFORM CONTROL CENTER</div>
     <h1 className="mt-5 text-3xl font-black tracking-[-.055em] text-white md:text-[42px]">Your platform, <span className="text-orange-300">at a glance.</span></h1>
     <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Manage restaurant workspaces, subscriptions and client access from one clear command center.</p>
    </div>
    <a href="#create-workspace" className="inline-flex items-center gap-2 rounded-xl bg-orange-300 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-orange-200">＋ Create workspace <span aria-hidden="true">↗</span></a>
   </div>
   <div className="relative mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-slate-400"><span><b className="text-white">{rs.length}</b> workspaces registered</span><span><b className="text-emerald-300">{active}</b> active now</span><span><b className="text-orange-200">{ps.length}</b> available packages</span><span><b className="text-rose-300">{suspended}</b> suspended</span></div>
  </section>

  {params.error&&<div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{params.error}</div>}
  {params.success&&<div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{params.success}</div>}

  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {metrics.map((m:any)=><article key={m.label} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-300/25 hover:bg-white/[.055]">
    <div className="flex items-start justify-between"><p className="text-xs font-semibold text-slate-400">{m.label}</p><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.05] text-sm text-orange-200">{m.icon}</span></div>
    <p className="mt-4 text-[27px] font-black tracking-[-.05em] text-white">{m.value}</p><p className="mt-1 text-[10px] text-slate-500">{m.detail}</p>
    <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-300/35 to-transparent opacity-0 transition group-hover:opacity-100"/>
   </article>)}
  </section>

  <section id="create-workspace" className="scroll-mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#101827]/90 shadow-[0_18px_50px_rgba(0,0,0,.12)]">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 md:px-6">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/10 text-lg text-orange-300">＋</span><div><h2 className="text-base font-extrabold tracking-tight text-white">Create a workspace</h2><p className="mt-1 text-xs text-slate-400">Set up a restaurant and invite its owner.</p></div></div>
    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">New account setup</span>
   </div>
   <form action={createRestaurant} className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
    {([[ "name","Restaurant name","text"],["slug","URL slug","text"],["owner_email","Client login email","email"],["owner_name","Client full name","text"],["phone","Phone / WhatsApp","text"],["address","Address","text"]] as const).map(([n,l,t])=><label key={n} className="block text-[11px] font-bold text-slate-400">{l}<input required={n==="name"||n==="owner_email"} name={n} type={t} placeholder={n==="slug"?"e.g. spicy-dera":n==="owner_email"?"owner@example.com":""} className="mt-2 w-full rounded-xl border border-white/10 bg-[#080f1c] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-300/60 focus:ring-4 focus:ring-orange-300/10"/></label>)}
    <label className="block text-[11px] font-bold text-slate-400">Package<select name="plan_id" required className="mt-2 w-full rounded-xl border border-white/10 bg-[#080f1c] px-3.5 py-3 text-sm text-white outline-none focus:border-orange-300/60">{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name} · PKR {p.monthly_price} · {p.max_tables} tables / {p.max_staff} staff</option>)}</select></label>
    <label className="block text-[11px] font-bold text-slate-400">Trial days<input name="trial_days" type="number" min="0" max="90" defaultValue="14" className="mt-2 w-full rounded-xl border border-white/10 bg-[#080f1c] px-3.5 py-3 text-sm text-white outline-none focus:border-orange-300/60"/></label>
    <div className="flex items-end"><button className="w-full rounded-xl bg-gradient-to-r from-orange-300 to-orange-400 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-orange-950/20 transition hover:brightness-110">Create workspace & invite client →</button></div>
   </form>
  </section>

  <section id="restaurant-accounts" className="scroll-mt-6 space-y-4">
   <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-[.2em] text-orange-300">CLIENT MANAGEMENT</p><h2 className="mt-1 text-xl font-black tracking-tight text-white">Restaurant accounts</h2><p className="mt-1 text-xs text-slate-400">Access, subscription and workspace controls.</p></div><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-bold text-slate-300">{rs.length} accounts</span></div>
   <div className="space-y-3">
   {rs.map((r:any)=>{const owner=r.memberships?.find((m:any)=>m.role==="OWNER");const ownerUser=Array.isArray(owner?.users)?owner.users[0]:owner?.users;const sub=r.subscriptions?.[0];return <article key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-white/20">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-300/15 bg-orange-300/10 text-sm font-black text-orange-200">{String(r.name||"R").slice(0,1).toUpperCase()}</span><div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-white">{r.name}</h3><p className="mt-1 truncate text-[11px] text-slate-500">/{r.slug} · {ownerUser?.full_name||ownerUser?.email||r.email||"Owner not linked"}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[10px] font-bold text-slate-300">{sub?.subscription_plans?.name||"No plan"}</span><span className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${r.status==="ACTIVE"?"border-emerald-400/20 bg-emerald-400/10 text-emerald-300":r.status==="SUSPENDED"?"border-rose-400/20 bg-rose-400/10 text-rose-300":"border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>{r.status}</span></div></div>
    <form action={updateRestaurantAccess} className="grid gap-3 border-t border-white/[.07] bg-black/10 p-5 sm:grid-cols-2 xl:grid-cols-4">
     <input type="hidden" name="restaurant_id" value={r.id}/>
     <label className="text-[10px] font-bold text-slate-400">Workspace status<select name="status" defaultValue={r.status} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"><option>ACTIVE</option><option>SUSPENDED</option><option>CLOSED</option><option>PENDING</option></select></label>
     <label className="text-[10px] font-bold text-slate-400">Package<select name="plan_id" defaultValue={sub?.subscription_plans?.id||""} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"><option value="">Keep current</option>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label className="text-[10px] font-bold text-slate-400">Subscription<select name="subscription_status" defaultValue={sub?.status||"ACTIVE"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white">{["TRIALING","ACTIVE","PAST_DUE","CANCELED","EXPIRED"].map(s=><option key={s}>{s}</option>)}</select></label>
     <button className="self-end rounded-lg bg-white/[.08] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-orange-300 hover:text-slate-950">Save changes</button>
    </form>
    <div className="flex flex-wrap justify-end gap-2 border-t border-white/[.07] p-4">{ownerUser?.email&&<form action={resendOwnerSetupEmail} className="flex items-center gap-2"><input type="hidden" name="restaurant_id" value={r.id}/><input type="hidden" name="owner_email" value={ownerUser.email}/><button className="rounded-lg border border-orange-300/25 px-3 py-2 text-[10px] font-bold text-orange-200 transition hover:bg-orange-300/10">Resend setup email</button></form>}<DeleteRestaurantButton restaurantId={r.id} restaurantName={r.name}/></div>
   </article>})}
   {!rs.length&&<p className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No restaurants yet. Create your first workspace above.</p>}
   </div>
  </section>

  <section id="package-management" className="scroll-mt-6 space-y-4">
   <div><p className="text-[10px] font-extrabold tracking-[.2em] text-orange-300">REVENUE & PLANS</p><h2 className="mt-1 text-xl font-black tracking-tight text-white">Package management</h2><p className="mt-1 text-xs text-slate-400">Manage pricing and workspace limits for each subscription tier.</p></div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ps.map((p:any)=><form key={p.id} action={savePackage} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-orange-300/20"><input type="hidden" name="plan_id" value={p.id}/><div className="mb-4 flex items-center justify-between"><p className="font-extrabold text-white">{p.name}</p><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">ACTIVE</span></div>
    <label className="block text-[10px] font-bold text-slate-400">Package name<input name="plan_name" defaultValue={p.name} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"/></label>
    <label className="mt-3 block text-[10px] font-bold text-slate-400">Monthly price (PKR)<input name="monthly_price" type="number" min="0" step="1" defaultValue={p.monthly_price} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"/></label>
    <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-400">Max tables<input name="max_tables" type="number" min="1" defaultValue={p.max_tables} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"/></label><label className="text-[10px] font-bold text-slate-400">Max staff<input name="max_staff" type="number" min="1" defaultValue={p.max_staff} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1321] p-2.5 text-xs text-white"/></label></div>
    <input type="hidden" name="active" value="true"/><button className="mt-4 w-full rounded-lg border border-white/10 bg-white/[.06] py-2.5 text-xs font-bold text-white transition hover:border-orange-300/30 hover:bg-orange-300/10">Save package</button>
   </form>)}</div>
   <form action={savePackage} className="grid gap-2 rounded-2xl border border-dashed border-orange-300/25 bg-orange-300/[.035] p-4 sm:grid-cols-2 xl:grid-cols-5"><input name="plan_name" required placeholder="New package name" className="rounded-lg border border-white/10 bg-[#0b1321] p-3 text-xs text-white"/><input name="monthly_price" type="number" min="0" required placeholder="Price PKR" className="rounded-lg border border-white/10 bg-[#0b1321] p-3 text-xs text-white"/><input name="max_tables" type="number" min="1" required placeholder="Max tables" className="rounded-lg border border-white/10 bg-[#0b1321] p-3 text-xs text-white"/><input name="max_staff" type="number" min="1" required placeholder="Max staff" className="rounded-lg border border-white/10 bg-[#0b1321] p-3 text-xs text-white"/><input type="hidden" name="active" value="true"/><button className="rounded-lg bg-orange-300 px-3 py-3 text-xs font-black text-slate-950 transition hover:bg-orange-200">＋ Create package</button></form>
  </section>
 </div>;
}
