"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {ArrowRight,ArrowUpRight,BarChart3,Check,ChefHat,ChevronDown,ClipboardList,Layers3,MoveUpRight,Play, QrCode,Sparkles,Store,Table2,Zap,Menu,X} from "lucide-react";
import {PricingInquiryButton} from "@/components/pricing-inquiry";
import ThemeToggle from "@/components/theme-toggle";

const features=[
 {icon:QrCode,kicker:"GUEST EXPERIENCE",title:"A better way to order.",text:"Give guests a smooth QR menu and table-ordering experience. Less waiting, clearer orders, better service."},
 {icon:ChefHat,kicker:"KITCHEN CONTROL",title:"From table to kitchen. Instantly.",text:"Keep orders moving with a connected kitchen workflow and clear status updates for your team."},
 {icon:Table2,kicker:"FLOOR MANAGEMENT",title:"Know every table at a glance.",text:"Manage floors, tables and active service from one visual operations workspace."},
 {icon:BarChart3,kicker:"BUSINESS VISIBILITY",title:"See how service is performing.",text:"Bring orders, revenue and daily operations into one place so decisions are easier to make."}
];
const steps=[
 {n:"01",title:"Set up your restaurant",text:"Create your workspace, organize your menu and configure your tables."},
 {n:"02",title:"Let guests scan and order",text:"Guests scan a table QR code, explore the menu and submit an order."},
 {n:"03",title:"Keep service in sync",text:"Staff and kitchen teams follow order progress from their role-based workspace."}
];
const plans=[
 {name:"Starter",price:"2,999",desc:"For small cafés and restaurants getting started with QR ordering.",features:["1 restaurant outlet","Up to 10 tables (limit enforced)","Up to 5 staff accounts (limit enforced)","QR menu & table ordering","Live customer order tracking","Kitchen order workflow","Menu and table management","Sales overview · last 7 days"]},
 {name:"Professional",price:"5,999",desc:"For busy restaurants that need more tables, staff and operational visibility.",features:["1 restaurant outlet","Up to 30 tables (limit enforced)","Up to 15 staff accounts (limit enforced)","Everything in Starter","Multiple floors · table control","Customer feedback collection","Order status history","Extended sales reports · up to 1 year","Priority onboarding support"],popular:true},
 {name:"Enterprise",price:"Custom",desc:"For restaurant groups with tailored rollout and integration requirements.",features:["Custom outlet, table and staff limits","Guided onboarding & data setup","Custom workflows and integrations","Deployment and migration planning","Dedicated support options","Tailored commercial agreement"]}
];

function DashboardVisual(){
 return <div className="hero-dashboard" data-parallax>
  <div className="dash-top"><div className="flex items-center gap-2"><span className="dash-logo">R</span><div><b>RestaurantOS</b><small>Restaurant workspace</small></div></div><span className="live-pill"><i/> LIVE OVERVIEW</span></div>
  <div className="dash-welcome"><div><small>MONDAY, 21 NOVEMBER</small><h3>Good afternoon, Alex <span>✦</span></h3><p>Here’s what’s happening in your restaurant today.</p></div><span className="dash-date">Today⌄</span></div>
  <div className="dash-stats">
   <div><small>Total orders</small><strong>128</strong><em>↗ 12.8% <span>vs last week</span></em><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
   <div><small>Today’s revenue</small><strong>Rs 84,250</strong><em>↗ 8.4% <span>vs last week</span></em><div className="sparkline second"><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
  </div>
  <div className="dash-bottom"><div className="dash-orders"><div className="dash-section-head"><b>Live order queue</b><span>View all ↗</span></div>{[["#1042","Table 08","Preparing","orange"],["#1041","Table 03","Ready","green"],["#1040","Takeaway","New order","blue"]].map(x=><div className="dash-order" key={x[0]}><span className="order-icon"><ClipboardList size={15}/></span><div><b>{x[0]} · {x[1]}</b><small>2 items · Just now</small></div><label className={x[3]}>{x[2]}</label></div>)}</div><div className="dash-floor"><div className="dash-section-head"><b>Floor status</b><span>24 tables</span></div><div className="floor-grid">{Array.from({length:12},(_,i)=><i key={i} className={i<7?"occupied":i===8?"reserved":""}/>)}</div><div className="floor-legend"><span><i className="occupied"/>Occupied</span><span><i/>Available</span></div></div></div>
  <div className="dash-floating float-one"><span>✓</span><div><b>Order received</b><small>Table 08 · Just now</small></div></div>
  <div className="dash-floating float-two"><span><Zap size={16}/></span><div><b>Kitchen is in sync</b><small>Live order updates</small></div></div>
 </div>
}

