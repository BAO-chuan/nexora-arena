const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const $=x=>document.getElementById(x);
let sb=null,me=null,room=null,sub=null,pollTimer=null,busy=false,lastState=null;
const fmt=n=>Number(n||0).toLocaleString("vi-VN");
const specialLabels=["XÌ BÀN","XÌ DÁCH","NGŨ LINH"];

function msg(t){$("tableMsg").textContent=t||""}
function gmsg(t){$("gateMsg").textContent=t||""}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
function isSpecial(label){return specialLabels.includes(label||"")}
function setBusy(v){busy=v;document.querySelectorAll("button").forEach(b=>{if(b.id!=="leaveBtn"&&b.id!=="copyCodeBtn"&&b.id!=="refreshHistory")b.disabled=v})}

function showGate(){
  if(sub&&sb){sb.removeChannel(sub);sub=null}
  if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  room=null;lastState=null;
  localStorage.removeItem("ls79_xd_room");
  $("table").classList.add("hidden");
  $("gate").classList.remove("hidden");
}

async function boot(){
  try{
    if(!window.supabase?.createClient) throw new Error("Không tải được thư viện Supabase. Hãy tải lại trang.");
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data:{session},error}=await sb.auth.getSession();
    if(error) throw error;
    if(!session){location.href="index.html";return}
    me=session.user;
    await refreshBalance();
    const saved=localStorage.getItem("ls79_xd_room");
    if(saved){
      room=saved;
      try{
        const state=await rpc("xidach_get_state",{p_room_id:room});
        showTable();render(state);await loadHistory();
      }catch(e){
        console.warn("Phòng cũ không còn hợp lệ:",e);
        showGate();
        gmsg("Phòng cũ đã hết hoặc bạn không còn trong phòng. Hãy tạo/vào phòng mới.");
      }
    }
  }catch(e){
    console.error("Xì Dách boot error:",e);
    gmsg("Lỗi khởi tạo: "+(e?.message||e));
  }
}

async function refreshBalance(){
  const {data,error}=await sb.from("profiles").select("balance").eq("id",me.id).single();
  if(error) throw error;
  $("balance").textContent=fmt(data?.balance)+" VNC";
}

function showTable(){
  $("gate").classList.add("hidden");
  $("table").classList.remove("hidden");
  subscribe();
  if(!pollTimer) pollTimer=setInterval(()=>{if(document.visibilityState==="visible")refresh(false)},5000);
}

async function refresh(showError=true){
  if(!room)return;
  try{
    const state=await rpc("xidach_get_state",{p_room_id:room});
    render(state);
  }catch(e){
    console.error("Xì Dách refresh error:",e);
    if(showError)msg(e.message||String(e));
  }
}

function cardHTML(c,i=0){
  if(!c||c.rank==='?') return `<div class="card back" style="--i:${i}"><span>LS</span></div>`;
  const red=c.suit==='♥'||c.suit==='♦';
  return `<div class="card ${red?'red':''}" style="--i:${i}"><b>${c.rank}</b><span>${c.suit}</span></div>`;
}

function statusClass(p){
  if(p.result==="THẮNG")return "win";
  if(p.result==="THUA")return "lose";
  if(p.result==="HÒA")return "tie";
  if(p.is_turn)return "turn";
  if(p.stood)return "stood";
  return "";
}

