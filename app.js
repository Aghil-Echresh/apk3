const cfg=window.SUPABASE_CONFIG||{};
const sb=supabase.createClient(cfg.url,cfg.anonKey);
let user=null,customers=[],selected=null,transactions=[];

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("fa-IR").format(Number(n)||0)+" تومان";
const dateFa=s=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"short",timeStyle:"short"}).format(new Date(s));
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function setLoggedIn(on){$("loginView").classList.toggle("hidden",on);$("appView").classList.toggle("hidden",!on);$("logoutBtn").classList.toggle("hidden",!on)}

async function init(){
  if(!cfg.url||cfg.url.startsWith("YOUR_")){toast("ابتدا config.js را تنظیم کن");return}
  const {data:{session}}=await sb.auth.getSession();
  user=session?.user||null; setLoggedIn(!!user); if(user) await loadCustomers();
  sb.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;setLoggedIn(!!user);if(user)loadCustomers()});
}
async function loadCustomers(){
 const {data,error}=await sb.from("customers").select("*").order("name");
 if(error)return toast(error.message); customers=data||[]; renderCustomers(); await loadStats();
}
function renderCustomers(){
 const q=$("searchInput").value.trim().toLowerCase();
 const arr=customers.filter(c=>c.name.toLowerCase().includes(q)||(c.phone||"").includes(q));
 $("customerCount").textContent=new Intl.NumberFormat("fa-IR").format(customers.length);
 $("customersList").innerHTML=arr.map(c=>`<button class="customer ${selected?.id===c.id?"active":""}" data-id="${c.id}"><div class="customer-name">${esc(c.name)}</div><div class="customer-meta">${esc(c.phone||"بدون شماره")}</div></button>`).join("")||'<p class="muted">موردی پیدا نشد.</p>';
 document.querySelectorAll(".customer").forEach(b=>b.onclick=()=>selectCustomer(b.dataset.id));
}
async function loadStats(){
 const start=new Date();start.setHours(0,0,0,0);
 const {data}=await sb.from("transactions").select("type,amount,created_at");
 const rows=data||[];
 $("todayDeposit").textContent=money(rows.filter(x=>x.type==="deposit"&&new Date(x.created_at)>=start).reduce((a,x)=>a+Number(x.amount),0));
 $("todayWithdraw").textContent=money(rows.filter(x=>x.type==="withdraw"&&new Date(x.created_at)>=start).reduce((a,x)=>a+Number(x.amount),0));
 $("totalBalance").textContent=money(rows.reduce((a,x)=>a+(x.type==="deposit"?1:-1)*Number(x.amount),0));
}
async function selectCustomer(id){
 selected=customers.find(c=>c.id===id); if(!selected)return;
 $("emptyState").classList.add("hidden");$("customerPanel").classList.remove("hidden");
 $("selectedName").textContent=selected.name;$("selectedPhone").textContent=selected.phone||"بدون شماره";
 const {data,error}=await sb.from("transactions").select("*").eq("customer_id",id).order("created_at",{ascending:false});
 if(error)return toast(error.message);transactions=data||[];renderTransactions();renderCustomers();
}
function renderTransactions(){
 let balance=transactions.reduce((a,x)=>a+(x.type==="deposit"?1:-1)*Number(x.amount),0);
 $("balanceBadge").textContent=money(balance);$("balanceBadge").classList.toggle("negative",balance<0);
 $("transactionsList").innerHTML=transactions.map(x=>`<div class="tx"><div><div class="tx-title ${x.type}">${x.type==="deposit"?"واریز":"برداشت"} · ${money(x.amount)}</div><div class="tx-meta">${dateFa(x.created_at)} · ${esc(x.note||"بدون توضیح")}</div>${x.receipt_url?'<a class="receipt-link" target="_blank" rel="noopener" href="'+x.receipt_url+'">مشاهده رسید 📷</a>':""}</div><div class="tx-meta">${x.type==="deposit"?"➕":"➖"}</div></div>`).join("")||'<p class="muted">هنوز تراکنشی ثبت نشده.</p>';
}
async function addTransaction(e){
 e.preventDefault(); if(!selected)return;
 const amount=Number($("amount").value); if(!amount||amount<=0)return toast("مبلغ را درست وارد کن");
 let receipt_url=null;const file=$("receipt").files[0];
 if(file){
   if(file.size>5*1024*1024)return toast("حجم عکس باید کمتر از ۵ مگابایت باشد");
   const ext=(file.name.split(".").pop()||"jpg").toLowerCase(),path=user.id+"/"+crypto.randomUUID()+"."+ext;
   const up=await sb.storage.from("receipts").upload(path,file,{contentType:file.type,upsert:false});
   if(up.error)return toast(up.error.message);
   const pub=sb.storage.from("receipts").getPublicUrl(path);receipt_url=pub.data.publicUrl;
 }
 const {error}=await sb.from("transactions").insert({user_id:user.id,customer_id:selected.id,type:$("type").value,amount,note:$("note").value.trim(),receipt_url});
 if(error)return toast(error.message);
 $("transactionForm").reset();toast("تراکنش با موفقیت ثبت شد");await selectCustomer(selected.id);await loadStats();
}
async function addCustomer(e){
 e.preventDefault();
 const {data,error}=await sb.from("customers").insert({user_id:user.id,name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),note:$("customerNote").value.trim()}).select().single();
 if(error)return toast(error.message);$("customerDialog").close();$("customerForm").reset();await loadCustomers();await selectCustomer(data.id);toast("مشتری اضافه شد");
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("loginForm").onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)toast(error.message)};
$("logoutBtn").onclick=()=>sb.auth.signOut();
$("transactionForm").onsubmit=addTransaction;$("customerForm").onsubmit=addCustomer;
$("newCustomerBtn").onclick=()=>$("customerDialog").showModal();$("cancelCustomer").onclick=()=>$("customerDialog").close();$("searchInput").oninput=renderCustomers;
init();
