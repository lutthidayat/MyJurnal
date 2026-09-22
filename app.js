const KEY="tradeSaveV3",RATE=16100,USC_PER_USD=100,TARGET_RATE=.05;
const $=id=>document.getElementById(id);
let state=JSON.parse(localStorage.getItem(KEY)||"null")||JSON.parse(localStorage.getItem("tradeSaveV2")||"null")||{capital:1006,trading:[{date:"2026-09-14",profit:5.7,note:"Profit awal"}],cash:[],saving:[],savingTarget:2000};
const money=x=>Number(x||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const rp=x=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:2}).format(Number(x||0)/100*RATE);
const usc=x=>money(x)+" USC";
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));render()};
const profit=()=>state.trading.reduce((a,x)=>a+Number(x.profit||0),0);
const balance=()=>state.capital+profit();
const target=()=>state.capital*TARGET_RATE;
const savings=()=>state.saving.reduce((a,x)=>a+Number(x.amount||0),0);
const today=()=>{const d=todayISO();return state.trading.filter(x=>x.date===d).reduce((a,x)=>a+Number(x.profit||0),0)};
function go(page){document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));$("pageTitle").textContent=page==="dashboard"?"Dashboard":page==="cashflow"?"Uang Masuk / Keluar":page==="saving"?"Tabungan":page==="monthly"?"Rekap Bulanan":"Daily Trading";window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".nav").forEach(n=>n.addEventListener("click",()=>go(n.dataset.page)));