function render(s){
  if(!s)return;lastState=s;
  const isDealer=s.dealer.user_id===me.id;
  const my=(s.players||[]).find(p=>p.user_id===me.id);
  const turn=s.turn_user_id===me.id;
  const phaseMap={waiting:"CHỜ CƯỢC",playing:"NHÀ CON",dealer_turn:"NHÀ CÁI",finished:"KẾT QUẢ"};

  $("code").textContent=s.room.code;
  $("phase").textContent=phaseMap[s.room.status]||s.room.status;
  $("roundNo").textContent="#"+s.room.round_no;
  $("totalBets").textContent=fmt(s.room.total_bets)+" VNC";
  $("escrow").textContent=fmt(s.room.dealer_escrow)+" VNC";
  $("balance").textContent=fmt(s.viewer_balance)+" VNC";

  $("dealerBalanceBox").classList.toggle("hidden",!isDealer);
  if(isDealer)$("dealerBalance").textContent=fmt(s.dealer_balance)+" VNC";

  $("dealerName").textContent=s.dealer.username+(isDealer?" (Bạn)":"");
  $("dealerCards").innerHTML=(s.dealer.cards||[]).map(cardHTML).join('');
  $("dealerScore").textContent=s.dealer.label||"Bài đang úp";
  $("dealerSeat").classList.toggle("active",!!s.dealer.is_turn);
  $("dealerTurnBadge").classList.toggle("hidden",!s.dealer.is_turn);

  $("players").innerHTML=(s.players||[]).map(p=>`
    <article class="seat-card player-seat ${statusClass(p)} ${p.user_id===me.id?'me':''}">
      <div class="seat-head">
        <div class="avatar">${String(p.seat_no||'?')}</div>
        <div><span class="role">NHÀ CON</span><strong>${escapeHTML(p.username)}${p.user_id===me.id?' (Bạn)':''}</strong></div>
        <em class="seat-status">${escapeHTML(p.status_text||'')}</em>
      </div>
      <div class="seat-bet"><span>CƯỢC</span><b>${fmt(p.bet)} VNC</b></div>
      <div class="cards">${(p.cards||[]).map(cardHTML).join('')}</div>
      <div class="score">${escapeHTML(p.label||((p.cards||[]).length?'Bài đang úp':''))}</div>
      ${p.can_inspect?`<button class="inspect-btn" data-user-id="${p.user_id}">XÉT BÀI</button>`:''}
      ${p.result?`<div class="result ${statusClass(p)}">${p.result}</div>`:''}
    </article>`).join('');

  document.querySelectorAll(".inspect-btn").forEach(btn=>btn.onclick=()=>runAction(btn,()=>rpc("xidach_inspect_player",{p_room_id:room,p_player_id:btn.dataset.userId})));

  const myLabel=isDealer?s.dealer.label:my?.label;
  const myScore=Number(isDealer?s.dealer.score:my?.score);
  const special=isSpecial(myLabel);
  const childCannotStand=!isDealer&&my&&myScore<=15&&!special;
  const dealerCannotStand=isDealer&&myScore<15&&!special;
  const canAct=turn&&(s.room.status==='playing'||s.room.status==='dealer_turn');

  $("betBox").classList.toggle("hidden",isDealer||s.room.status!=="waiting"||!!my?.bet);
  $("startBtn").classList.toggle("hidden",!isDealer||s.room.status!=="waiting");
  $("newBtn").classList.toggle("hidden",!isDealer||s.room.status!=="finished");
  $("hitBtn").classList.toggle("hidden",!canAct);
  $("standBtn").classList.toggle("hidden",!canAct||dealerCannotStand||childCannotStand);
  $("turnText").textContent=s.message||"";

  $("coverBox").classList.toggle("hidden",!isDealer||s.room.status!=="waiting");
  if(isDealer&&s.room.status==="waiting"){
    $("requiredCover").textContent=fmt(s.room.total_bets)+" VNC";
    const ok=s.dealer_can_cover&&Number(s.room.total_bets)>0;
    $("coverStatus").textContent=Number(s.room.total_bets)<=0?"Chưa có Nhà Con đặt cược":ok?"✓ Đủ VNC để bảo chứng":"✕ Chưa đủ VNC bảo chứng";
    $("coverStatus").className=ok?"ok":"bad";
    $("startBtn").disabled=!ok||busy;
  }

  refreshBalance().catch(console.error);
  if(s.room.status==="finished")loadHistory().catch(console.error);
}

function escapeHTML(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}

async function runAction(btn,fn){
  if(busy)return;
  try{
    setBusy(true);msg("");
    await fn();
    await refresh(false);
  }catch(e){msg(e.message||String(e))}
  finally{setBusy(false);if(lastState)render(lastState)}
}

