"use client";

import {useEffect,useRef} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

type Props={children:React.ReactNode;scope:"restaurant"|"platform";restaurantId?:string};

const restaurantTables=[
  ["audit_logs","restaurant_id"],["floors","restaurant_id"],["memberships","restaurant_id"],
  ["menu_categories","restaurant_id"],["menu_products","restaurant_id"],["order_feedback",null],
  ["order_items",null],["order_status_history",null],["orders","restaurant_id"],["payments","restaurant_id"],
  ["qr_codes","restaurant_id"],["restaurant_settings","restaurant_id"],["restaurant_tables","restaurant_id"],
  ["restaurants","id"],["subscriptions","restaurant_id"],["subscription_plans",null],["users",null]
] as const;
const platformTables=["restaurants","memberships","subscriptions","subscription_plans","platform_admins","users"] as const;

export default function RealtimeSync({children,scope,restaurantId}:Props){
  const router=useRouter();
  const refreshTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    if(scope==="restaurant"&&!restaurantId)return;
    const supabase=createClient();
    let active=true;
    let connected=false;
    const channel=supabase.channel(scope==="platform"?"platform-live-sync":"restaurant-live-sync-"+restaurantId);
    const scheduleRefresh=()=>{
      if(!active)return;
      if(refreshTimer.current)clearTimeout(refreshTimer.current);
      refreshTimer.current=setTimeout(()=>{if(active)router.refresh();},120);
    };
    const tables=scope==="platform"
      ?platformTables.map(table=>({table,filter:undefined as string|undefined}))
      :restaurantTables.map(([table,column])=>({table,filter:column?(column==="id"?"id=eq."+restaurantId:"restaurant_id=eq."+restaurantId):undefined}));
    for(const item of tables){
      channel.on("postgres_changes",{event:"*",schema:"public",table:item.table,...(item.filter?{filter:item.filter}:{})},scheduleRefresh);
    }
    channel.subscribe(status=>{
      if(!active)return;
      if(status==="SUBSCRIBED"){
        scheduleRefresh();
        connected=true;
      }
    });
    return()=>{
      active=false;
      if(refreshTimer.current)clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  },[router,scope,restaurantId]);
  return <>{children}</>;
}
