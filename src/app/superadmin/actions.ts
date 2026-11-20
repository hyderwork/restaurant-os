"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {ensureAccountForInvitation} from "@/lib/auth/provisioning";
const v=(f:FormData,k:string)=>String(f.get(k)||"").trim();

export async function createRestaurant(f:FormData){
 const {supabase}=await requirePlatformAdmin();
 const name=v(f,"name"),slug=v(f,"slug").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||v(f,"name").toLowerCase().replace(/[^a-z0-9]+/g,"-");
 const email=v(f,"owner_email").toLowerCase(),plan=v(f,"plan_id"),ownerName=v(f,"owner_name");
 const trialDays=Number(v(f,"trial_days")||14);
 if(!name||!email||!plan) redirect("/superadmin?error="+encodeURIComponent("Restaurant name, owner email and package are required."));
 if(!Number.isInteger(trialDays)||trialDays<0||trialDays>90) redirect("/superadmin?error="+encodeURIComponent("Trial days must be between 0 and 90."));
 const {data:existingRestaurant,error:slugError}=await supabase.from("restaurants").select("id").eq("slug",slug).maybeSingle();
 if(slugError) redirect("/superadmin?error="+encodeURIComponent(slugError.message));
 if(existingRestaurant) redirect("/superadmin?error="+encodeURIComponent("This restaurant URL slug is already in use."));
 const {data:packageRow,error:planError}=await supabase.from("subscription_plans").select("id").eq("id",plan).eq("active",true).maybeSingle();
 if(planError||!packageRow) redirect("/superadmin?error="+encodeURIComponent(planError?.message||"Selected package is unavailable."));
 let invitation:{created:boolean;emailSent:boolean};
 try {
  invitation=await ensureAccountForInvitation({email,fullName:ownerName});
 } catch(error) {
  const message=error instanceof Error?error.message:"Unable to send the client account invitation.";
  redirect("/superadmin?error="+encodeURIComponent(message));
 }
 const {error}=await supabase.rpc("platform_create_restaurant",{p_name:name,p_slug:slug,p_owner_email:email,p_owner_name:ownerName,p_plan_id:plan,p_phone:v(f,"phone")||null,p_address:v(f,"address")||null,p_trial_days:trialDays});
 if(error) redirect("/superadmin?error="+encodeURIComponent(error.message));
 revalidatePath("/superadmin");
 const message=invitation.created
  ? `Restaurant created. Client account invitation and password setup email sent to ${email}.`
  : invitation.emailSent
   ? `Restaurant created. A fresh account verification email was sent to ${email}.`
   : "Restaurant created and existing client account assigned as OWNER.";
 redirect("/superadmin?success="+encodeURIComponent(message));
}


export async function resendOwnerSetupEmail(f:FormData){
 const {supabase}=await requirePlatformAdmin();
 const restaurantId=v(f,"restaurant_id"),email=v(f,"owner_email").toLowerCase();
 if(!restaurantId||!email) redirect("/superadmin?error="+encodeURIComponent("Restaurant owner email is missing."));
 const {data:restaurant,error}=await supabase.from("restaurants").select("id,memberships(role,users(email))").eq("id",restaurantId).maybeSingle();
 if(error||!restaurant) redirect("/superadmin?error="+encodeURIComponent(error?.message||"Restaurant not found."));
 const owner=restaurant.memberships?.find((m:any)=>m.role==="OWNER");
 const ownerEmail=owner?.users?.email?.toLowerCase();
 if(!ownerEmail||ownerEmail!==email) redirect("/superadmin?error="+encodeURIComponent("Owner email verification failed. Refresh the page and try again."));
 try {
  await ensureAccountForInvitation({email});
 } catch(error) {
  const message=error instanceof Error?error.message:"Could not send the password setup email.";
  redirect("/superadmin?error="+encodeURIComponent(message));
 }
 revalidatePath("/superadmin");
 redirect("/superadmin?success="+encodeURIComponent("Password setup email requested for "+email+". Check the recipient inbox and spam folder."));
}

export async function updateRestaurantAccess(f:FormData){const {supabase}=await requirePlatformAdmin();const {error}=await supabase.rpc("platform_update_restaurant",{p_restaurant_id:v(f,"restaurant_id"),p_status:v(f,"status"),p_plan_id:v(f,"plan_id")||null,p_subscription_status:v(f,"subscription_status")});if(error)throw new Error(error.message);revalidatePath("/superadmin");}
export async function platformLogout(){const {supabase}=await requirePlatformAdmin();await supabase.auth.signOut();redirect("/");}

export async function savePackage(f:FormData){const {supabase}=await requirePlatformAdmin();const id=v(f,"plan_id"),name=v(f,"plan_name");const price=Number(v(f,"monthly_price")),tables=Number(v(f,"max_tables")),staff=Number(v(f,"max_staff"));if(!name||!Number.isFinite(price)||price<0||!Number.isInteger(tables)||tables<1||!Number.isInteger(staff)||staff<1)throw new Error("Enter valid package limits and price.");const payload={name,monthly_price:price,max_tables:tables,max_staff:staff,active:v(f,"active")!=="false",features:{qr_ordering:true,menu_management:true,staff_roles:true,advanced_reports:name!=="Starter",priority_support:name==="Enterprise"}};const q=id?supabase.from("subscription_plans").update(payload).eq("id",id):supabase.from("subscription_plans").insert(payload);const {error}=await q;if(error)throw new Error(error.message);revalidatePath("/superadmin");}

export async function deleteRestaurant(f:FormData){
 const {supabase}=await requirePlatformAdmin();
 const id=v(f,"restaurant_id");
 if(!id) redirect("/superadmin?error="+encodeURIComponent("Restaurant ID is missing. Please refresh the page and try again."));
 const {error}=await supabase.rpc("platform_delete_restaurant",{p_restaurant_id:id});
 if(error){
  const reason=error.message.toLowerCase();
  const hasHistory=reason.includes("order")||reason.includes("payment")||reason.includes("history");
  if(hasHistory){
   const {error:closeError}=await supabase.rpc("platform_update_restaurant",{
    p_restaurant_id:id,
    p_status:"CLOSED",
    p_plan_id:null,
    p_subscription_status:"CANCELED"
   });
   if(closeError) redirect("/superadmin?error="+encodeURIComponent("Restaurant has order/payment history and could not be deleted. Automatic closure also failed: "+closeError.message));
   revalidatePath("/superadmin");
   redirect("/superadmin?success="+encodeURIComponent("Restaurant has historical orders/payments, so it was safely CLOSED and its subscription was canceled. Historical records have been preserved."));
  }
  redirect("/superadmin?error="+encodeURIComponent(error.message));
 }
 revalidatePath("/superadmin");
 redirect("/superadmin?success="+encodeURIComponent("Restaurant account permanently deleted."));
}