function openQuick(){$("modal").classList.add("open")}
function closeModal(){$("modal").classList.remove("open")}
function openForm(type,index=null){
  const edit=index!==null, item=edit?state[type][index]:{};
  $("formModal").classList.add("open");
  $("formType").value=type;$("formIndex").value=edit?index:"";
  $("formTitle").textContent=edit?"Edit Data":"Tambah Data";
  $("formDate").value=item.date||todayISO();
  $("formAmount").value=edit?(type==="trading"?item.profit:item.amount):"";
  $("formNote").value=item.note||"";
  $("cashTypeWrap").style.display=type==="cash"?"block":"none";
  $("cashType").value=item.type||"Deposit";
  $("amountLabel").textContent=type==="trading"?"Profit / Loss (USC)":"Nominal (USC)";
  $("formHint").textContent=type==="trading"?"Gunakan angka negatif untuk loss, misalnya -12.50 USC.":type==="cash"?"Pilih Deposit untuk uang masuk atau Withdraw untuk uang keluar.":"Nominal yang disimpan ke tabungan.";
  $("deleteBtn").style.display=edit?"inline-flex":"none";
  closeModal();
  setTimeout(()=>$("formDate").focus(),80);
}
function closeForm(){$("formModal").classList.remove("open")}
function submitForm(e){
  e.preventDefault();
  const type=$("formType").value,index=$("formIndex").value===""?null:Number($("formIndex").value);
  const date=$("formDate").value, amount=Number($("formAmount").value), note=$("formNote").value.trim();
  if(!date||!Number.isFinite(amount)){alert("Tanggal dan nominal wajib diisi dengan benar.");return}
  const item=type==="trading"?{date,profit:amount,note}:type==="cash"?{date,type:$("cashType").value,amount:Math.abs(amount),note}:{date,amount:Math.abs(amount),note:note||"Tabungan"};
  if(index===null)state[type].push(item);else state[type][index]=item;
  closeForm();save();
}
function requestDelete(){
  const type=$("formType").value,index=Number($("formIndex").value);
  if(!Number.isInteger(index))return;
  $("confirmDelete").classList.add("open");
  $("confirmText").textContent="Data ini akan dihapus dari catatan. Tindakan ini tidak bisa dibatalkan.";
  $("confirmDelete").dataset.type=type;$("confirmDelete").dataset.index=index;
}
function cancelDelete(){$("confirmDelete").classList.remove("open")}
function doDelete(){const m=$("confirmDelete"),type=m.dataset.type,index=Number(m.dataset.index);if(state[type]?.[index]!==undefined){state[type].splice(index,1);cancelDelete();closeForm();save()}}
function addTrading(){openForm("trading")}
function addCash(){openForm("cash")}
function addSaving(){openForm("saving")}
function editRow(type,i){openForm(type,i)}
function del(type,i){openForm(type,i);setTimeout(requestDelete,100)}
function render(){
  const p=profit(),b=balance(),t=target(),tp=t?Math.max(0,Math.min(100,p/t*100)):0;
  $("today").textContent=new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
  $("kCapital").textContent=money(state.capital);$("kCapitalRp").textContent=rp(state.capital);
  $("kProfit").textContent=(p>=0?"+":"")+money(p);$("kProfitRp").textContent=rp(p);
  $("kTarget").textContent=money(t);$("kTargetPct").textContent=tp.toFixed(2)+"% tercapai";
  $("kBalance").textContent=money(b);$("kBalanceRp").textContent=rp(b);
  $("targetPercent").textContent=tp.toFixed(2)+"%";$("ringText").textContent=Math.round(tp)+"%";$("ring").style.setProperty("--pct",tp+"%");
  $("todayProfit").textContent=usc(today());$("targetRemain").textContent=usc(Math.max(0,t-today()));
  const s=savings(),sp=state.savingTarget?Math.min(100,s/state.savingTarget*100):0;
  $("saveAmount").textContent=usc(s);$("saveTarget").textContent="Target "+usc(state.savingTarget);$("savePct").textContent=sp.toFixed(1)+"%";$("saveBar").style.width=sp+"%";
  $("qProfit").textContent=usc(today());
  const dep=state.cash.filter(x=>/deposit|masuk/i.test(x.type)).reduce((a,x)=>a+Number(x.amount||0),0),wd=state.cash.filter(x=>/withdraw|keluar/i.test(x.type)).reduce((a,x)=>a+Number(x.amount||0),0);
  $("qDeposit").textContent=usc(dep);$("qWithdraw").textContent=usc(wd);$("qSaving").textContent=usc(s);
  $("cashSummary").innerHTML=`<div class="quick-list"><div><span>Total masuk</span><b>${usc(dep)}</b></div><div><span>Total keluar</span><b>${usc(wd)}</b></div><div><span>Net cashflow</span><b>${usc(dep-wd)}</b></div></div>`;
  renderTrading();renderCash();renderSaving();renderMonthly();renderCharts();
}
function renderTrading(){
  const q=($("tradeSearch")?.value||"").toLowerCase();let bal=state.capital,rows=[];
  state.trading.forEach((x,i)=>{bal+=Number(x.profit||0);if(!q||(`${x.date} ${x.note}`).toLowerCase().includes(q))rows.push(`<tr data-edit="trading" data-index="${i}"><td>${esc(x.date)}</td><td class="${x.profit>=0?"positive":"negative"}">${x.profit>=0?"+":""}${usc(x.profit)}</td><td>${usc(bal)}</td><td>${rp(x.profit)}</td><td>${esc(x.note)}</td><td><button class="row-edit" onclick="editRow('trading',${i})">Edit</button></td></tr>`)});
  $("tradeRows").innerHTML=rows.join("")||'<tr><td colspan="6">Tidak ada data.</td></tr>';
}
function renderCash(){
  let inn=0,out=0;state.cash.forEach(x=>/deposit|masuk/i.test(x.type)?inn+=Number(x.amount||0):out+=Number(x.amount||0));
  $("cashIn").textContent=usc(inn);$("cashOut").textContent=usc(out);$("cashNet").textContent=usc(inn-out);
  $("cashRows").innerHTML=state.cash.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${esc(x.type)}</td><td>${usc(x.amount)}</td><td>${rp(x.amount)}</td><td>${esc(x.note)}</td><td><button class="row-edit" onclick="editRow('cash',${i})">Edit</button></td></tr>`).join("")||'<tr><td colspan="6">Belum ada transaksi.</td></tr>';
}
function renderSaving(){
  const s=savings(),pct=state.savingTarget?Math.min(100,s/state.savingTarget*100):0;
  $("saveBig").textContent=usc(s);$("saveBigRp").textContent=rp(s);$("saveBigBar").style.width=pct+"%";$("saveBigPct").textContent=pct.toFixed(1)+"%";
  $("savingRows").innerHTML=state.saving.map((x,i)=>`<tr><td>${esc(x.date)}</td><td>${usc(x.amount)}</td><td>${rp(x.amount)}</td><td>${esc(x.note)}</td><td><button class="row-edit" onclick="editRow('saving',${i})">Edit</button></td></tr>`).join("")||'<tr><td colspan="5">Belum ada tabungan.</td></tr>';
}
function renderMonthly(){let months={};state.trading.forEach(x=>{const m=x.date.slice(0,7);months[m]??={p:0,l:0};Number(x.profit)>=0?months[m].p+=Number(x.profit):months[m].l+=Math.abs(Number(x.profit))});let bal=state.capital;const rows=Object.entries(months).sort().map(([m,v])=>{bal+=v.p-v.l;return`<tr><td>${m}</td><td>${usc(state.capital)}</td><td class="positive">${usc(v.p)}</td><td class="negative">${usc(v.l)}</td><td>${usc(v.p-v.l)}</td><td>${usc(bal)}</td></tr>`}).join("");$("monthRows").innerHTML=rows||'<tr><td colspan="6">Belum ada data.</td></tr>'}
let ec,pc;function renderCharts(){if(typeof Chart==="undefined")return;if(ec)ec.destroy();if(pc)pc.destroy();let bal=state.capital,bals=state.trading.map(x=>bal+=Number(x.profit)),labels=state.trading.map(x=>x.date.slice(5));ec=new Chart($("equityChart"),{type:"line",data:{labels,datasets:[{data:bals,borderColor:"#16b995",backgroundColor:"#16b99518",fill:true,tension:.35,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"#e9eff5"}},x:{grid:{display:false}}}}});pc=new Chart($("plChart"),{type:"bar",data:{labels,datasets:[{data:state.trading.map(x=>Number(x.profit)),backgroundColor:state.trading.map(x=>Number(x.profit)>=0?"#16b995":"#e65b6b"),borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:"#e9eff5"}},x:{grid:{display:false}}}}})}
function exportCSV(type){let arr=state[type];let csv=type==="trading"?"Tanggal,ProfitLossUSC,Catatan\n"+arr.map(x=>`${x.date},${x.profit},"${String(x.note||"").replaceAll('"','""')}"`).join("\n"):type==="cash"?"Tanggal,Jenis,NominalUSC,Keterangan\n"+arr.map(x=>`${x.date},${x.type},${x.amount},"${String(x.note||"").replaceAll('"','""')}"`).join("\n"):"Tanggal,NominalUSC,Keterangan\n"+arr.map(x=>`${x.date},${x.amount},"${String(x.note||"").replaceAll('"','""')}"`).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=type+"-export.csv";a.click();URL.revokeObjectURL(a.href)}
function resetAll(){if(confirm("Hapus semua data dan kembali ke data awal?")){localStorage.removeItem(KEY);localStorage.removeItem("tradeSaveV2");location.reload()}}
$("themeBtn").onclick=()=>document.body.classList.toggle("dark");
$("tradeSearch")?.addEventListener("input",renderTrading);
$("form")?.addEventListener("submit",submitForm);
$("modal")?.addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
$("formModal")?.addEventListener("click",e=>{if(e.target.id==="formModal")closeForm()});
$("confirmDelete")?.addEventListener("click",e=>{if(e.target.id==="confirmDelete")cancelDelete()});
render();
