import{c as _,U,r as m,f as j,b as f,ab as k,j as e,a0 as se,B as y,a2 as ae,C as N,a as w,I as z,F as re,G as ne,H as ie,J as oe,K as B,q as de,aa as le,e as ce,g as me}from"./index-ZyCHCrtj.js";import{T as xe,a as pe,b as H,c as v,d as he,e as g}from"./table-CQEo3iCv.js";import{T as ue}from"./trending-up-D0T_g28E.js";import{C as ge}from"./calendar-BgwL37Xc.js";import{A as G}from"./arrow-up-down-kW-4ALGp.js";import{s as T}from"./subDays-CHw-QLkF.js";import{p as b}from"./parseISO-C_oxnVAJ.js";const K=_("ArrowDownWideNarrow",[["path",{d:"m3 16 4 4 4-4",key:"1co6wj"}],["path",{d:"M7 20V4",key:"1yoxec"}],["path",{d:"M11 4h10",key:"1w87gc"}],["path",{d:"M11 8h7",key:"djye34"}],["path",{d:"M11 12h4",key:"q8tih4"}]]);const W=_("ArrowUpNarrowWide",[["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}],["path",{d:"M11 12h4",key:"q8tih4"}],["path",{d:"M11 16h7",key:"uosisv"}],["path",{d:"M11 20h10",key:"jvxblo"}]]);function E(r,o){const d=+U(r),[C,x]=[+U(o.start),+U(o.end)].sort((S,p)=>S-p);return d>=C&&d<=x}function Se(){const[r,o]=m.useState("monthly"),[d,C]=m.useState(j(T(new Date,30),"yyyy-MM-dd")),[x,S]=m.useState(j(new Date,"yyyy-MM-dd")),[p,O]=m.useState(""),[n,M]=m.useState("visitCount"),[h,D]=m.useState("desc"),{data:L,isLoading:J}=f({queryKey:["/api/owners"]}),{data:I,isLoading:Q}=f({queryKey:["/api/appointments"]}),{data:P,isLoading:X}=f({queryKey:["/api/invoices"]}),{data:A,isLoading:Y}=f({queryKey:["/api/pets"]}),{data:V,isLoading:Z}=f({queryKey:["/api/medical-records"]}),ee=J||Q||X||Y||Z,F=s=>{n===s?D(h==="asc"?"desc":"asc"):(M(s),D("desc"))},l=m.useMemo(()=>{if(!L||!I||!P||!A||!V)return[];const s=new Date;let i,$=s;r==="weekly"?i=k(T(s,7)):r==="monthly"?i=k(T(s,30)):(i=k(b(d)),$=k(b(x)));const q={start:i,end:$},c=new Map,R=new Map;I.forEach(t=>{try{const a=b(t.date);E(a,q)&&(c.has(t.ownerId)||c.set(t.ownerId,new Set),c.get(t.ownerId)?.add(t.date))}catch{}});const te=new Map(A.map(t=>[t.id,t.ownerId]));return V.forEach(t=>{try{const a=te.get(t.petId),u=b(t.date);a&&E(u,q)&&(c.has(a)||c.set(a,new Set),c.get(a)?.add(t.date))}catch{}}),P.forEach(t=>{try{const a=b(t.date);if(E(a,q)){const u=R.get(t.ownerId)||0;R.set(t.ownerId,u+parseFloat(String(t.total)))}}catch{}}),L.map(t=>({ownerId:t.id,name:`${t.firstName} ${t.lastName||""}`.trim(),phone:t.phone,address:t.address||"-",visitCount:c.get(t.id)?.size||0,totalSpent:R.get(t.id)||0})).filter(t=>t.visitCount>0&&(t.name.toLowerCase().includes(p.toLowerCase())||t.phone.includes(p))).sort((t,a)=>{const u=h==="asc"?1:-1;return n==="name"?t.name.localeCompare(a.name)*u:(t[n]-a[n])*u})},[L,I,P,A,V,r,d,x,p,n,h]);return ee?e.jsx("div",{className:"flex items-center justify-center min-h-screen",children:e.jsx(se,{className:"w-8 h-8 animate-spin text-border"})}):e.jsxs("div",{className:"p-8 space-y-8 print:p-0 print:m-0 print:bg-white w-full",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
        @media print {
          /* Hide sidebar and navigation */
          [data-sidebar="sidebar"], 
          [data-sidebar="trigger"],
          nav, 
          header,
          .print\\:hidden { 
            display: none !important; 
          }

          /* Force main content to take full width/height */
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            width: 100% !important;
          }

          [data-slot="sidebar-wrapper"],
          [data-slot="sidebar-inset"],
          main {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
            overflow: visible !important;
            position: static !important;
          }

          .print-header { 
            display: block !important; 
            margin-bottom: 2rem !important;
          }

          .overflow-auto { 
            overflow: visible !important; 
            height: auto !important; 
          }

          .Card, .card { 
            border: none !important; 
            box-shadow: none !important; 
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            page-break-inside: auto !important;
          }

          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }

          th, td { 
            border: 1px solid #ddd !important; 
            padding: 8px !important; 
            color: black !important;
          }

          .text-primary, .text-emerald-600 { 
            color: black !important; 
          }

          @page { 
            margin: 1.5cm;
            size: auto;
          }
        }
      `}}),e.jsxs("div",{className:"hidden print-header space-y-2 mb-6",children:[e.jsx("h1",{className:"text-2xl font-bold",children:"PetPoint Pro Veterinary Clinic"}),e.jsx("h2",{className:"text-xl font-semibold text-muted-foreground",children:"Customer Visit Report"}),e.jsxs("div",{className:"flex justify-between text-sm",children:[e.jsxs("span",{children:["Period: ",r==="custom"?`${d} to ${x}`:r.charAt(0).toUpperCase()+r.slice(1)]}),e.jsxs("span",{children:["Generated on: ",j(new Date,"PPP")]})]}),e.jsx("hr",{className:"border-t-2 border-primary/20"})]}),e.jsxs("div",{className:"flex items-center justify-between print:hidden",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold tracking-tight",children:"Customer Visit Report"}),e.jsx("p",{className:"text-muted-foreground mt-2",children:"Analysis of recurring customers by visit frequency and spending."})]}),e.jsxs(y,{variant:"outline",onClick:()=>window.print(),children:[e.jsx(ae,{className:"w-4 h-4 mr-2"})," Print Report"]})]}),e.jsx(N,{className:"print:hidden",children:e.jsxs(w,{className:"p-5 flex flex-wrap items-end gap-4",children:[e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-muted-foreground",children:"Period"}),e.jsxs("div",{className:"flex bg-muted p-1 rounded-md",children:[e.jsx(y,{variant:r==="weekly"?"secondary":"ghost",size:"sm",onClick:()=>o("weekly"),children:"Weekly"}),e.jsx(y,{variant:r==="monthly"?"secondary":"ghost",size:"sm",onClick:()=>o("monthly"),children:"Monthly"}),e.jsx(y,{variant:r==="custom"?"secondary":"ghost",size:"sm",onClick:()=>o("custom"),children:"Custom"})]})]}),r==="custom"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-muted-foreground",children:"From"}),e.jsx(z,{type:"date",value:d,onChange:s=>C(s.target.value),className:"w-[160px]"})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-muted-foreground",children:"To"}),e.jsx(z,{type:"date",value:x,onChange:s=>S(s.target.value),className:"w-[160px]"})]})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-muted-foreground",children:"Sort By"}),e.jsxs(re,{value:n,onValueChange:s=>M(s),children:[e.jsx(ne,{className:"w-[180px]",children:e.jsx(ie,{placeholder:"Sort by..."})}),e.jsxs(oe,{children:[e.jsx(B,{value:"visitCount",children:"Visit Count"}),e.jsx(B,{value:"totalSpent",children:"Amount Paid"}),e.jsx(B,{value:"name",children:"Customer Name"})]})]})]}),e.jsxs("div",{className:"flex flex-col gap-2 flex-1 min-w-[200px]",children:[e.jsx("span",{className:"text-xs font-semibold uppercase text-muted-foreground",children:"Search Customer"}),e.jsxs("div",{className:"relative",children:[e.jsx(de,{className:"absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"}),e.jsx(z,{placeholder:"Name or phone...",value:p,onChange:s=>O(s.target.value),className:"pl-9"})]})]}),e.jsx(y,{variant:"ghost",size:"sm",onClick:()=>{o("monthly"),O(""),M("visitCount"),D("desc"),C(j(T(new Date,30),"yyyy-MM-dd")),S(j(new Date,"yyyy-MM-dd"))},className:"mb-1",children:"Clear Filters"})]})}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4",children:[e.jsx(N,{children:e.jsx(w,{className:"p-5",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex flex-col gap-1",children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Total Active Customers"}),e.jsx("span",{className:"text-2xl font-bold",children:l.length})]}),e.jsx(le,{className:"w-5 h-5 text-primary"})]})})}),e.jsx(N,{children:e.jsx(w,{className:"p-5",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex flex-col gap-1",children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Total Spend in Period"}),e.jsxs("span",{className:"text-2xl font-bold",children:["₹",l.reduce((s,i)=>s+i.totalSpent,0).toLocaleString()]})]}),e.jsx(ue,{className:"w-5 h-5 text-emerald-500"})]})})}),e.jsx(N,{children:e.jsx(w,{className:"p-5",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex flex-col gap-1",children:[e.jsx("span",{className:"text-xs font-medium text-muted-foreground",children:"Avg. Visits per Customer"}),e.jsx("span",{className:"text-2xl font-bold",children:l.length>0?(l.reduce((s,i)=>s+i.visitCount,0)/l.length).toFixed(1):0})]}),e.jsx(ge,{className:"w-5 h-5 text-blue-500"})]})})})]}),e.jsxs(N,{children:[e.jsx(ce,{children:e.jsx(me,{className:"text-lg",children:"Detailed Visit List"})}),e.jsx(w,{children:e.jsxs(xe,{children:[e.jsx(pe,{children:e.jsxs(H,{children:[e.jsx(v,{className:"cursor-pointer hover:bg-muted/50 transition-colors",onClick:()=>F("name"),children:e.jsxs("div",{className:"flex items-center gap-2",children:["Customer Name",n==="name"&&(h==="asc"?e.jsx(W,{className:"w-3 h-3 text-primary"}):e.jsx(K,{className:"w-3 h-3 text-primary"}))]})}),e.jsx(v,{children:"Phone"}),e.jsx(v,{children:"Address"}),e.jsx(v,{className:"text-right cursor-pointer hover:bg-muted/50 transition-colors",onClick:()=>F("visitCount"),children:e.jsxs("div",{className:"flex items-center justify-end gap-2 text-right",children:["Visit Count",n==="visitCount"?h==="asc"?e.jsx(W,{className:"w-3 h-3 text-primary"}):e.jsx(K,{className:"w-3 h-3 text-primary"}):e.jsx(G,{className:"w-3 h-3 text-muted-foreground/50"})]})}),e.jsx(v,{className:"text-right cursor-pointer hover:bg-muted/50 transition-colors",onClick:()=>F("totalSpent"),children:e.jsxs("div",{className:"flex items-center justify-end gap-2 text-right",children:["Total Amount Paid",n==="totalSpent"?h==="asc"?e.jsx(W,{className:"w-3 h-3 text-primary"}):e.jsx(K,{className:"w-3 h-3 text-primary"}):e.jsx(G,{className:"w-3 h-3 text-muted-foreground/50"})]})})]})}),e.jsx(he,{children:l.length===0?e.jsx(H,{children:e.jsx(g,{colSpan:5,className:"text-center h-24 text-muted-foreground",children:"No matching records found for the selected period."})}):l.map(s=>e.jsxs(H,{children:[e.jsx(g,{className:"font-semibold",children:s.name}),e.jsx(g,{children:s.phone}),e.jsx(g,{className:"text-muted-foreground max-w-[200px] truncate",title:s.address,children:s.address}),e.jsx(g,{className:"text-right font-medium",children:e.jsxs("span",{className:"bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs",children:[s.visitCount," visits"]})}),e.jsxs(g,{className:"text-right font-bold text-emerald-600",children:["₹",s.totalSpent.toLocaleString(void 0,{minimumFractionDigits:2})]})]},s.ownerId))})]})})]})]})}export{Se as default};
