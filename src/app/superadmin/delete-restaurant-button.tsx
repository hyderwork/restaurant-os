"use client";
import {useState} from "react";
import {deleteRestaurant} from "./actions";
export default function DeleteRestaurantButton({restaurantId,restaurantName}:{restaurantId:string;restaurantName:string}){
 const [pending,setPending]=useState(false);
 return <form action={async (formData)=>{setPending(true);try{await deleteRestaurant(formData);}finally{setPending(false);}}}>
  <input type="hidden" name="restaurant_id" value={restaurantId}/>
  <button type="submit" disabled={pending} onClick={(e)=>{if(!window.confirm(`PERMANENTLY DELETE "${restaurantName}"? This removes the restaurant, all menus, tables, staff memberships, orders, payments and subscription data. Login accounts used only by this restaurant will also be permanently deleted, including their email/auth identity. Accounts still used by another restaurant or platform admin will be kept. This cannot be undone.`))e.preventDefault();}} className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">{pending?"Processing…":"Delete permanently"}</button>
 </form>;
}
