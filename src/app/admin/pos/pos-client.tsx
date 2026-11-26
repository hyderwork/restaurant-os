"use client";

import { useMemo, useState, useTransition } from "react";
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

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-300">Point of sale</p><h1 className="mt-2 text-3xl font-black">Create order</h1><p className="mt-2 text-sm text-slate-400">Counter orders, table orders and home delivery — all in one place.</p></div>
      <a href="/admin/orders" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5">View all orders ↗</a>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2">
          {([["DINE_IN","Dine in","▦"],["TAKEAWAY","Takeaway","↗"],["DELIVERY","Delivery","⌁"]] as const).map(([value,label,icon]) =>
            <button key={value} onClick={() => setOrderType(value)} className={"flex-1 rounded-xl px-4 py-3 text-sm font-bold transition " + (orderType === value ? "bg-orange-400 text-slate-950 shadow-lg shadow-orange-500/10" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
              <span className="mr-2">{icon}</span>{label}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm outline-none focus:border-orange-400/50" />
          <span className="self-center text-xs text-slate-500">{visibleProducts.length} items available</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveCategory("all")} className={"shrink-0 rounded-full px-4 py-2 text-xs font-bold " + (activeCategory === "all" ? "bg-white text-slate-950" : "border border-white/10 text-slate-400")}>All items</button>
          {categories.map((c) => <button key={c.id} onClick={() => setActiveCategory(c.id)} className={"shrink-0 rounded-full px-4 py-2 text-xs font-bold " + (activeCategory === c.id ? "bg-white text-slate-950" : "border border-white/10 text-slate-400")}>{c.name}</button>)}
        </div>

        {visibleProducts.length ? <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleProducts.map((p) => <article key={p.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-orange-400/30 hover:bg-white/[.045]">
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-3xl text-slate-600">✦</div>}
              {p.vegetarian && <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-black text-white">VEG</span>}
              <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">{p.prep_minutes} min</span>
            </div>
            <div className="p-3.5">
              <div className="flex min-h-10 items-start justify-between gap-2"><h3 className="text-sm font-bold leading-5">{p.name}</h3><span className="shrink-0 text-sm font-black text-orange-300">Rs. {Number(p.base_price).toLocaleString("en-PK")}</span></div>
              {p.description && <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-500">{p.description}</p>}
              <button onClick={() => changeQty(p.id, 1)} className="mt-3 w-full rounded-lg border border-orange-400/25 bg-orange-400/10 py-2 text-xs font-bold text-orange-200 transition hover:bg-orange-400 hover:text-slate-950">+ Add to order</button>
            </div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">No matching products found.</div>}
      </section>

      <aside className="h-fit space-y-4 xl:sticky xl:top-4">
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
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

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[.025] p-5">
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