export default function Home(){
 const root=useRef<HTMLElement>(null);
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 useEffect(()=>{
  let ctx:any;
  let alive=true;
  (async()=>{
   const gsapModule=await import("gsap");
   const stModule=await import("gsap/ScrollTrigger");
   if(!alive||!root.current)return;
   const gsap=gsapModule.gsap;
   const ScrollTrigger=stModule.ScrollTrigger;
   gsap.registerPlugin(ScrollTrigger);
   ctx=gsap.context(()=>{
    gsap.set("[data-reveal]",{y:34,opacity:0});
    gsap.to(".hero-copy > *",{y:0,opacity:1,duration:.9,stagger:.13,ease:"power3.out",delay:.15});
    gsap.from(".hero-dashboard",{y:65,opacity:0,rotateY:-9,scale:.94,duration:1.25,ease:"power3.out",delay:.25});
    gsap.to(".float-one",{y:-12,duration:2.3,repeat:-1,yoyo:true,ease:"sine.inOut"});
    gsap.to(".float-two",{y:12,duration:2.7,repeat:-1,yoyo:true,ease:"sine.inOut"});
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach(el=>{
      gsap.to(el,{y:0,opacity:1,duration:.85,ease:"power3.out",scrollTrigger:{trigger:el,start:"top 86%",once:true}});
    });
    gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach(group=>{
      gsap.from(group.children,{y:28,opacity:0,duration:.7,stagger:.12,ease:"power3.out",scrollTrigger:{trigger:group,start:"top 82%",once:true}});
    });
    gsap.to(".orbit-ring",{rotate:360,duration:48,repeat:-1,ease:"none"});
   },root);
  })();
  return()=>{alive=false;ctx?.revert();};
 },[]);
 return <main ref={root} className="marketing-page min-h-screen overflow-hidden">
  <div className="marketing-noise"/>
  <header className="marketing-header">
   <Link href="/" className="marketing-brand"><span className="brand-symbol"><Store size={20}/></span><span>Restaurant<span>OS</span></span></Link>
   <nav className="desktop-marketing-nav"><a href="#platform">Platform</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQs</a></nav>
   <div className="header-actions"><ThemeToggle/><Link href="/login" className="login-link">Sign in</Link><Link href="/signup" className="header-cta">Get started <ArrowUpRight size={15}/></Link><button type="button" className="mobile-menu-toggle" aria-label={mobileMenuOpen?"Close navigation":"Open navigation"} aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(v=>!v)}>{mobileMenuOpen?<X size={20}/>:<Menu size={20}/>}</button></div>
   {mobileMenuOpen&&<nav className="mobile-marketing-nav"><a onClick={()=>setMobileMenuOpen(false)} href="#platform">Platform</a><a onClick={()=>setMobileMenuOpen(false)} href="#how-it-works">How it works</a><a onClick={()=>setMobileMenuOpen(false)} href="#pricing">Pricing</a><a onClick={()=>setMobileMenuOpen(false)} href="#faq">FAQs</a><Link onClick={()=>setMobileMenuOpen(false)} href="/login">Sign in</Link><Link onClick={()=>setMobileMenuOpen(false)} href="/signup">Get started</Link></nav>}
  </header>
  <section className="marketing-hero">
   <div className="hero-glow"/><div className="orbit-ring"><i/><i/><i/></div>
   <div className="hero-copy">
    <div className="hero-eyebrow"><span/> THE OPERATING SYSTEM FOR MODERN RESTAURANTS</div>
    <h1>Great service.<br/><span>Beautifully</span> <i>orchestrated.</i></h1>
    <p>One connected workspace for every table, every order and every team. Run your restaurant with more clarity — and give every guest a better experience.</p>
    <div className="hero-actions"><Link href="/signup" className="primary-cta">Build your workspace <ArrowUpRight size={18}/></Link><a href="#platform" className="secondary-cta"><span><Play size={12} fill="currentColor"/></span> Explore the platform</a></div>
    <div className="hero-proof"><div className="proof-avatars"><i>A</i><i>R</i><i>+</i></div><span>Designed for the rhythm of restaurant service</span></div>
   </div>
   <div className="hero-visual"><DashboardVisual/></div>
   <div className="hero-bottom-note"><span>01 / ONE CONNECTED PLATFORM</span><span>SCROLL TO EXPLORE ↓</span></div>
  </section>
  <section className="trust-strip"><span>BUILT AROUND YOUR DAILY OPERATIONS</span><div><b><QrCode/> QR ORDERING</b><b><ChefHat/> KITCHEN FLOW</b><b><Layers3/> FLOOR CONTROL</b><b><BarChart3/> LIVE INSIGHTS</b></div></section>
  <section id="platform" className="platform-section marketing-section">
   <div className="section-intro" data-reveal><span className="section-kicker">ONE PLATFORM. MORE CONTROL.</span><h2>All the moving parts.<br/><em>Moving together.</em></h2><p>Less switching between tools. More time focused on guests, service and the details that make a restaurant memorable.</p></div>
   <div className="feature-grid" data-stagger>{features.map(({icon:Icon,kicker,title,text},i)=><article className="feature-card" key={title}><div className="feature-card-top"><span>0{i+1}</span><Icon size={22}/></div><small>{kicker}</small><h3>{title}</h3><p>{text}</p><div className="feature-line"/></article>)}</div>
  </section>
  <section className="experience-section">
   <div className="experience-copy" data-reveal><span className="section-kicker">BUILT FOR THE REAL SERVICE FLOOR</span><h2>From the first scan<br/>to the <em>last order.</em></h2><p>RestaurantOS connects the guest experience with the work happening behind the scenes. Your team gets a clearer picture of what needs attention, right when it matters.</p><Link href="/signup" className="text-link">Explore your workspace <ArrowUpRight size={16}/></Link></div>
   <div className="experience-art" data-reveal><div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><div className="phone-mock"><div className="phone-notch"/><div className="phone-brand"><span>R</span> RESTAURANTOS</div><div className="phone-photo"><span>CHEF'S SPECIAL</span><b>Made fresh.<br/>Served with care.</b></div><small className="phone-label">TODAY'S MENU</small><div className="phone-item"><i>🍜</i><span><b>Signature ramen</b><small>Rich broth · Fresh herbs</small></span><strong>Rs 850</strong></div><div className="phone-item"><i>🥗</i><span><b>Garden bowl</b><small>Seasonal · Crisp</small></span><strong>Rs 650</strong></div><div className="phone-add">Add to order <ArrowUpRight size={13}/></div></div><div className="art-caption"><span>GUEST VIEW</span><b>Simple. Clear. Effortless.</b></div></div>
  </section>
  <section id="how-it-works" className="steps-section marketing-section"><div className="section-intro center" data-reveal><span className="section-kicker">A SIMPLER WAY TO RUN SERVICE</span><h2>Up and running.<br/><em>In three steps.</em></h2><p>Bring your restaurant workflow into one connected space.</p></div><div className="steps-grid" data-stagger>{steps.map(s=><article key={s.n}><span>{s.n}</span><div className="step-line"/><h3>{s.title}</h3><p>{s.text}</p></article>)}</div></section>
  <section className="manifesto-section"><div className="manifesto-orb"/><div data-reveal><span className="section-kicker">BETTER FLOW. BETTER SERVICE.</span><h2>Your restaurant has<br/>a rhythm. <em>Keep it.</em></h2><p>Give your people the tools to focus on hospitality — while the operations stay in sync.</p><Link href="/signup" className="primary-cta">Get started today <ArrowUpRight size={17}/></Link></div><div className="manifesto-side"><span>DESIGNED FOR</span><b>Owners</b><b>Managers</b><b>Service teams</b><b>Kitchen teams</b></div></section>
  <section id="pricing" className="pricing-section marketing-section"><div className="section-intro center" data-reveal><span className="section-kicker">STRAIGHTFORWARD PLANS</span><h2>Choose your next<br/><em>chapter.</em></h2><p>Start with the essentials. Add more operational control as your restaurant grows.</p><small>MONTHLY PRICING · PAKISTAN</small></div><div className="pricing-grid" data-stagger>{plans.map(plan=><article key={plan.name} className={plan.popular?"price-card featured":"price-card"}>{plan.popular&&<div className="popular-tag"><Sparkles size={12}/> MOST POPULAR</div>}<span className="plan-name">{plan.name}</span><h3>{plan.price==="Custom"?"Let's talk":<>Rs. {plan.price}<small>/ month</small></>}</h3><p>{plan.desc}</p><div className="price-rule"/><ul>{plan.features.map(x=><li key={x}><Check size={15}/>{x}</li>)}</ul><PricingInquiryButton plan={plan.name} className={plan.popular?"price-button filled":"price-button"}>{plan.name==="Enterprise"?"Talk to sales":`Choose ${plan.name}`} <ArrowUpRight size={15}/></PricingInquiryButton></article>)}</div><p className="pricing-footnote">Prices are per restaurant outlet, billed monthly in PKR. Applicable taxes, payment gateway fees and optional third-party services are additional. Enterprise pricing depends on scope. Package limits are enforced in the restaurant workspace: Starter includes one floor, up to 10 tables, 5 staff and 7-day sales reporting; Professional includes multiple floors, up to 30 tables, 15 staff and extended reporting. Enterprise limits are custom.</p></section>
  <section id="faq" className="faq-section marketing-section"><div className="faq-intro" data-reveal><span className="section-kicker">GOOD QUESTIONS</span><h2>Before you<br/><em>get started.</em></h2><p>A few details to help you understand how RestaurantOS fits into your restaurant.</p></div><div className="faq-list" data-reveal>{[["What is RestaurantOS?","RestaurantOS is a restaurant operations platform that brings QR ordering, menu and table management, staff workflows and kitchen order handling into one workspace."],["Can my staff have separate access?","Yes. The platform is designed around role-based workspaces so staff members can use the tools relevant to their responsibilities."],["Can customers order using a QR code?","RestaurantOS includes QR menu and table-ordering workflows, allowing guests to browse and submit orders from their table."],["How do I choose a plan?","Compare the plan limits above and send a pricing inquiry. The team can help confirm the right setup for your restaurant."]] .map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</div></section>
  <footer className="marketing-footer"><div className="footer-main"><div><Link href="/" className="marketing-brand"><span className="brand-symbol"><Store size={20}/></span><span>Restaurant<span>OS</span></span></Link><p>Thoughtful tools for the everyday rhythm of restaurant service.</p></div><div className="footer-links"><a href="#platform">Platform</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><Link href="/login">Sign in</Link></div><Link href="/signup" className="footer-cta">Start your workspace <MoveUpRight size={16}/></Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} RestaurantOS. All rights reserved.</span><span>MADE FOR BETTER SERVICE.</span></div></footer>
 </main>
}