function subscribe(){
  if(!sb||!room)return;
  if(sub)sb.removeChannel(sub);
  sub=sb.channel('xd-'+room)
    .on('postgres_changes',{event:'*',schema:'public',table:'xidach_rooms',filter:`id=eq.${room}`},()=>refresh(false))
    .on('postgres_changes',{event:'*',schema:'public',table:'xidach_seats',filter:`room_id=eq.${room}`},()=>refresh(false))
    .subscribe();
}

async function loadHistory(){
  if(!room)return;
  try{
    const rows=await rpc("xidach_get_history",{p_room_id:room,p_limit:30});
    const viewerIsDealer=lastState?.dealer?.user_id===me.id;
    if(!rows?.length){$("historyList").innerHTML='<p class="empty">Chưa có ván đã kết toán.</p>';return}
    $("historyList").innerHTML=rows.map(h=>{
      const mine=h.player_id===me.id;
      const delta=mine?Number(h.player_delta):viewerIsDealer?Number(h.dealer_delta):null;
      const deltaTxt=delta===null?"":((delta>0?"+":"")+fmt(delta)+" VNC");
      const sideTxt=mine?deltaTxt:(viewerIsDealer?"Nhà Cái "+deltaTxt:"");
      return `<div class="history-row"><div><b>Ván #${h.round_no} • ${escapeHTML(h.username)}</b><span>${escapeHTML(h.player_label)} vs ${escapeHTML(h.dealer_label)} • cược ${fmt(h.bet)} VNC</span></div><div class="history-result ${String(h.result).toLowerCase()}"><strong>${h.result}</strong><small>${sideTxt}</small></div></div>`
    }).join('');
  }catch(e){$("historyList").innerHTML=`<p class="empty">${escapeHTML(e.message||e)}</p>`}
}

$("createBtn").onclick=async()=>{
  try{setBusy(true);gmsg("");room=await rpc("xidach_create_room");localStorage.setItem("ls79_xd_room",room);showTable();await refresh(false);await loadHistory()}
  catch(e){gmsg(e.message||String(e))}finally{setBusy(false)}
};

$("joinBtn").onclick=async()=>{
  try{setBusy(true);gmsg("");const code=$("roomCode").value.trim().toUpperCase();if(code.length!==6)throw new Error("Mã phòng gồm 6 ký tự");room=await rpc("xidach_join_room",{p_code:code});localStorage.setItem("ls79_xd_room",room);showTable();await refresh(false);await loadHistory()}
  catch(e){gmsg(e.message||String(e))}finally{setBusy(false)}
};

$("roomCode").addEventListener("input",e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6));
document.querySelectorAll("[data-bet]").forEach(b=>b.onclick=()=>$("betAmount").value=b.dataset.bet);
$("betBtn").onclick=()=>runAction($("betBtn"),()=>rpc("xidach_place_bet",{p_room_id:room,p_amount:Number($("betAmount").value)}));
$("startBtn").onclick=()=>runAction($("startBtn"),()=>rpc("xidach_start_round",{p_room_id:room}));
$("hitBtn").onclick=()=>runAction($("hitBtn"),()=>rpc("xidach_hit",{p_room_id:room}));
$("standBtn").onclick=()=>runAction($("standBtn"),()=>rpc("xidach_stand",{p_room_id:room}));
$("newBtn").onclick=()=>runAction($("newBtn"),()=>rpc("xidach_new_round",{p_room_id:room}));
$("refreshHistory").onclick=()=>loadHistory();
$("copyCodeBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("code").textContent);msg("Đã sao chép mã phòng") }catch{msg("Mã phòng: "+$("code").textContent)}};
$("leaveBtn").onclick=async()=>{if(busy)return;try{setBusy(true);await rpc("xidach_leave_room",{p_room_id:room});showGate();location.reload()}catch(e){msg(e.message||String(e))}finally{setBusy(false)}};

window.addEventListener("online",()=>refresh(false));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh(false)});

boot();
