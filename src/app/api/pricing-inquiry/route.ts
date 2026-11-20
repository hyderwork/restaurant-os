import { NextResponse } from \"next/server\";

export const runtime = \"nodejs\";

export async function POST(request: Request) {
 try {
  const body = await request.json();
  const name = String(body.name ?? \"\").trim();
  const restaurant = String(body.restaurant ?? \"\").trim();
  const email = String(body.email ?? \"\").trim();
  const phone = String(body.phone ?? \"\").trim();
  const plan = String(body.plan ?? \"Not specified\").trim().slice(0,60);
  const message = String(body.message ?? \"\").trim().slice(0,1500);
  if (!name || !restaurant || !email || !phone || name.length>100 || restaurant.length>120 || email.length>254 || phone.length>30 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
   return NextResponse.json({error:\"Please complete all required fields with valid details.\"},{status:400});
  }
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.RESEND_FROM_EMAIL;
  if(!apiKey || !from) return NextResponse.json({error:\"The inquiry email service is not configured yet. Please contact us directly for now.\"},{status:503});

  const html=`<h2>New RestaurantOS pricing inquiry</h2><p><b>Plan:</b> ${escapeHtml(plan)}</p><p><b>Name:</b> ${escapeHtml(name)}</p><p><b>Restaurant:</b> ${escapeHtml(restaurant)}</p><p><b>Email:</b> ${escapeHtml(email)}</p><p><b>Phone:</b> ${escapeHtml(phone)}</p><p><b>Message:</b><br/>${escapeHtml(message || \"Not provided\").replace(/\\r?\\n/g,\"<br/>\")}</p>`;
  const response=await fetch(\"https://api.resend.com/emails\",{
   method:\"POST\",
   headers:{\"Authorization\":`Bearer ${apiKey}`,\"Content-Type\":\"application/json\"},
   body:JSON.stringify({
    from,
    to:[\"hyder1.work@gmail.com\"],
    reply_to:email,
    subject:`RestaurantOS ${plan} pricing inquiry — ${restaurant}`,
    html
   })
  });
  if(!response.ok) {
   const detail=await response.text();
   console.error(\"Pricing inquiry email failed\",response.status,detail);
   return NextResponse.json({error:\"We couldn't send your inquiry right now. Please try again later.\"},{status:502});
  }
  return NextResponse.json({ok:true});
 } catch {
  return NextResponse.json({error:\"Invalid request. Please try again.\"},{status:400});
 }
}

function escapeHtml(value:string) {
 return value.replace(/[&<>\"']/g, char => ({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[char] as string));
}
