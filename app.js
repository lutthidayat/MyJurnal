const KEY="tradeSaveV9";
const OLD_KEYS=["tradeSaveV7","tradeSaveV6","tradeSaveV5","tradeSaveV4","tradeSaveV3","tradeSaveV2"];
const RATE=16100, USC_PER_USD=100, TARGET_RATE=.05;
const $=id=>document.getElementById(id);
const number=x=>Number(x||0);
const money=x=>number(x).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const usd=x=>"$ "+number(x/USC_PER_USD).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const rp=x=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0,maximumFractionDigits:0}).format(number(x));
const uscRp=x=>rp(number(x)/USC_PER_USD*RATE);
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const isoToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const currentMonth=()=>isoToday().slice(0,7);
const dateFmt=d=>{if(!d)return"-";const x=new Date(d+"T00:00:00");return x.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"2-digit"})};
const monthFmt=m=>{if(!m)return"-";const [y,mo]=m.split("-").map(Number);return new Date(y,mo-1,1).toLocaleDateString("id-ID",{month:"long",year:"numeric"})};
const slug=s=>String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"tabungan";
const setText=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const setStyle=(id,prop,v)=>{const e=$(id);if(e)e.style[prop]=v};
function defaultState(){return {
  capital:1006,
  trading:[{date:"2026-09-14",profit:5.7,note:"Profit awal"}],
  cash:[],
  saving:[{date:"2026-09-01",amount:200000,note:"Tabungan",bucketId:"utama"}],
  savingBuckets:[{id:"utama",name:"Tabungan Utama",target:322000}],
  savingTarget:322000
}}
function normalizeState(s){
  s.capital=number(s.capital)||1006;
  s.trading=Array.isArray(s.trading)?s.trading:[];
  s.cash=Array.isArray(s.cash)?s.cash:[];
  s.saving=Array.isArray(s.saving)?s.saving:[];
  let buckets=Array.isArray(s.savingBuckets)?s.savingBuckets:[];
  if(!buckets.length){buckets=[{id:"utama",name:"Tabungan Utama",target:number(s.savingTarget)||322000}]}
  const seen=new Set();
  buckets=buckets.map((b,i)=>{
    let id=slug(b.id||b.name||`tabungan-${i+1}`); while(seen.has(id))id+=`-${i+1}`; seen.add(id);
    return {id,name:String(b.name||`Tabungan ${i+1}`).trim()||`Tabungan ${i+1}`,target:Math.max(0,number(b.target))};
  });
  s.savingBuckets=buckets;
  const first=buckets[0].id;
  s.saving.forEach(x=>{if(!x.bucketId||!buckets.some(b=>b.id===x.bucketId))x.bucketId=first;});
  s.savingTarget=buckets.reduce((a,b)=>a+number(b.target),0);
  return s;
}
function loadState(){
  let saved=null,source="";
  for(const k of [KEY,...OLD_KEYS]){
    try{const raw=localStorage.getItem(k);if(raw){saved=JSON.parse(raw);source=k;break}}catch(e){}
  }
  const s=normalizeState(saved||defaultState());
  if(source==="tradeSaveV3"||source==="tradeSaveV2"){
    s.cash=s.cash.map(x=>({...x,amount:number(x.amount)*161}));
    s.saving=s.saving.map(x=>({...x,amount:number(x.amount)*161}));
    if(s.savingBuckets?.length===1)s.savingBuckets[0].target=number(s.savingTarget)*161||s.savingBuckets[0].target;
    s.savingTarget=s.savingBuckets.reduce((a,b)=>a+number(b.target),0);
  }
  localStorage.setItem(KEY,JSON.stringify(s));
  return s;
}
let state=loadState();
let charts={equity:null,pl:null};
let currentPage="dashboard";
let cashFilter="all";
let savingFilter="all";
let selectedMonth=currentMonth();

