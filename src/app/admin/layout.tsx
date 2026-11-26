import {getMemberships} from "@/lib/auth/tenant";
import RealtimeSync from "@/components/realtime-sync";
import ThemeToggle from "@/components/theme-toggle";
import AdminSidebar from "./admin-sidebar";
import {createClient} from "@/lib/supabase/server";

export default async function AdminLayout({children}:{children:React.ReactNode}){
 const memberships=await getMemberships();
 const m:any=memberships[0];
 const restaurant=m?.restaurants?.name||"Set up workspace";
 const supabase=await createClient();
 const {data:restaurantSettings}=m?.restaurant_id?await supabase.from("restaurant_settings").select("logo_url").eq("restaurant_id",m.restaurant_id).maybeSingle():{data:null};
 const logoUrl=restaurantSettings?.logo_url||null;
 return <div className="dashboard-shell min-h-screen md:flex md:h-dvh md:min-h-0 md:overflow-hidden">
  <AdminSidebar restaurant={restaurant} role={m?.role||"OWNER"} logoUrl={logoUrl}/>
  <section className="dashboard-content min-w-0 flex-1 md:flex md:h-dvh md:min-h-0 md:flex-col md:overflow-hidden">
   <header className="admin-topbar flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
    <div><p className="text-[10px] font-bold tracking-[.2em] text-slate-500">RESTAURANT WORKSPACE</p><p className="mt-1 text-sm font-semibold text-slate-200">{restaurant}</p></div>
    <div className="flex items-center gap-3"><span className="hidden rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 sm:inline-flex">● System active</span><span className="avatar-mark overflow-hidden">{logoUrl?<img src={logoUrl} alt={restaurant+" logo"} className="h-full w-full object-contain"/>:String(restaurant||"R").slice(0,1).toUpperCase()}</span><ThemeToggle/></div>
   </header>
   <main className="dashboard-main mx-auto w-full max-w-[1440px] min-w-0 flex-1 p-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-8">
    <RealtimeSync scope="restaurant" restaurantId={m?.restaurant_id}>{children}</RealtimeSync>
   </main>
  </section>
 </div>;
}
