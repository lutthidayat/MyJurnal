const KEY="tradeSaveV7";
const OLD_KEYS=["tradeSaveV6","tradeSaveV5","tradeSaveV4","tradeSaveV3","tradeSaveV2"];
const RATE=16100, USC_PER_USD=100, TARGET_RATE=.05;
const $=id=>document.getElementById(id);
const number=x=>Number(x||0);
const money=x=>number(x).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const usd=x=>"$ "+number(x/USC_PER_USD).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const rp=x=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0,maximumFractionDigits:0}).format(number(x));
const uscRp=x=>rp(number(x)/USC_PER_USD*RATE);
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
const isoToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const dateFmt=d=>{if(!d)return"-";const x=new Date(d+"T00:00:00");return x.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"2-digit"})};
const monthFmt=m=>{if(!m)return"-";const [y,mo]=m.split("-").map(Number);return new Date(y,mo-1,1).toLocaleDateString("id-ID",{month:"long",year:"numeric"})};

function defaultState(){return {capital:1006,trading:[{date:"2026-09-14",profit:5.7,note:"Profit awal"}],cash:[],saving:[],savingTarget:322000}};
function loadState(){
  let saved=null,source="";
  for(const k of [KEY,...OLD_KEYS]){
    try{const raw=localStorage.getItem(k);if(raw){saved=JSON.parse(raw);source=k;break}}catch(e){}
  }
  const s=saved||defaultState();
  s.capital=number(s.capital)||1006;s.trading=Array.isArray(s.trading)?s.trading:[];s.cash=Array.isArray(s.cash)?s.cash:[];s.saving=Array.isArray(s.saving)?s.saving:[];s.savingTarget=number(s.savingTarget)||322000;
  if(source==="tradeSaveV3"||source==="tradeSaveV2"){
    // old V2/V3 cashflow & savings were USC; convert to IDR
    s.cash=s.cash.map(x=>({...x,amount:number(x.amount)*161}));s.saving=s.saving.map(x=>({...x,amount:number(x.amount)*161}));s.savingTarget=number(s.savingTarget)*161;
  }
  localStorage.setItem(KEY,JSON.stringify(s));
  return s;
}
let state=loadState();let charts={equity:null,pl:null};let currentPage="dashboard";

function profit(){return state.trading.reduce((a,x)=>a+number(x.profit),0)}
function balance(){return state.capital+profit()}
function target(){return state.capital*TARGET_RATE}
function todayProfit(){const d=isoToday();return state.trading.filter(x=>x.date===d).reduce((a,x)=>a+number(x.profit),0)}
function savings(){return state.saving.reduce((a,x)=>a+number(x.amount),0)}
function cashIn(){return state.cash.filter(x=>/deposit|masuk/i.test(x.type)).reduce((a,x)=>a+number(x.amount),0)}
function cashOut(){return state.cash.filter(x=>/withdraw|keluar/i.test(x.type)).reduce((a,x)=>a+number(x.amount),0)}
function save(){localStorage.setItem(KEY,JSON.stringify(state));const el=$("saveIndicator");if(el){el.textContent="● Data tersimpan";el.style.color="#159b79"}renderAll()}
function flashSaved(){const el=$("saveIndicator");if(!el)return;el.textContent="● Tersimpan";el.style.color="#159b79";setTimeout(()=>{el.textContent="● Data tersimpan"},1200)}

function go(page){
  currentPage=page;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  const titles={dashboard:["Dashboard","Ringkasan trading, cashflow, tabungan, dan progres target."],trading:["Trading Harian","Input profit/loss harian dan lihat saldo berjalan dalam USC."],cashflow:["Uang Masuk / Keluar","Catat deposit, withdraw, pemasukan, dan pengeluaran dalam IDR."],saving:["Tabungan","Catat tabungan dalam Rupiah dan pantau target."],monthly:["Rekap Bulanan","Lihat performa trading dan arus dana secara bulanan."]};
  $("pageTitle").textContent=titles[page][0];$("pageSubtitle").textContent=titles[page][1];
  window.scrollTo({top:0,behavior:"smooth"});
  if(window.innerWidth<980)$("sidebar").classList.remove("open");
}

