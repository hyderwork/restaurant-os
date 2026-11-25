"use client";
import {useMemo,useState} from "react";

type Order={id:string;order_number:number|string;total:number;status:string;created_at:string;order_type?:string|null};
const dayKey=(date:Date)=>{const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)};
const today=()=>dayKey(new Date());
function startDays(n:number){const d=new Date();d.setDate(d.getDate()-n);return dayKey(d)}
function monthStart(){const d=new Date();d.setDate(1);return dayKey(d)}
const presets=[["Today","today"],["Yesterday","yesterday"],["Last 7 days","7"],["Last 30 days","30"],["This month","month"],["Custom range","custom"]] as const;
export default function SalesReportClient({orders}:{orders:Order[]}){
 const [preset,setPreset]=useState("30");
 const [from,setFrom]=useState(startDays(29));
 const [to,setTo]=useState(today());
 const [customFrom,setCustomFrom]=useState(startDays(29));
 const [customTo,setCustomTo]=useState(today());
 const [customReady,setCustomReady]=useState(false);
 const dateRange=useMemo(()=>{
  const t=today();
  if(preset==="today")return [t,t];
  if(preset==="yesterday"){const d=new Date();d.setDate(d.getDate()-1);const y=dayKey(d);return [y,y]}
  if(preset==="7")return [startDays(6),t];
  if(preset==="30")return [startDays(29),t];
  if(preset==="month")return [monthStart(),t];
  return [customReady?customFrom:startDays(29),customReady?customTo:t];
 },[preset,customFrom,customTo,customReady]);
 const [fromDate,toDate]=dateRange;
 const filtered=useMemo(()=>orders.filter(o=>{const d=dayKey(new Date(o.created_at));return d>=fromDate&&d<=toDate}),[orders,fromDate,toDate]);
 const valid=fromDate<=toDate;
 const completed=filtered.filter(o=>o.status!=="CANCELLED");
 const revenue=completed.reduce((sum,o)=>sum+Number(o.total||0),0);
 const average=completed.length?revenue/completed.length:0;
 const cancelled=filtered.filter(o=>o.status==="CANCELLED").length;
 const daily=useMemo(()=>{const map=new Map<string,{orders:number;revenue:number}>();for(const o of completed){const d=new Date(o.created_at);const key=dayKey(d);const v=map.get(key)||{orders:0,revenue:0};v.orders++;v.revenue+=Number(o.total||0);map.set(key,v)}return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])},[completed]);
 const fmt=(n:number)=>"PKR "+Math.round(n).toLocaleString("en-PK");
 const choose=(value:string)=>{setPreset(value);if(value==="custom"){setCustomReady(true);setCustomFrom(from);setCustomTo(to)}else if(value==="today"){setFrom(today());setTo(today())}else if(value==="yesterday"){const d=new Date();d.setDate(d.getDate()-1);setFrom(dayKey(d));setTo(dayKey(d))}else if(value==="7"){setFrom(startDays(6));setTo(today())}else if(value==="30"){setFrom(startDays(29));setTo(today())}else if(value==="month"){setFrom(monthStart());setTo(today())}};
 const updateCustom=()=>{setFrom(customFrom);setTo(customTo);setPreset("custom");setCustomReady(true)};
 const exportCsv=()=>{const headers=["Order number","Order date","Order type","Status","Amount (PKR)"];const escapeCell=(v:any)=>'"'+String(v??"").replaceAll('"','""')+'"';const body=filtered.map(o=>[o.order_number,new Date(o.created_at).toLocaleString("en-PK"),o.order_type||"",o.status,Number(o.total||0)].map(escapeCell).join(","));const csv=[headers.map(escapeCell).join(","),...body].join("\\r\\n");const blob=new Blob(["\\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="sales-report-"+fromDate+"-to-"+toDate+".csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)};

 return <><div className="page-heading"><div><p className="eyebrow">BUSINESS INTELLIGENCE</p><h1>Sales analytics</h1><p>Analyze revenue, order volume, and trends for your selected period.</p></div><span className="count-pill">Sales report</span></div>
 <section className="panel mt-6 p-4 sm:p-5"><div className="flex flex-col gap-4"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-400/10 text-orange-300"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span><div><h2 className="text-sm font-extrabold">Date range</h2><p className="text-xs text-slate-500">Filter all report metrics and transactions by date.</p></div></div>
 <div className="flex flex-wrap gap-2">{presets.map(([label,value])=><button key={value} onClick={()=>choose(value)} className={"rounded-xl border px-3 py-2 text-xs font-bold transition "+(preset===value?"border-orange-400/50 bg-orange-400/10 text-orange-300":"border-white/10 bg-white/[.03] text-slate-400 hover:bg-white/[.06]")}>{label}</button>)}</div>
 {preset==="custom"&&<div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className="field-label mb-1.5">From</label><input className="field" type="date" value={customFrom} max={customTo||today()} onChange={e=>setCustomFrom(e.target.value)}/></div><div className="flex-1"><label className="field-label mb-1.5">To</label><input className="field" type="date" value={customTo} min={customFrom} max={today()} onChange={e=>setCustomTo(e.target.value)}/></div><button onClick={updateCustom} disabled={!customFrom||!customTo||customFrom>customTo} className="btn-primary disabled:opacity-40">Apply dates</button></div>}
 <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>{fromDate} — {toDate}</span><span>{filtered.length} orders in range</span><button onClick={exportCsv} className="btn-secondary" disabled={!filtered.length}>Export CSV</button></div>
 </div></section>
 {!valid&&<div className="mt-3 text-sm text-rose-400">Please select a valid date range.</div>}
 <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Gross sales",fmt(revenue)],["Orders",String(completed.length)],["Average order",fmt(average)],["Cancelled",String(cancelled)]].map(([label,v])=><div key={label} className="stat-card"><p>{label}</p><strong>{v}</strong></div>)}</div>
 <section className="panel mt-6 overflow-hidden"><div className="section-heading px-5 py-5"><div><h2>Daily sales</h2><p>Daily totals excluding cancelled orders.</p></div></div><div className="divide-y divide-white/[.06]">{daily.map(([day,v])=><div key={day} className="flex items-center justify-between gap-4 px-5 py-4 text-sm"><div><p className="font-semibold">{new Date(day+"T12:00:00").toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"})}</p><p className="mt-1 text-xs text-slate-500">{v.orders} orders</p></div><p className="font-bold">{fmt(v.revenue)}</p></div>)}{!daily.length&&<p className="p-10 text-center text-sm text-slate-500">No sales in this period yet.</p>}</div></section>
 <section className="panel mt-6 overflow-hidden"><div className="section-heading px-5 py-5"><div><h2>Transactions</h2><p>Order activity for the selected dates.</p></div></div><div className="divide-y divide-white/[.06]">{filtered.slice().sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,100).map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><div><p className="font-semibold">Order #{o.order_number}</p><p className="mt-1 text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</p></div><span className="count-pill">{o.status}</span><p className="font-bold">{fmt(Number(o.total))}</p></div>)}</div>{filtered.length>100&&<p className="px-5 py-3 text-center text-xs text-slate-500">Showing latest 100 transactions out of {filtered.length}.</p>}</section>
 </>;
}