function profit(){return state.trading.reduce((a,x)=>a+number(x.profit),0)}
function balance(){return state.capital+profit()}
function target(){return state.capital*TARGET_RATE}
function todayProfit(){const d=isoToday();return state.trading.filter(x=>x.date===d).reduce((a,x)=>a+number(x.profit),0)}
function savings(bucketId=null,month=null){return state.saving.reduce((a,x)=>(!bucketId||x.bucketId===bucketId)&&(!month||x.date?.slice(0,7)===month)?a+number(x.amount):a,0)}
function savingTarget(bucketId=null){return state.savingBuckets.reduce((a,b)=>(!bucketId||b.id===bucketId)?a+number(b.target):a,0)}
function getBucket(id){return state.savingBuckets.find(b=>b.id===id)||state.savingBuckets[0]}
function cashDirection(type){return /deposit|masuk/i.test(type)?"in":"out"}
function cashIn(month=null){return state.cash.filter(x=>(month?x.date?.slice(0,7)===month:true)&&cashDirection(x.type)==="in").reduce((a,x)=>a+number(x.amount),0)}
function cashOut(month=null){return state.cash.filter(x=>(month?x.date?.slice(0,7)===month:true)&&cashDirection(x.type)==="out").reduce((a,x)=>a+number(x.amount),0)}
function save(){localStorage.setItem(KEY,JSON.stringify(state));flashSaved();renderAll()}
function flashSaved(){const el=$("saveIndicator");if(!el)return;el.textContent="● Tersimpan";el.style.color="#159b79";clearTimeout(window.__saveTimer);window.__saveTimer=setTimeout(()=>{el.textContent="● Data tersimpan"},1100)}

function go(page){
  currentPage=page;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  const titles={
    dashboard:["Dashboard","Ringkasan kondisi trading, cashflow, tabungan, dan target."],
    trading:["Trading Harian","Input dan riwayat profit/loss dalam USC."],
    cashflow:["Uang Masuk / Keluar","Catat pemasukan dan pengeluaran dalam IDR."],
    saving:["Tabungan","Kelola beberapa tabungan dan target masing-masing."],
    monthly:["Rekap Bulanan","Pilih satu bulan untuk melihat profit dan arus dana."],
  };
  setText("pageTitle",titles[page]?.[0]||"Dashboard");setText("pageSubtitle",titles[page]?.[1]||"");
  window.scrollTo({top:0,behavior:"smooth"});
  if(window.innerWidth<980&&$("sidebar"))$("sidebar").classList.remove("open");
}
function renderHeader(){setText("todayLabel",new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}))}

