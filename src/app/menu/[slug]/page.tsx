import PublicMenuClient from "./public-menu-client";
export default async function PublicMenuPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{table?:string;token?:string;mode?:string}>}){
 const [{slug},{table,token,mode}]=await Promise.all([params,searchParams]);
 const takeaway=mode==="takeaway";
 if(!takeaway&&(!table||!token))return <main className="grid min-h-screen place-items-center bg-[#f7f7f4] p-6 text-center text-slate-800"><div><h1 className="text-2xl font-black">Invalid menu link</h1><p className="mt-2 text-sm text-slate-500">Please scan the QR code placed on your table.</p></div></main>;
 return <PublicMenuClient slug={slug} tableId={table||""} token={token||""} mode={takeaway?"TAKEAWAY":"DINE_IN"}/>;
}