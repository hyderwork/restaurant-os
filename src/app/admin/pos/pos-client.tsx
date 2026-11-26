"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosOrder } from "@/app/admin/actions";

type Category = { id: string; name: string };
type Product = { id: string; name: string; description: string | null; image_url: string | null; base_price: number; category_id: string; vegetarian: boolean; prep_minutes: number };
type Table = { id: string; number: string; name: string | null; status: string };

export default function POSClient({ categories, products, tables, restaurantId, role, taxRate, serviceRate, taxInclusive }: {
  categories: Category[]; products: Product[]; tables: Table[]; restaurantId: string; role: string;
  taxRate: number; serviceRate: number; taxInclusive: boolean;
}) {
  const router = useRouter();
  const posRootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === posRootRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === posRootRef.current) await document.exitFullscreen();
      else if (posRootRef.current?.requestFullscreen) await posRootRef.current.requestFullscreen();
    } catch { setError("Fullscreen mode is not available in this browser."); }
  }
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableId, setTableId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const canTakePayment = ["OWNER", "ADMIN", "MANAGER", "CASHIER"].includes(role);

  const visibleProducts = useMemo(() => products.filter((p) =>
    (activeCategory === "all" || p.category_id === activeCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase()))
  ), [products, activeCategory, search]);
  const selected = products.filter((p) => (cart[p.id] || 0) > 0);
  const subtotal = selected.reduce((sum, p) => sum + Number(p.base_price) * cart[p.id], 0);
  const tax = taxInclusive ? 0 : subtotal * taxRate / 100;
  const service = subtotal * serviceRate / 100;
  const delivery = orderType === "DELIVERY" ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const discountValue = Math.min(Math.max(0, Number(discount) || 0), subtotal + tax + service + delivery);
  const total = subtotal + tax + service + delivery - discountValue;

  function changeQty(id: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const qty = (next[id] || 0) + delta;
      if (qty <= 0) delete next[id]; else next[id] = Math.min(20, qty);
      return next;
    });
  }

  function submitOrder() {
    setError(""); setSuccess("");
    if (!selected.length) { setError("Cart mein kam az kam aik product add karein."); return; }
    if (customerName.trim().length < 2) { setError("Customer ka naam enter karein."); return; }
    if (customerPhone.replace(/[^0-9]/g, "").length < 7) { setError("Valid phone number enter karein."); return; }
    if (orderType === "DINE_IN" && !tableId) { setError("Dine-in order ke liye table select karein."); return; }
    if (orderType === "DELIVERY" && deliveryAddress.trim().length < 6) { setError("Complete delivery address enter karein."); return; }
    if (paid && !canTakePayment) { setError("Aapke account ko payment confirm karne ki permission nahi."); return; }
    startTransition(async () => {
      const result = await createPosOrder({
        restaurantId, orderType, tableId: orderType === "DINE_IN" ? tableId : null,
        customerName, customerPhone, notes, deliveryAddress, deliveryArea,
        deliveryFee: delivery, discount: discountValue,
        items: selected.map((p) => ({ productId: p.id, quantity: cart[p.id] })),
        paid, paymentMethod,
      });
      if (!result.success) { setError(result.error || "Order create nahi ho saka."); return; }
      setSuccess("Order #" + result.orderNumber + " successfully create ho gaya.");
      setCart({}); setCustomerName(""); setCustomerPhone(""); setNotes("");
      setDeliveryAddress(""); setDeliveryArea(""); setDeliveryFee("0"); setDiscount("0");
      setTableId(""); setPaid(false);
      router.refresh();
    });
  }

  const inputClass = "mt-1.5 w-full rounded-xl border border-white/10 bg-[#101827] px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-400/60";
  const labelClass = "text-[11px] font-bold uppercase tracking-wider text-slate-400";

  return <div ref={posRootRef} className="pos-workspace flex min-w-0 flex-col gap-4 md:h-full md:min-h-0 sm:gap-6">
    <div className="pos-header flex flex-col gap-3 rounded-2xl border border-white/[.08] bg-gradient-to-r from-[#111c2e] via-[#101a2b] to-[#172235] p-3.5 shadow-[0_12px_36px_rgba(0,0,0,.16)] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-300/20 bg-orange-400/10 text-xl text-orange-300 shadow-inner">▦</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Restaurant counter</p><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">POS ready</span></div><h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">Point of sale</h1><p className="mt-0.5 hidden text-xs text-slate-400 sm:block">Fast order entry · Dine in · Takeaway · Delivery</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><a href="/admin/orders" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/10 px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/5 sm:flex-none sm:text-sm">Order history <span className="ml-2 text-orange-300">↗</span></a><button type="button" onClick={toggleFullscreen} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-orange-300/25 bg-orange-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-orange-500/10 transition hover:bg-orange-300 sm:flex-none sm:text-sm"><span className="text-base">{isFullscreen ? "⤢" : "⛶"}</span>{isFullscreen ? "Exit fullscreen" : "Full screen"}</button></div>
    </div>

    <div className="pos-columns grid min-w-0 gap-4 lg:gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="pos-menu-column order-2 min-w-0 space-y-3.5 sm:space-y-4 xl:order-1">
        <div className="pos-menu-toolbar sticky top-0 z-30 -mx-2 mb-1 space-y-2.5 border-b border-slate-200/80 bg-slate-50/95 px-2 pb-3 pt-2 backdrop-blur-xl sm:space-y-3 sm:pb-3.5">
        <div className="pos-order-type-switch flex w-full max-w-[520px] gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:gap-1.5">
          {([["DINE_IN","Dine in","▦"],["TAKEAWAY","Takeaway","↗"],["DELIVERY","Delivery","⌁"]] as const).map(([value,label,icon]) =>
            <button key={value} onClick={() => setOrderType(value)} className={"min-w-0 flex-1 rounded-lg px-2 py-2 text-[11px] font-bold transition sm:px-4 sm:py-2.5 sm:text-xs " + (orderType === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
              <span className="mr-1.5 sm:mr-2">{icon}</span>{label}
            </button>
          )}
        </div>

        <div className="pos-search-row flex flex-col gap-2 sm:flex-row sm:items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 sm:px-4" />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm sm:self-center sm:text-[11px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{visibleProducts.length} items available</span>
        </div>
        <div className="pos-category-strip flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button onClick={() => setActiveCategory("all")} className={"shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition sm:text-[11px] " + (activeCategory === "all" ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200" : "text-slate-500 hover:bg-white hover:text-slate-900")}>All items</button>
          {categories.map((c) => <button key={c.id} onClick={() => setActiveCategory(c.id)} className={"shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition sm:text-[11px] " + (activeCategory === c.id ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200" : "text-slate-500 hover:bg-white hover:text-slate-900")}>{c.name}</button>)}
        </div>
        </div>

        {visibleProducts.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 2xl:grid-cols-3">
          {visibleProducts.map((p) => <article key={p.id} className="group flex min-w-0 items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-orange-400/30 hover:bg-white/[.045] sm:block">
            <div className="relative h-auto min-h-[112px] w-[104px] shrink-0 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 sm:h-32 sm:min-h-0 sm:w-auto">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-3xl text-slate-600">✦</div>}
              {p.vegetarian && <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-black text-white">VEG</span>}
              <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">{p.prep_minutes} min</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:block sm:p-3.5">
              <div className="flex min-w-0 flex-col items-start justify-between gap-1 sm:min-h-10 sm:flex-row sm:gap-2"><h3 className="line-clamp-2 text-sm font-bold leading-5">{p.name}</h3><span className="shrink-0 text-xs font-black text-orange-300 sm:text-sm">Rs. {Number(p.base_price).toLocaleString("en-PK")}</span></div>
              {p.description && <p className="mt-1 hidden min-h-8 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:block">{p.description}</p>}
              <button onClick={() => changeQty(p.id, 1)} className="mt-2 min-h-9 w-full rounded-lg border border-orange-400/25 bg-orange-400/10 py-2 text-[10px] font-extrabold text-orange-200 transition hover:bg-orange-400 hover:text-slate-950 sm:mt-3 sm:text-xs">+ Add to order</button>
            </div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">No matching products found.</div>}
      </section>

      <aside className="pos-order-column order-1 h-fit min-w-0 space-y-3.5 xl:order-2 xl:space-y-4">
        <section className="rounded-2xl border border-orange-300/15 bg-gradient-to-br from-orange-400/[.07] via-white/[.035] to-white/[.02] p-3.5 shadow-[0_14px_40px_rgba(0,0,0,.12)] sm:p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Current order</h2><span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold text-orange-300">{selected.reduce((n,p)=>n+cart[p.id],0)} items</span></div>
          {selected.length ? <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {selected.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="mt-0.5 text-xs text-slate-500">Rs. {Number(p.base_price).toLocaleString("en-PK")} each</p></div>
              <div className="flex shrink-0 items-center gap-2"><button onClick={() => changeQty(p.id,-1)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10">−</button><span className="w-4 text-center text-xs font-bold">{cart[p.id]}</span><button onClick={() => changeQty(p.id,1)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10">+</button></div>
            </div>)}
          </div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">Menu se items add karein.</div>}

          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString("en-PK",{maximumFractionDigits:2})}</span></div>
            {!taxInclusive && taxRate > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({taxRate}%)</span><span>Rs. {tax.toFixed(2)}</span></div>}
            {serviceRate > 0 && <div className="flex justify-between text-slate-500"><span>Service ({serviceRate}%)</span><span>Rs. {service.toFixed(2)}</span></div>}
            {orderType === "DELIVERY" && <div className="flex justify-between text-slate-500"><span>Delivery fee</span><span>Rs. {delivery.toFixed(2)}</span></div>}
            <div className="flex justify-between text-slate-500"><span>Discount</span><span>− Rs. {discountValue.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black"><span>Total</span><span className="text-orange-300">Rs. {total.toLocaleString("en-PK",{maximumFractionDigits:2})}</span></div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5 sm:p-5">
          <h2 className="font-bold">Order details</h2>
          {orderType === "DINE_IN" && <div><label className={labelClass}>Dining table *</label><select value={tableId} onChange={(e)=>setTableId(e.target.value)} className={inputClass}><option value="">Select available table</option>{tables.map((t)=><option key={t.id} value={t.id}>{t.name || "Table "+t.number} · {t.status}</option>)}</select>{!tables.length&&<p className="mt-1 text-[11px] text-amber-300">No available tables right now.</p>}</div>}
          <div><label className={labelClass}>Customer name *</label><input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} maxLength={120} placeholder="Customer name" className={inputClass}/></div>
          <div><label className={labelClass}>Phone number *</label><input value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} maxLength={40} placeholder="03XX XXXXXXX" className={inputClass}/></div>
          {orderType === "DELIVERY" && <>
            <div><label className={labelClass}>Delivery address *</label><textarea value={deliveryAddress} onChange={(e)=>setDeliveryAddress(e.target.value)} maxLength={500} rows={2} placeholder="House, street, building, landmark..." className={inputClass}/></div>
            <div><label className={labelClass}>Area / zone</label><input value={deliveryArea} onChange={(e)=>setDeliveryArea(e.target.value)} maxLength={120} placeholder="e.g. Gulshan, DHA" className={inputClass}/></div>
            <div><label className={labelClass}>Delivery fee (PKR)</label><input type="number" min="0" step="1" value={deliveryFee} onChange={(e)=>setDeliveryFee(e.target.value)} className={inputClass}/></div>
          </>}
          <div><label className={labelClass}>Discount (PKR)</label><input type="number" min="0" step="1" value={discount} onChange={(e)=>setDiscount(e.target.value)} className={inputClass}/></div>
          <div><label className={labelClass}>Kitchen note</label><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="Special instructions..." className={inputClass}/></div>
          {canTakePayment && <div className="rounded-xl border border-white/10 p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold"><span>Payment received now?</span><input type="checkbox" checked={paid} onChange={(e)=>setPaid(e.target.checked)} className="h-4 w-4 accent-orange-400"/></label>
            {paid && <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} className={inputClass}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option><option value="OTHER">Other</option></select>}
          </div>}
          {error && <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
          {success && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-300">{success}</p>}
          <button onClick={submitOrder} disabled={pending || !selected.length} className="w-full rounded-xl bg-orange-400 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/10 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Creating order..." : "Create order · Rs. "+total.toLocaleString("en-PK",{maximumFractionDigits:2})}</button>
          <p className="text-center text-[10px] leading-4 text-slate-600">Prices and taxes are recalculated securely by the server before the order is saved.</p>
        </section>
      </aside>
    </div>
  </div>;
}
