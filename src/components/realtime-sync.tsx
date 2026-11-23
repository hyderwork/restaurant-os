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
  const reconnectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const channelRef=useRef<any>(null);
  const retryCount=useRef(0);
  const activeRef=useRef(false);

  useEffect(()=>{
    if(scope==="restaurant"&&!restaurantId)return;
    const supabase=createClient();
    activeRef.current=true;
    let connected=false;

    const scheduleRefresh=()=>{
      if(!activeRef.current)return;
      if(refreshTimer.current)clearTimeout(refreshTimer.current);
      refreshTimer.current=setTimeout(()=>{if(activeRef.current)router.refresh();},160);
    };

    const clearReconnect=()=>{if(reconnectTimer.current){clearTimeout(reconnectTimer.current);reconnectTimer.current=null;}};

    const subscribe=()=>{
      if(!activeRef.current)return;
      clearReconnect();
      const old=channelRef.current;
      if(old){channelRef.current=null;void supabase.removeChannel(old);}
      const channel=supabase.channel(scope==="platform"?"platform-live-sync":"restaurant-live-sync-"+restaurantId,{
        config:{broadcast:{self:false},presence:{key:restaurantId||"platform"}}
      });
      channelRef.current=channel;
      const tables=scope==="platform"
        ?platformTables.map(table=>({table,filter:undefined as string|undefined}))
        :restaurantTables.map(([table,column])=>({table,filter:column?(column==="id"?"id=eq."+restaurantId:"restaurant_id=eq."+restaurantId):undefined}));
      for(const item of tables){
        channel.on("postgres_changes",{event:"*",schema:"public",table:item.table,...(item.filter?{filter:item.filter}:{})},(payload)=>{
          // Every committed row event is a signal to refresh the server-rendered dashboard.
          scheduleRefresh();
        });
      }
      channel.subscribe(status=>{
        if(!activeRef.current)return;
        if(status==="SUBSCRIBED"){
          connected=true;
          retryCount.current=0;
          scheduleRefresh();
        }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
          connected=false;
          retryCount.current=Math.min(retryCount.current+1,8);
          const delay=Math.min(1000*(2**(retryCount.current-1)),30000);
          clearReconnect();
          reconnectTimer.current=setTimeout(()=>{if(activeRef.current)subscribe();},delay);
        }
      });
    };

    const onVisible=()=>{
      if(document.visibilityState==="visible"){
        scheduleRefresh();
        if(!connected&&!reconnectTimer.current)subscribe();
      }
    };
    const onFocus=()=>scheduleRefresh();

    subscribe();
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisible);

    return()=>{
      activeRef.current=false;
      clearReconnect();
      if(refreshTimer.current){clearTimeout(refreshTimer.current);refreshTimer.current=null;}
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisible);
      const current=channelRef.current;
      channelRef.current=null;
      if(current)void supabase.removeChannel(current);
    };
  },[router,scope,restaurantId]);

  return <>{children}</>;
}