function renderHeader(){
  const d=new Date();$("todayLabel").textContent=d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
}
function renderDashboard(){
  const p=profit(),b=balance(),t=target(),tp=t?Math.max(0,Math.min(100,p/t*100)):0,today=todayProfit();
  $("kCapital").textContent=money(state.capital);$("kCapitalUsd").textContent=usd(state.capital);$("kCapitalRp").textContent=uscRp(state.capital);
  $("kProfit").textContent=(p>=0?"+":"")+money(p);$("kProfitUsd").textContent=usd(p);$("kProfitRp").textContent=uscRp(p);
  $("kTarget").textContent=money(t);$("kTargetPct").textContent=tp.toFixed(2)+"%";$("kTargetBar").style.width=tp+"%";
  $("kBalance").textContent=money(b);$("kBalanceUsd").textContent=usd(b);$("kBalanceRp").textContent=uscRp(b);
  $("todayProfit").textContent=money(today)+" USC";$("targetRemain").textContent=money(Math.max(0,t-today))+" USC";
  $("convCapital").textContent=money(state.capital);$("convCapitalUsd").textContent=number(state.capital/100).toFixed(2);$("convCapitalRp").textContent=uscRp(state.capital);
  $("convToday").textContent=money(today);$("convTodayUsd").textContent=number(today/100).toFixed(2);$("convTodayRp").textContent=uscRp(today);
  $("convProfit").textContent=money(p);$("convProfitUsd").textContent=number(p/100).toFixed(2);$("convProfitRp").textContent=uscRp(p);
  $("convBalance").textContent=money(b);$("convBalanceUsd").textContent=number(b/100).toFixed(2);$("convBalanceRp").textContent=uscRp(b);
  $("sideTarget").textContent=money(t)+" USC";$("sideTargetPct").textContent=tp.toFixed(2)+"%";$("sideTargetBar").style.width=tp+"%";
  const mt=t*30,mp=mt?Math.max(0,Math.min(100,p/mt*100)):0;$("sideMonthly").textContent=money(mt)+" USC";$("sideMonthlyPct").textContent=mp.toFixed(2)+"%";$("sideMonthlyBar").style.width=mp+"%";
  const s=savings(),sp=state.savingTarget?Math.max(0,Math.min(100,s/state.savingTarget*100)):0;$("sideSaving").textContent=rp(s);$("sideSavingTarget").textContent=rp(state.savingTarget);$("sideSavingBar").style.width=sp+"%";$("sideSavingPct").textContent=sp.toFixed(1)+"%";
  $("qProfit").textContent=money(today)+" USC";$("qDeposit").textContent=rp(cashIn());$("qWithdraw").textContent=rp(cashOut());$("qSaving").textContent=rp(s);
  renderDashboardTables();renderCharts();
}
function renderDashboardTables(){
  let bal=state.capital;
  const tradeWithBal=state.trading.map((x,i)=>{bal+=number(x.profit);return {...x,index:i,run:bal}});
  $("dashTradeRows").innerHTML=tradeWithBal.slice(-7).map((x,i)=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td class="${number(x.profit)>=0?"positive":"negative"}">${number(x.profit)>=0?"+":""}${money(x.profit)}</td><td>${money(x.run)} USC</td><td>${esc(x.note||"-")}</td></tr>`).join("")||`<tr><td colspan="5">Belum ada data trading.</td></tr>`;
  $("dashCashRows").innerHTML=state.cash.slice(-7).reverse().map((x,i)=>`<tr><td>${i+1}</td><td>${dateFmt(x.date)}</td><td>${esc(x.type)}</td><td>${rp(x.amount)}</td><td>${esc(x.note||"-")}</td></tr>`).join("")||`<tr><td colspan="5">Belum ada transaksi.</td></tr>`;
  $("dashSavingRows").innerHTML=state.saving.slice(-7).reverse().map((x,i)=>`<tr><td>${i+1}</td><td>${dateFmt(x.date)}</td><td>${rp(x.amount)}</td><td>${esc(x.note||"-")}</td></tr>`).join("")||`<tr><td colspan="4">Belum ada tabungan.</td></tr>`;
  const months=buildMonths();$("dashboardMonthRows").innerHTML=months.slice(0,4).map(m=>`<tr><td>${monthFmt(m.key)}</td><td>${money(m.open)}</td><td>${rp(m.inCash)}</td><td>${rp(m.outCash)}</td><td class="positive">${money(m.win)}</td><td class="negative">${money(m.loss)}</td><td class="${m.net>=0?"positive":"negative"}">${m.net>=0?"+":""}${money(m.net)}</td><td>${money(m.close)}</td></tr>`).join("")||`<tr><td colspan="8">Belum ada data.</td></tr>`;
}
function buildMonths(){
  const map={};
  const add=m=>{if(!map[m])map[m]={key:m,win:0,loss:0,net:0,inCash:0,outCash:0,saving:0}};
  state.trading.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);const v=number(x.profit);if(v>=0)map[m].win+=v;else map[m].loss+=Math.abs(v);map[m].net+=v});
  state.cash.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);if(/deposit|masuk/i.test(x.type))map[m].inCash+=number(x.amount);else map[m].outCash+=number(x.amount)});
  state.saving.forEach(x=>{const m=x.date?.slice(0,7);if(!m)return;add(m);map[m].saving+=number(x.amount)});
  const keys=Object.keys(map).sort();let bal=state.capital;return keys.map(k=>{const m=map[k],open=bal;bal+=m.net;return {...m,open,close:bal}}).reverse();
}
function renderCharts(){
  if(typeof Chart==="undefined")return;
  const labels=state.trading.map(x=>x.date.slice(5)),bal=[];let current=state.capital;state.trading.forEach(x=>{current+=number(x.profit);bal.push(current)});
  charts.equity?.destroy();charts.pl?.destroy();
  charts.equity=new Chart($("equityChart"),{type:"line",data:{labels,datasets:[{data:bal,borderColor:"#25d4b4",backgroundColor:"rgba(37,212,180,.15)",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#fff",pointBorderColor:"#25d4b4"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"rgba(255,255,255,.10)"},ticks:{color:"#c7d8e7"}},x:{grid:{color:"rgba(255,255,255,.06)"},ticks:{color:"#c7d8e7"}}}}});
  charts.pl=new Chart($("plChart"),{type:"bar",data:{labels,datasets:[{label:"Profit",data:state.trading.map(x=>number(x.profit)>0?number(x.profit):0),backgroundColor:"#19c899",borderRadius:3},{label:"Loss",data:state.trading.map(x=>number(x.profit)<0?number(x.profit):0),backgroundColor:"#f0526b",borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"rgba(255,255,255,.10)"},ticks:{color:"#c7d8e7"}},x:{grid:{color:"rgba(255,255,255,.06)"},ticks:{color:"#c7d8e7"}}}}});
}
function renderTradingPage(){
  const q=$("tradeSearch").value.toLowerCase();let bal=state.capital;let winDays=0,lossDays=0;
  const rows=state.trading.map((x,i)=>{const v=number(x.profit);bal+=v;if(v>=0)winDays++;else lossDays++;return {...x,index:i,run:bal}}).filter(x=>!q||(`${x.date} ${x.note||""}`).toLowerCase().includes(q));
  $("tradeRows").innerHTML=rows.length?rows.reverse().map(x=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td class="${x.profit>=0?"positive":"negative"}">${x.profit>=0?"+":""}${money(x.profit)} USC</td><td>${money(x.run)} USC</td><td>${uscRp(x.profit)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editTrading(${x.index})">Edit</button><button class="row-delete" onclick="deleteTrading(${x.index})">Hapus</button></div></td></tr>`).join(""): `<tr><td colspan="7">Belum ada data trading.</td></tr>`;
  $("tradePageProfit").textContent=(profit()>=0?"+":"")+money(profit())+" USC";$("tradeWinDays").textContent=winDays;$("tradeLossDays").textContent=lossDays;
}
function renderCashPage(){
  const q=$("cashSearch").value.toLowerCase();let rows=state.cash.map((x,i)=>({...x,index:i})).filter(x=>!q||(`${x.date} ${x.type} ${x.note||""}`).toLowerCase().includes(q));
  $("cashRows").innerHTML=rows.length?rows.reverse().map(x=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td>${esc(x.type)}</td><td>${rp(x.amount)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editCash(${x.index})">Edit</button><button class="row-delete" onclick="deleteCash(${x.index})">Hapus</button></div></td></tr>`).join(""):`<tr><td colspan="6">Belum ada transaksi cashflow.</td></tr>`;
  $("cashPageIn").textContent=rp(cashIn());$("cashPageOut").textContent=rp(cashOut());$("cashPageNet").textContent=rp(cashIn()-cashOut());
}
function renderSavingPage(){
  const q=$("savingSearch").value.toLowerCase();let s=savings(),pct=state.savingTarget?Math.min(100,s/state.savingTarget*100):0;
  let rows=state.saving.map((x,i)=>({...x,index:i})).filter(x=>!q||(`${x.date} ${x.note||""}`).toLowerCase().includes(q));
  $("savingRows").innerHTML=rows.length?rows.reverse().map(x=>`<tr><td>${x.index+1}</td><td>${dateFmt(x.date)}</td><td>${rp(x.amount)}</td><td>${esc(x.note||"-")}</td><td><div class="action-stack"><button class="row-edit" onclick="editSaving(${x.index})">Edit</button><button class="row-delete" onclick="deleteSaving(${x.index})">Hapus</button></div></td></tr>`).join(""):`<tr><td colspan="5">Belum ada tabungan.</td></tr>`;
  $("savingPageBalance").textContent=rp(s);$("savingPageTarget").textContent="dari target "+rp(state.savingTarget);$("savingPageBar").style.width=pct+"%";$("savingPagePct").textContent=pct.toFixed(1)+"%";$("savingTargetInput").value=state.savingTarget;
}
function renderMonthlyPage(){
  const months=buildMonths();$("monthRows").innerHTML=months.length?months.map(m=>`<tr><td>${monthFmt(m.key)}</td><td>${money(m.open)}</td><td class="positive">${money(m.win)}</td><td class="negative">${money(m.loss)}</td><td class="${m.net>=0?"positive":"negative"}">${m.net>=0?"+":""}${money(m.net)}</td><td>${money(m.close)}</td><td>${rp(m.inCash)}</td><td>${rp(m.outCash)}</td><td>${rp(m.saving)}</td></tr>`).join(""):`<tr><td colspan="9">Belum ada data.</td></tr>`;
  const todayMonth=isoToday().slice(0,7),monthTrading=state.trading.filter(x=>x.date.slice(0,7)===todayMonth),m=months.find(x=>x.key===todayMonth)||{net:0};
  $("monthlyNet").textContent=(m.net>=0?"+":"")+money(m.net)+" USC";$("monthlyTrades").textContent=monthTrading.length;$("monthlyCashNet").textContent=rp(cashIn()-cashOut());$("monthlySaving").textContent=rp(savings());
  $("monthWinDays").textContent=monthTrading.filter(x=>number(x.profit)>=0).length;$("monthLossDays").textContent=monthTrading.filter(x=>number(x.profit)<0).length;$("monthTargetDays").textContent=monthTrading.filter(x=>number(x.profit)>=target()).length;$("monthLoggedDays").textContent=new Set(monthTrading.map(x=>x.date)).size;
}
function resetForm(type){
  if(type==="trading"){$("tradeEditIndex").value="";$("tradeFormTitle").textContent="Tambah Trading Harian";$("tradeDate").value=isoToday();$("tradeProfit").value="";$("tradeNote").value=""}
  if(type==="cash"){$("cashEditIndex").value="";$("cashFormTitle").textContent="Tambah Uang Masuk / Keluar";$("cashDate").value=isoToday();$("cashType").value="Deposit";$("cashAmount").value="";$("cashNote").value=""}
  if(type==="saving"){$("savingEditIndex").value="";$("savingFormTitle").textContent="Tambah Tabungan";$("savingDate").value=isoToday();$("savingAmount").value="";$("savingNote").value=""}
}
let modalAction=null;
function openModal({title="Konfirmasi",message="",kicker="Dashboard",icon="✦",confirmText="Lanjutkan",cancelText="Batal",showCancel=true,options=null,onConfirm=null}){
  $("modalTitle").textContent=title;$("modalMessage").textContent=message;$("modalKicker").textContent=kicker;$("modalIcon").textContent=icon;$("modalConfirm").textContent=confirmText;$("modalCancel").textContent=cancelText;
  $("modalCancel").style.display=showCancel?"":"none";$("modalActions").style.display=options?"none":"flex";
  const box=$("modalOptions");box.innerHTML="";box.style.display=options?"grid":"none";
  modalAction=onConfirm;
  if(options){options.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="modal-option";b.textContent=o.label;b.addEventListener("click",()=>{closeModal();o.action()});box.appendChild(b)})}
  $("appModal").classList.add("open");$("appModal").setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
  if(!options)setTimeout(()=>$("modalConfirm").focus(),30);
}
function closeModal(){modalAction=null;$("appModal").classList.remove("open");$("appModal").setAttribute("aria-hidden","true");document.body.classList.remove("modal-open")}
function notify(message,title="Berhasil",icon="✓"){openModal({title,message,kicker:"Info",icon,confirmText:"Mengerti",showCancel:false})}
function quickAdd(){openModal({title:"Tambah Data",message:"Pilih jenis data yang ingin kamu catat.",kicker:"Input Cepat",icon:"＋",options:[
  {label:"📈 Trading Harian · USC",action:()=>{go("trading");resetForm("trading");$("tradeProfit").focus()}},
  {label:"↔ Uang Masuk / Keluar · IDR",action:()=>{go("cashflow");resetForm("cash");$("cashAmount").focus()}},
  {label:"🐷 Tabungan · IDR",action:()=>{go("saving");resetForm("saving");$("savingAmount").focus()}}
]})}
function editTrading(i){go("trading");const x=state.trading[i];$("tradeEditIndex").value=i;$("tradeFormTitle").textContent="Edit Trading Harian";$("tradeDate").value=x.date;$("tradeProfit").value=x.profit;$("tradeNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function editCash(i){go("cashflow");const x=state.cash[i];$("cashEditIndex").value=i;$("cashFormTitle").textContent="Edit Uang Masuk / Keluar";$("cashDate").value=x.date;$("cashType").value=x.type;$("cashAmount").value=x.amount;$("cashNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function editSaving(i){go("saving");const x=state.saving[i];$("savingEditIndex").value=i;$("savingFormTitle").textContent="Edit Tabungan";$("savingDate").value=x.date;$("savingAmount").value=x.amount;$("savingNote").value=x.note||"";window.scrollTo({top:0,behavior:"smooth"})}
function deleteTrading(i){openModal({title:"Hapus data trading?",message:"Data ini akan dihapus dari riwayat Trading Harian.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.trading.splice(i,1);save();notify("Data trading berhasil dihapus.")}})}
function deleteCash(i){openModal({title:"Hapus transaksi?",message:"Transaksi uang masuk/keluar ini akan dihapus.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.cash.splice(i,1);save();notify("Transaksi berhasil dihapus.")}})}
function deleteSaving(i){openModal({title:"Hapus tabungan?",message:"Catatan tabungan ini akan dihapus.",kicker:"Konfirmasi",icon:"⌫",confirmText:"Hapus",onConfirm:()=>{state.saving.splice(i,1);save();notify("Data tabungan berhasil dihapus.")}})}
function submitTrading(e){e.preventDefault();const i=$("tradeEditIndex").value===""?null:Number($("tradeEditIndex").value),date=$("tradeDate").value,p=Number($("tradeProfit").value),note=$("tradeNote").value.trim();if(!date||!Number.isFinite(p)){notify("Tanggal dan profit/loss wajib diisi.","Data belum lengkap","!");return}const item={date,profit:p,note};if(i===null)state.trading.push(item);else state.trading[i]=item;resetForm("trading");save();flashSaved()}
function submitCash(e){e.preventDefault();const i=$("cashEditIndex").value===""?null:Number($("cashEditIndex").value),date=$("cashDate").value,type=$("cashType").value,amt=Number($("cashAmount").value),note=$("cashNote").value.trim();if(!date||!Number.isFinite(amt)||amt<0){notify("Tanggal dan nominal IDR wajib diisi.","Data belum lengkap","!");return}const item={date,type,amount:Math.abs(amt),note};if(i===null)state.cash.push(item);else state.cash[i]=item;resetForm("cash");save();flashSaved()}
function submitSaving(e){e.preventDefault();const i=$("savingEditIndex").value===""?null:Number($("savingEditIndex").value),date=$("savingDate").value,amt=Number($("savingAmount").value),note=$("savingNote").value.trim();if(!date||!Number.isFinite(amt)||amt<0){notify("Tanggal dan nominal tabungan wajib diisi.","Data belum lengkap","!");return}const item={date,amount:Math.abs(amt),note:note||"Tabungan"};if(i===null)state.saving.push(item);else state.saving[i]=item;resetForm("saving");save();flashSaved()}
function setSavingTarget(e){e.preventDefault();const v=Number($("savingTargetInput").value);if(!Number.isFinite(v)||v<0){notify("Target tabungan harus berupa nominal IDR yang valid.","Target belum valid","!");return}state.savingTarget=v;save();flashSaved()}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="trading-savings-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function resetDemo(){openModal({title:"Reset dashboard?",message:"Semua data saat ini akan diganti dengan data demo. Tindakan ini tidak bisa dibatalkan.",kicker:"Peringatan",icon:"↻",confirmText:"Reset",onConfirm:()=>{localStorage.removeItem(KEY);state=defaultState();localStorage.setItem(KEY,JSON.stringify(state));renderAll();resetForm("trading");resetForm("cash");resetForm("saving");notify("Dashboard kembali ke data demo.")}})}
function renderAll(){renderHeader();renderDashboard();renderTradingPage();renderCashPage();renderSavingPage();renderMonthlyPage();flashSaved()}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
$("quickAdd").addEventListener("click",quickAdd);$("exportBtn").addEventListener("click",exportData);$("resetBtn").addEventListener("click",resetDemo);$("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("tradeForm").addEventListener("submit",submitTrading);$("cashForm").addEventListener("submit",submitCash);$("savingForm").addEventListener("submit",submitSaving);$("savingTargetBtn").addEventListener("click",setSavingTarget);
$("tradeCancel").addEventListener("click",()=>resetForm("trading"));$("cashCancel").addEventListener("click",()=>resetForm("cash"));$("savingCancel").addEventListener("click",()=>resetForm("saving"));
$("tradeNewTop").addEventListener("click",()=>{resetForm("trading");$("tradeDate").focus()});$("cashNewTop").addEventListener("click",()=>{resetForm("cash");$("cashDate").focus()});$("savingNewTop").addEventListener("click",()=>{resetForm("saving");$("savingDate").focus()});
["tradeSearch","cashSearch","savingSearch"].forEach(id=>$(id).addEventListener("input",renderAll));
$("modalConfirm").addEventListener("click",()=>{const fn=modalAction;if(fn){closeModal();fn()}});
$("modalCancel").addEventListener("click",closeModal);$("modalX").addEventListener("click",closeModal);document.querySelector("[data-modal-close]").addEventListener("click",closeModal);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("appModal").classList.contains("open"))closeModal()});

resetForm("trading");resetForm("cash");resetForm("saving");renderAll();
window.go=go;window.editTrading=editTrading;window.editCash=editCash;window.editSaving=editSaving;window.deleteTrading=deleteTrading;window.deleteCash=deleteCash;window.deleteSaving=deleteSaving;
