"use server";
import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {createRestaurant,updateRestaurantAccess,savePackage} from "./actions";
import DeleteRestaurantButton from "./delete-restaurant-button";

export default async function Page(){
 const {supabase}=await requirePlatformAdmin();
 const [a,b]=await Promise.all([
  supabase.from("restaurants").select("id,name,slug,email,status,created_at,memberships(role,users(email,full_name)),subscriptions(status,subscription_plans(id,name,monthly_price))").order("created_at",{ascending:false}),
  supabase.from("subscription_plans").select("id,name,monthly_price,max_tables,max_staff").eq("active",true).order("monthly_price")
 ]);
 if(a.error) throw new Error(a.error.message);
 if(b.error) throw new Error(b.error.message);
 const rs=a.data||[],ps=b.data||[];
 return <>
  <p className="text-xs font-bold tracking-widest text-orange-300">PLATFORM OVERVIEW</p>
  <h1 className="mt-2 text-3xl font-black">Super Admin</h1>
  <p className="mt-2 text-sm text-slate-400">Restaurants, client access, packages and subscription control.</p>
  <div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Restaurants",rs.length],["Active",rs.filter((r:any)=>r.status==="ACTIVE").length],["Suspended",rs.filter((r:any)=>r.status==="SUSPENDED").length]].map(([k,n])=><div key={String(k)} className="rounded-2xl border border-white/10 p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-3xl font-black">{n}</p></div>)}</div>
  <section className="mt-8 rounded-2xl border border-white/10 p-5">
   <h2 className="text-xl font-bold">Create restaurant & grant client access</h2>
   <p className="mt-1 text-sm text-slate-400">Client must first register and verify their account. Enter that same email below.</p>
   <form action={createRestaurant} className="mt-5 grid gap-3 md:grid-cols-3">
    {([["name","Restaurant name","text"],["slug","URL slug","text"],["owner_email","Client login email","email"],["owner_name","Client full name","text"],["phone","Phone / WhatsApp","text"],["address","Address","text"]] as const).map(([n,l,t])=><label key={n} className="text-xs text-slate-400">{l}<input required={n==="name"||n==="owner_email"} name={n} type={t} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white"/></label>)}
    <label className="text-xs text-slate-400">Package<select name="plan_id" required className="mt-1 w-full rounded-xl border border-white/10 bg-[#111827] p-3 text-sm">{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name} · PKR {p.monthly_price} · {p.max_tables} tables / {p.max_staff} staff</option>)}</select></label>
    <label className="text-xs text-slate-400">Trial days<input name="trial_days" type="number" min="0" max="90" defaultValue="14" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"/></label>
    <div className="flex items-end"><button className="w-full rounded-xl bg-orange-400 p-3 text-sm font-black text-slate-950">Create workspace</button></div>
   </form>
  </section>
  <section className="mt-8"><h2 className="text-xl font-bold">Restaurant accounts</h2><div className="mt-4 space-y-4">
   {rs.map((r:any)=>{const owner=r.memberships?.find((m:any)=>m.role==="OWNER"),sub=r.subscriptions?.[0];return <article key={r.id} className="rounded-2xl border border-white/10 p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-bold">{r.name}</h3><p className="text-xs text-slate-500">/{r.slug} · {owner?.users?.full_name||owner?.users?.email||r.email||"Owner not linked"}</p></div><span className="text-xs text-orange-300">{r.status} · {sub?.subscription_plans?.name||"No plan"}</span></div>
    <form action={updateRestaurantAccess} className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-4">
     <input type="hidden" name="restaurant_id" value={r.id}/>
     <label className="text-xs text-slate-400">Workspace<select name="status" defaultValue={r.status} className="field mt-1 w-full"><option>ACTIVE</option><option>SUSPENDED</option><option>CLOSED</option><option>PENDING</option></select></label>
     <label className="text-xs text-slate-400">Package<select name="plan_id" defaultValue={sub?.subscription_plans?.id||""} className="field mt-1 w-full"><option value="">Keep current</option>{ps.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label className="text-xs text-slate-400">Subscription<select name="subscription_status" defaultValue={sub?.status||"ACTIVE"} className="field mt-1 w-full">{["TRIALING","ACTIVE","PAST_DUE","CANCELED","EXPIRED"].map(s=><option key={s}>{s}</option>)}</select></label>
     <button className="btn-primary self-end">Save changes</button>
    </form>
    <div className="mt-4 flex justify-end border-t border-white/5 pt-4"><DeleteRestaurantButton restaurantId={r.id} restaurantName={r.name}/></div>
   </article>})}
   {!rs.length&&<p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No restaurants yet.</p>}
  </div></section>
  <section className="mt-8 rounded-2xl border border-white/10 p-5"><h2 className="text-xl font-bold">Package management</h2><p className="mt-1 text-sm text-slate-400">Update prices and enforce table/staff limits for new assignments.</p>
   <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{ps.map((p:any)=><form key={p.id} action={savePackage} className="rounded-xl border border-white/10 p-4"><input type="hidden" name="plan_id" value={p.id}/><p className="mb-3 font-bold">{p.name}</p>
    <label className="text-xs text-slate-400">Package name<input name="plan_name" defaultValue={p.name} className="field mt-1 w-full"/></label>
    <label className="mt-2 block text-xs text-slate-400">Monthly price (PKR)<input name="monthly_price" type="number" min="0" step="1" defaultValue={p.monthly_price} className="field mt-1 w-full"/></label>
    <label className="mt-2 block text-xs text-slate-400">Maximum tables<input name="max_tables" type="number" min="1" defaultValue={p.max_tables} className="field mt-1 w-full"/></label>
    <label className="mt-2 block text-xs text-slate-400">Maximum staff<input name="max_staff" type="number" min="1" defaultValue={p.max_staff} className="field mt-1 w-full"/></label>
    <input type="hidden" name="active" value="true"/><button className="btn-primary mt-3 w-full">Save package</button>
   </form>)}</div>
   <form action={savePackage} className="mt-4 grid gap-3 rounded-xl border border-dashed border-white/15 p-4 md:grid-cols-5"><input name="plan_name" required placeholder="New package name" className="field"/><input name="monthly_price" type="number" min="0" required placeholder="Price PKR" className="field"/><input name="max_tables" type="number" min="1" required placeholder="Max tables" className="field"/><input name="max_staff" type="number" min="1" required placeholder="Max staff" className="field"/><input type="hidden" name="active" value="true"/><button className="btn-primary">Create package</button></form>
  </section>
 </>;
}