function renderDashboard(){
  const p=profit(),b=balance(),t=target(),today=todayProfit();
  const tp=t?Math.max(0,Math.min(100,p/t*100)):0;
  setText("kCapital",money(state.capital));setText("kCapitalUsd",usd(state.capital));setText("kCapitalRp",uscRp(state.capital));
  setText("kProfit",(p>=0?"+":"")+money(p));setText("kProfitUsd",usd(p));setText("kProfitRp",uscRp(p));
  setText("kTarget",money(t));setText("kTargetPct",tp.toFixed(2)+"%");setStyle("kTargetBar","width",tp+"%");
  setText("kBalance",money(b));setText("kBalanceUsd",usd(b));setText("kBalanceRp",uscRp(b));
  setText("todayProfit",money(today)+" USC");setText("targetRemain",money(Math.max(0,t-today))+" USC");
  setText("convCapital",money(state.capital));setText("convCapitalRp",uscRp(state.capital));setText("convToday",money(today));setText("convTodayRp",uscRp(today));setText("convBalance",money(b));setText("convBalanceRp",uscRp(b));
  const mt=t*30,mp=mt?Math.max(0,Math.min(100,p/mt*100)):0;
  setText("sideTarget",money(t)+" USC");setText("sideTargetPct",tp.toFixed(2)+"%");setStyle("sideTargetBar","width",tp+"%");
  setText("sideMonthly",money(mt)+" USC");setText("sideMonthlyPct",mp.toFixed(2)+"%");setStyle("sideMonthlyBar","width",mp+"%");
  const s=savings(),st=savingTarget(),sp=st?Math.max(0,Math.min(100,s/st*100)):0;
  setText("sideSaving",rp(s));setText("sideSavingTarget",rp(st));setStyle("sideSavingBar","width",sp+"%");setText("sideSavingPct",sp.toFixed(1)+"%");
  const m=currentMonth();setText("qProfit",money(state.trading.filter(x=>x.date?.slice(0,7)===m).reduce((a,x)=>a+number(x.profit),0))+" USC");setText("qDeposit",rp(cashIn(m)));setText("qWithdraw",rp(cashOut(m)));setText("qSaving",rp(savings(null,m)));
  renderDashboardTables();renderCharts();
}
function savingsMonthTotal(month){return state.saving.filter(x=>x.date?.slice(0,7)===month).reduce((a,x)=>a+number(x.amount),0)}
function renderDashboardTables(){
  const months=buildMonths();
  const el=$("dashboardMonthRows");
  if(!el)return;
  el.innerHTML=months.slice(0,4).map(m=>`<tr><td>${monthFmt(m.key)}</td><td>${money(m.open)}</td><td>${rp(m.inCash)}</td><td>${rp(m.outCash)}</td><td class="positive">${money(m.win)}</td><td class="negative">${money(m.loss)}</td><td class="${m.net>=0?"positive":"negative"}">${m.net>=0?"+":""}${money(m.net)}</td><td>${money(m.close)}</td></tr>`).join("")||`<tr><td colspan="8">Belum ada data.</td></tr>`;
}
function buildMonths(){
  const map={};
  const add=m=>{if(m&&!map[m])map[m]={key:m,win:0,loss:0,net:0,inCash:0,outCash:0,saving:0}};
  state.trading.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);const v=number(x.profit);if(v>=0)map[m].win+=v;else map[m].loss+=Math.abs(v);map[m].net+=v});
  state.cash.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);if(cashDirection(x.type)==="in")map[m].inCash+=number(x.amount);else map[m].outCash+=number(x.amount)});
  state.saving.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);map[m].saving+=number(x.amount)});
  const keys=Object.keys(map).sort();
  let bal=state.capital;
  return keys.map(k=>{const m=map[k],open=bal;bal+=m.net;return {...m,open,close:bal}}).reverse();
}
function renderCharts(){
  if(typeof Chart==="undefined")return;
  const labels=state.trading.map(x=>x.date.slice(5)),bal=[];let current=state.capital;state.trading.forEach(x=>{current+=number(x.profit);bal.push(current)});
  charts.equity?.destroy();charts.pl?.destroy();
  const eq=$("equityChart"),pl=$("plChart");if(!eq||!pl)return;
  charts.equity=new Chart(eq,{type:"line",data:{labels,datasets:[{data:bal,borderColor:"#25d4b4",backgroundColor:"rgba(37,212,180,.15)",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#fff",pointBorderColor:"#25d4b4"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"rgba(255,255,255,.10)"},ticks:{color:"#c7d8e7"}},x:{grid:{color:"rgba(255,255,255,.06)"},ticks:{color:"#c7d8e7"}}}}});
  charts.pl=new Chart(pl,{type:"bar",data:{labels,datasets:[{label:"Profit",data:state.trading.map(x=>number(x.profit)>0?number(x.profit):0),backgroundColor:"#19c899",borderRadius:3},{label:"Loss",data:state.trading.map(x=>number(x.profit)<0?number(x.profit):0),backgroundColor:"#f0526b",borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"rgba(255,255,255,.10)"},ticks:{color:"#c7d8e7"}},x:{grid:{color:"rgba(255,255,255,.06)"},ticks:{color:"#c7d8e7"}}}}});
}

function renderTradingPage(){
  const q=($("tradeSearch")?.value||"").toLowerCase();let bal=state.capital,winDays=0,lossDays=0;
  const all=state.trading.map((x,i)=>{const v=number(x.profit);bal+=v;if(v>=0)winDays++;else lossDays++;return {...x,index:i,run:bal}});
  const rows=all.filter(x=>!q||(`${x.date} ${x.note||""}`).toLowerCase().includes(q)).reverse();
  const body=$("tradeRows");
  if(body)body.innerHTML=rows.length?rows.map(x=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td class="${number(x.profit)>=0?"positive":"negative"}">${number(x.profit)>=0?"+":""}${money(x.profit)} USC</td><td>${money(x.run)} USC</td><td>${uscRp(x.profit)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editTrading(${x.index})">Edit</button><button class="row-delete" onclick="deleteTrading(${x.index})">Hapus</button></div></td></tr>`).join(""): `<tr><td colspan="7">Belum ada data trading.</td></tr>`;
  const p=profit();setText("tradePageProfit",(p>=0?"+":"")+money(p)+" USC");setText("tradeBalanceNow",money(balance())+" USC");setText("tradeWinDays",winDays);setText("tradeLossDays",lossDays);
}
function renderCashPage(){
  const q=($("cashSearch")?.value||"").toLowerCase();
  let rows=state.cash.map((x,i)=>({...x,index:i})).filter(x=>cashFilter==="all"||cashDirection(x.type)===cashFilter).filter(x=>!q||(`${x.date} ${x.type} ${x.note||""}`).toLowerCase().includes(q)).reverse();
  const body=$("cashRows");
  if(body)body.innerHTML=rows.length?rows.map(x=>{const dir=cashDirection(x.type);return `<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td><span class="type-badge ${dir}">${esc(x.type)}</span></td><td class="${dir==='in'?"positive":"negative"}">${dir==='in'?"+":"-"}${rp(x.amount)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editCash(${x.index})">Edit</button><button class="row-delete" onclick="deleteCash(${x.index})">Hapus</button></div></td></tr>`}).join(""): `<tr><td colspan="6">Belum ada transaksi cashflow.</td></tr>`;
  setText("cashPageIn",rp(cashIn()));setText("cashPageOut",rp(cashOut()));setText("cashPageNet",rp(cashIn()-cashOut()));
  document.querySelectorAll("[data-cash-filter]").forEach(b=>b.classList.toggle("active",b.dataset.cashFilter===cashFilter));
}
function renderSavingPage(){
  renderSavingBuckets();
  const active=savingFilter==="all"?null:savingFilter;
  const q=($("savingSearch")?.value||"").toLowerCase();
  const total=savings(active),targ=savingTarget(active),pct=targ?Math.min(100,total/targ*100):0;
  const rows=state.saving.map((x,i)=>({...x,index:i,bucket:getBucket(x.bucketId)})).filter(x=>!active||x.bucketId===active).filter(x=>!q||(`${x.date} ${x.bucket.name} ${x.note||""}`).toLowerCase().includes(q)).reverse();
  const body=$("savingRows");
  if(body)body.innerHTML=rows.length?rows.map(x=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td><span class="saving-chip">${esc(x.bucket.name)}</span></td><td class="positive">${rp(x.amount)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editSaving(${x.index})">Edit</button><button class="row-delete" onclick="deleteSaving(${x.index})">Hapus</button></div></td></tr>`).join(""): `<tr><td colspan="6">Belum ada data tabungan.</td></tr>`;
  setText("savingPageBalance",rp(total));setText("savingPageTarget",rp(targ));setText("savingPagePct",pct.toFixed(1)+"%");setStyle("savingPageBar","width",pct+"%");
  const selected=getBucket(savingFilter);
  if(selected){setText("savingSelectedLabel",selected.name);const targetInput=$("savingTargetInput");if(targetInput){targetInput.disabled=false;targetInput.value=selected.target}}else{setText("savingSelectedLabel","Semua Tabungan");const targetInput=$("savingTargetInput");if(targetInput){targetInput.disabled=true;targetInput.value=savingTarget()}}
  fillSavingSelect(selected?.id||state.savingBuckets[0]?.id||"");
}
function renderSavingBuckets(){
  const tabs=$("savingBucketTabs");if(!tabs)return;
  const all=[{id:"all",name:"Semua"},...state.savingBuckets];
  tabs.innerHTML=all.map(b=>`<button type="button" class="saving-tab ${savingFilter===b.id?"active":""}" data-saving-filter="${esc(b.id)}">${esc(b.name)}</button>`).join("");
  tabs.querySelectorAll("[data-saving-filter]").forEach(btn=>btn.addEventListener("click",()=>{savingFilter=btn.dataset.savingFilter;renderSavingPage()}));
}
function fillSavingSelect(preferred){
  const el=$("savingBucket");if(!el)return;const current=preferred||el.value;el.innerHTML=state.savingBuckets.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join("");el.value=state.savingBuckets.some(b=>b.id===current)?current:(state.savingBuckets[0]?.id||"");
}

function getMonthData(key){
  const trades=state.trading.filter(x=>x.date?.slice(0,7)===key);
  const cash=state.cash.filter(x=>x.date?.slice(0,7)===key);
  const saves=state.saving.filter(x=>x.date?.slice(0,7)===key);
  const netProfit=trades.reduce((a,x)=>a+number(x.profit),0);
  const inCash=cash.filter(x=>cashDirection(x.type)==="in").reduce((a,x)=>a+number(x.amount),0);
  const outCash=cash.filter(x=>cashDirection(x.type)==="out").reduce((a,x)=>a+number(x.amount),0);
  const savingTotal=saves.reduce((a,x)=>a+number(x.amount),0);
  const priorProfit=state.trading.filter(x=>x.date?.slice(0,7)<key).reduce((a,x)=>a+number(x.profit),0);
  const open=state.capital+priorProfit,close=open+netProfit;
  const activities=[
    ...trades.map(x=>({date:x.date,kind:"Trading",profit:number(x.profit),inCash:0,outCash:0,saving:0,note:x.note||"-"})),
    ...cash.map(x=>({date:x.date,kind:x.type,profit:0,inCash:cashDirection(x.type)==="in"?number(x.amount):0,outCash:cashDirection(x.type)==="out"?number(x.amount):0,saving:0,note:x.note||"-"})),
    ...saves.map(x=>({date:x.date,kind:getBucket(x.bucketId)?.name||"Tabungan",profit:0,inCash:0,outCash:0,saving:number(x.amount),note:x.note||"-"}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  return {trades,cash,saves,netProfit,inCash,outCash,savingTotal,open,close,activities};
}
function renderMonthlyPage(){
  const picker=$("monthlyPicker");if(picker){if(!picker.value)picker.value=selectedMonth;selectedMonth=picker.value||selectedMonth}
  const m=getMonthData(selectedMonth);
  setText("monthlySelectedLabel",monthFmt(selectedMonth));setText("monthlyNet",(m.netProfit>=0?"+":"")+money(m.netProfit)+" USC");setText("monthlyCashIn",rp(m.inCash));setText("monthlyCashOut",rp(m.outCash));setText("monthlyCashNet",rp(m.inCash-m.outCash));setText("monthlySaving",rp(m.savingTotal));
  setText("monthOpenBalance",money(m.open)+" USC");setText("monthCloseBalance",money(m.close)+" USC");setText("monthWinDays",m.trades.filter(x=>number(x.profit)>=0).length);setText("monthLossDays",m.trades.filter(x=>number(x.profit)<0).length);setText("monthTargetDays",m.trades.filter(x=>number(x.profit)>=target()).length);setText("monthLoggedDays",new Set([...m.trades,...m.cash,...m.saves].map(x=>x.date)).size);setText("monthActivityCount",m.activities.length);
  const body=$("monthRows");
  if(body)body.innerHTML=m.activities.length?m.activities.map(a=>`<tr><td>${dateFmt(a.date)}</td><td>${esc(a.kind)}</td><td class="${a.profit<0?"negative":a.profit>0?"positive":""}">${a.profit?((a.profit>0?"+":"")+money(a.profit)+" USC"):"—"}</td><td class="positive">${a.inCash?"+"+rp(a.inCash):"—"}</td><td class="negative">${a.outCash?"-"+rp(a.outCash):"—"}</td><td>${a.saving?rp(a.saving):"—"}</td><td>${esc(a.note)}</td></tr>`).join(""): `<tr><td colspan="7">Tidak ada aktivitas pada ${monthFmt(selectedMonth)}.</td></tr>`;
}

function resetForm(type){
  if(type==="trading"){$("tradeEditIndex").value="";$('tradeFormTitle').textContent="Tambah Trading Harian";$("tradeDate").value=isoToday();$("tradeProfit").value="";$("tradeNote").value=""}
  if(type==="cash"){$("cashEditIndex").value="";$('cashFormTitle').textContent="Tambah Uang Masuk / Keluar";$("cashDate").value=isoToday();$("cashType").value="Deposit";$("cashAmount").value="";$("cashNote").value=""}
  if(type==="saving"){$("savingEditIndex").value="";$('savingFormTitle').textContent="Tambah Tabungan";$("savingDate").value=isoToday();$("savingAmount").value="";$("savingNote").value="";fillSavingSelect(savingFilter!=="all"?savingFilter:state.savingBuckets[0]?.id||"")}
}

let modalAction=null;
function openModal({title="Konfirmasi",message="",kicker="Dashboard",icon="✦",confirmText="Lanjutkan",cancelText="Batal",showCancel=true,options=null,onConfirm=null}){
  if(!$('appModal'))return onConfirm?.();
  $("modalTitle").textContent=title;$("modalMessage").textContent=message;$("modalKicker").textContent=kicker;$("modalIcon").textContent=icon;$("modalConfirm").textContent=confirmText;$("modalCancel").textContent=cancelText;
  $("modalCancel").style.display=showCancel?"":"none";$("modalActions").style.display=options?"none":"flex";
  const box=$("modalOptions");box.innerHTML="";box.style.display=options?"grid":"none";modalAction=onConfirm;
  if(options){options.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="modal-option";b.textContent=o.label;b.addEventListener("click",()=>{closeModal();o.action()});box.appendChild(b)})}
  $("appModal").classList.add("open");$("appModal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");if(!options)setTimeout(()=>$('modalConfirm')?.focus(),30);
}
function closeModal(){modalAction=null;if($("appModal")){$("appModal").classList.remove("open");$("appModal").setAttribute("aria-hidden","true")}document.body.classList.remove("modal-open")}
function notify(message,title="Berhasil",icon="✓"){openModal({title,message,kicker:"Info",icon,confirmText:"Mengerti",showCancel:false})}
function quickAdd(){openModal({title:"Tambah Data",message:"Pilih jenis data yang ingin kamu catat.",kicker:"Input Cepat",icon:"＋",options:[{label:"📈 Trading Harian · USC",action:()=>{go("trading");resetForm("trading");$("tradeProfit")?.focus()}},{label:"↔ Uang Masuk / Keluar · IDR",action:()=>{go("cashflow");resetForm("cash");$("cashAmount")?.focus()}},{label:"🐷 Tabungan · IDR",action:()=>{go("saving");resetForm("saving");$("savingAmount")?.focus()}}]})}

function editTrading(i){go("trading");const x=state.trading[i];$("tradeEditIndex").value=i;$("tradeFormTitle").textContent="Edit Trading Harian";$("tradeDate").value=x.date;$("tradeProfit").value=x.profit;$("tradeNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function editCash(i){go("cashflow");const x=state.cash[i];$("cashEditIndex").value=i;$("cashFormTitle").textContent="Edit Uang Masuk / Keluar";$("cashDate").value=x.date;$("cashType").value=x.type;$("cashAmount").value=x.amount;$("cashNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function editSaving(i){go("saving");const x=state.saving[i];savingFilter=x.bucketId||state.savingBuckets[0]?.id||"all";renderSavingPage();$("savingEditIndex").value=i;$("savingFormTitle").textContent="Edit Tabungan";$("savingDate").value=x.date;fillSavingSelect(x.bucketId);$("savingBucket").value=x.bucketId;$("savingAmount").value=x.amount;$("savingNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function deleteTrading(i){openModal({title:"Hapus data trading?",message:"Data ini akan dihapus dari riwayat Trading Harian.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.trading.splice(i,1);save();notify("Data trading berhasil dihapus.")}})}
function deleteCash(i){openModal({title:"Hapus transaksi?",message:"Transaksi uang masuk/keluar ini akan dihapus.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.cash.splice(i,1);save();notify("Transaksi berhasil dihapus.")}})}
function deleteSaving(i){openModal({title:"Hapus tabungan?",message:"Catatan tabungan ini akan dihapus.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.saving.splice(i,1);save();notify("Data tabungan berhasil dihapus.")}})}
function submitTrading(e){e.preventDefault();const i=$("tradeEditIndex").value===""?null:Number($("tradeEditIndex").value),date=$("tradeDate").value,p=Number($("tradeProfit").value),note=$("tradeNote").value.trim();if(!date||!Number.isFinite(p)){notify("Tanggal dan profit/loss wajib diisi.","Data belum lengkap","!");return}const item={date,profit:p,note};if(i===null)state.trading.push(item);else state.trading[i]=item;resetForm("trading");save()}
function submitCash(e){e.preventDefault();const i=$("cashEditIndex").value===""?null:Number($("cashEditIndex").value),date=$("cashDate").value,type=$("cashType").value,amt=Number($("cashAmount").value),note=$("cashNote").value.trim();if(!date||!Number.isFinite(amt)||amt<0){notify("Tanggal dan nominal IDR wajib diisi.","Data belum lengkap","!");return}const item={date,type,amount:Math.abs(amt),note};if(i===null)state.cash.push(item);else state.cash[i]=item;resetForm("cash");save()}
function submitSaving(e){e.preventDefault();const i=$("savingEditIndex").value===""?null:Number($("savingEditIndex").value),date=$("savingDate").value,bucketId=$("savingBucket").value,amt=Number($("savingAmount").value),note=$("savingNote").value.trim();if(!date||!bucketId||!Number.isFinite(amt)||amt<0){notify("Jenis tabungan, tanggal, dan nominal wajib diisi.","Data belum lengkap","!");return}const item={date,bucketId,amount:Math.abs(amt),note:note||"Tabungan"};if(i===null)state.saving.push(item);else state.saving[i]=item;savingFilter=bucketId;resetForm("saving");save()}
function setSavingTarget(e){e.preventDefault();const id=$("savingBucket")?.value||state.savingBuckets[0]?.id;const v=Number($("savingTargetInput").value);const b=getBucket(id);if(!b||!Number.isFinite(v)||v<0){notify("Target tabungan harus berupa nominal IDR yang valid.","Target belum valid","!");return}b.target=v;state.savingTarget=savingTarget();save()}
function addSavingBucket(){const input=$("savingBucketName"),name=input?.value.trim();if(!name){notify("Masukkan nama tabungan terlebih dahulu.","Nama belum diisi","!");return}const base=slug(name);let id=base,n=2;while(state.savingBuckets.some(b=>b.id===id))id=`${base}-${n++}`;state.savingBuckets.push({id,name,target:0});savingFilter=id;state.savingTarget=savingTarget();if(input)input.value="";save()}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="trading-savings-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function resetDemo(){openModal({title:"Reset dashboard?",message:"Semua data saat ini akan diganti dengan data demo. Tindakan ini tidak bisa dibatalkan.",kicker:"Peringatan",icon:"↻",confirmText:"Reset",onConfirm:()=>{localStorage.removeItem(KEY);state=normalizeState(defaultState());savingFilter="all";selectedMonth=currentMonth();localStorage.setItem(KEY,JSON.stringify(state));renderAll();resetForm("trading");resetForm("cash");resetForm("saving");notify("Dashboard kembali ke data demo.")}})}
function renderAll(){renderHeader();renderDashboard();renderTradingPage();renderCashPage();renderSavingPage();renderMonthlyPage();}

// Navigation
 document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
$("quickAdd")?.addEventListener("click",quickAdd);$("exportBtn")?.addEventListener("click",exportData);$("resetBtn")?.addEventListener("click",resetDemo);$("mobileMenu")?.addEventListener("click",()=>$("sidebar")?.classList.toggle("open"));
$("tradeForm")?.addEventListener("submit",submitTrading);$("cashForm")?.addEventListener("submit",submitCash);$("savingForm")?.addEventListener("submit",submitSaving);$("savingTargetBtn")?.addEventListener("click",setSavingTarget);$("savingBucketAdd")?.addEventListener("click",addSavingBucket);
$("tradeCancel")?.addEventListener("click",()=>resetForm("trading"));$("cashCancel")?.addEventListener("click",()=>resetForm("cash"));$("savingCancel")?.addEventListener("click",()=>resetForm("saving"));
$("tradeNewTop")?.addEventListener("click",()=>{resetForm("trading");$("tradeDate")?.focus()});$("cashNewTop")?.addEventListener("click",()=>{resetForm("cash");$("cashDate")?.focus()});$("savingNewTop")?.addEventListener("click",()=>{resetForm("saving");$("savingAmount")?.focus()});
$("savingBucket")?.addEventListener("change",()=>{if($("savingBucket").value){savingFilter=$("savingBucket").value;renderSavingPage()}});
$("monthlyPicker")?.addEventListener("change",e=>{selectedMonth=e.target.value||currentMonth();renderMonthlyPage()});
["tradeSearch","cashSearch","savingSearch"].forEach(id=>$(id)?.addEventListener("input",renderAll));
document.querySelectorAll("[data-cash-filter]").forEach(b=>b.addEventListener("click",()=>{cashFilter=b.dataset.cashFilter;renderCashPage()}));
$("modalConfirm")?.addEventListener("click",()=>{const fn=modalAction;if(fn){closeModal();fn()}});$("modalCancel")?.addEventListener("click",closeModal);$("modalX")?.addEventListener("click",closeModal);document.querySelector("[data-modal-close]")?.addEventListener("click",closeModal);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("appModal")?.classList.contains("open"))closeModal()});

resetForm("trading");resetForm("cash");resetForm("saving");if($("monthlyPicker"))$("monthlyPicker").value=selectedMonth;renderAll();
window.go=go;window.editTrading=editTrading;window.editCash=editCash;window.editSaving=editSaving;window.deleteTrading=deleteTrading;window.deleteCash=deleteCash;window.deleteSaving=deleteSaving;
