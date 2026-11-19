"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function TablesAutoRefresh(){const router=useRouter();useEffect(()=>{const timer=setInterval(()=>router.refresh(),5000);return()=>clearInterval(timer);},[router]);return <p className="mb-3 text-right text-[11px] text-slate-500">● Live table status · refreshes every 5 seconds</p>;}
