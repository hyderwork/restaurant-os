import {requireRestaurant} from "@/lib/auth/tenant";
import {addStaff,removeStaff} from "./actions";

export default async function StaffPage({searchParams}:{searchParams:Promise<{success?:string}>}){
 const params=await searchParams;
 const m=await requireRestaurant();
 const [members,sub]=await Promise.all([
  m.supabase.from("memberships").select("id,role,status,created_at,users(email,full_name)").eq("restaurant_id",m.restaurant_id).order("created_at",{ascending:false}),
  m.supabase.from("subscriptions").select("subscription_plans(max_staff)").eq("restaurant_id",m.restaurant_id).maybeSingle()
 ]);
 if(members.error)throw new Error(members.error.message);
 const staff=(members.data||[]).filter((x:any)=>["MANAGER","CASHIER","CHEF","WAITER"].includes(x.role));
 return <>
  <p className="text-xs font-bold tracking-widest text-orange-300">TEAM MANAGEMENT</p>
  <h1 className="mt-2 text-3xl font-black">Staff accounts</h1>
  <p className="mt-2 text-sm text-slate-400">Create staff logins and assign limited operational roles. Staff accounts only access the Staff App.</p>
  {params.success&&<div role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-4 text-sm text-emerald-200">{params.success}</div>}
  <section className="mt-6 rounded-2xl border border-white/10 p-5">
   <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">Create staff account</h2><span className="text-xs text-slate-400">{staff.filter((x:any)=>x.status==="ACTIVE").length} / {(sub.data?.subscription_plans as any)?.[0]?.max_staff??"—"} active</span></div>
   <p className="mt-2 text-xs leading-5 text-slate-500">A new staff member receives an email verification link. After verifying, they will set their own password. Existing accounts are added directly.</p>
   <form action={addStaff} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_190px_auto]">
    <input name="full_name" placeholder="Staff full name (optional)" className="field"/>
    <input required type="email" name="email" placeholder="staff@example.com" className="field"/>
    <select name="role" className="field"><option value="WAITER">Waiter</option><option value="CHEF">Kitchen / Chef</option><option value="CASHIER">Cashier</option><option value="MANAGER">Manager (staff app)</option></select>
    <button className="btn-primary">Create staff</button>
   </form>
  </section>
  <section className="mt-7 space-y-3">
   {staff.map((x:any)=><article key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
    <div><p className="font-semibold">{x.users?.full_name||x.users?.email||"Staff account"}</p><p className="mt-1 text-xs text-slate-400">{x.users?.email} · {x.role} · {x.status}</p></div>
    {x.status==="ACTIVE"&&<form action={removeStaff}><input type="hidden" name="membership_id" value={x.id}/><button className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300">Suspend access</button></form>}
   </article>)}
   {!staff.length&&<p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No staff added yet.</p>}
  </section>
 </>;
}
