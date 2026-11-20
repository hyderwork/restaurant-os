"use server";
import {redirect} from \"next/navigation\";
import {createClient} from \"@/lib/supabase/server\";

export async function setInitialPassword(formData:FormData) {
  const password=String(formData.get(\"password\")||\"\");
  const confirm=String(formData.get(\"confirm_password\")||\"\");
  if(password.length<8) redirect(\"/auth/set-password?error=\"+encodeURIComponent(\"Password must be at least 8 characters.\"));
  if(password!==confirm) redirect(\"/auth/set-password?error=\"+encodeURIComponent(\"Passwords do not match.\"));

  const supabase=await createClient();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user) redirect(\"/login?error=\"+encodeURIComponent(\"Your invitation session has expired. Please open the email link again.\")); 
  const {error}=await supabase.auth.updateUser({password});
  if(error) redirect(\"/auth/set-password?error=\"+encodeURIComponent(error.message));

  const {data:platformAdmin}=await supabase.from(\"platform_admins\").select(\"user_id\").eq(\"user_id\",user.id).eq(\"is_active\",true).maybeSingle();
  if(platformAdmin) redirect(\"/superadmin\");
  const {data:membership,error:membershipError}=await supabase.from(\"memberships\").select(\"role\").eq(\"user_id\",user.id).eq(\"status\",\"ACTIVE\").limit(1).maybeSingle();
  if(membershipError) redirect(\"/login?error=\"+encodeURIComponent(membershipError.message));
  if(membership&&[\"MANAGER\",\"CASHIER\",\"CHEF\",\"WAITER\"].includes(String(membership.role))) redirect(\"/staff\");
  if(membership) redirect(\"/admin\");
  redirect(\"/admin/setup\");
}
