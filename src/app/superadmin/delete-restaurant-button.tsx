"use client";
import {useState} from "react";
import {deleteRestaurant} from "./actions";
export default function DeleteRestaurantButton({restaurantId,restaurantName}:{restaurantId:string;restaurantName:string}){
 const [pending,setPending]=useState(false);
 return <form action={async (formData)=>{setPending(true);try{await deleteRestaurant(formData);}finally{setPending(false);}}}>
  <input type="hidden" name="restaurant_id" value={restaurantId}/>
  <button type="submit" disabled={pending} onClick={(e)=>{if(!window.confirm(`Remove access for "${restaurantName}"? If it has no order/payment history it will be permanently deleted. If it has history, it will be CLOSED and its subscription canceled while records are preserved.`))e.preventDefault();}} className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">{pending?"Processing…":"Delete / Close workspace"}</button>
 </form>;
}
