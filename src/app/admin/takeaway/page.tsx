import {requireRestaurant} from "@/lib/auth/tenant";
import Link from "next/link";
import QRCode from "qrcode";

export default async function TakeawayDashboard(){
  const m=await requireRestaurant();
  const slug=(m.restaurants as unknown as {slug:string})?.slug;
  const base=(process.env.NEXT_PUBLIC_APP_URL||"https://restaurant-os-custom.vercel.app").replace(/\/$/,"");
  const url=base+"/menu/"+slug+"?mode=takeaway";
  const qr=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:"H"});
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Pickup ordering</p><h1 className="mt-2 text-3xl font-black">Takeaway</h1><p className="mt-2 text-sm text-slate-400">Manage your counter pickup ordering link and customer QR code.</p></div>
      <Link href="/admin/orders" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold">View orders</Link>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 md:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-400/10 text-xl">↗</span><div><h2 className="font-bold">Customer takeaway menu</h2><p className="text-xs text-slate-500">No table QR or table selection required</p></div></div>
        <p className="mt-6 text-sm leading-6 text-slate-400">Customers scan this QR code or open the link, choose their items, and submit their name and phone number. Their order is sent to your restaurant as a takeaway pickup order.</p>
        <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Takeaway menu URL</p><p className="break-all text-sm font-semibold text-orange-300">{url}</p><div className="mt-4 flex flex-wrap gap-2"><a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-orange-400 px-4 py-2.5 text-xs font-bold text-slate-950">Open takeaway menu ↗</a></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-semibold text-slate-300">Order type</p><p className="mt-1 text-sm text-slate-500">TAKEAWAY</p></div><div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-semibold text-slate-300">Fulfilment</p><p className="mt-1 text-sm text-slate-500">Customer pickup at counter</p></div></div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-center"><h2 className="font-bold">Takeaway QR code</h2><p className="mt-1 text-xs text-slate-500">Print and place it at your counter</p><div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3"><img src={qr} alt="Takeaway ordering QR code" width="260" height="260"/></div><a href={qr} download="restaurant-takeaway-qr.png" className="mt-5 inline-flex rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950">Download QR code</a></section>
    </div>
    <section className="rounded-2xl border border-white/10 p-5"><h2 className="font-bold">Where takeaway orders appear</h2><p className="mt-2 text-sm leading-6 text-slate-400">New pickup orders appear in Orders and Kitchen Display. Staff can prepare the order without assigning a dining table.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/admin/orders" className="text-sm font-semibold text-orange-300 underline">Open Orders</Link><Link href="/admin/kitchen" className="text-sm font-semibold text-orange-300 underline">Open Kitchen Display</Link></div></section>
  </div>;
}
