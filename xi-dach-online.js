const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const $=x=>document.getElementById(x);
let sb=null,me=null,room=null,sub=null;
const fmt=n=>Number(n||0).toLocaleString("vi-VN");
function msg(t){$("tableMsg").textContent=t||""}
function gmsg(t){$("gateMsg").textContent=t||""}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}

function showGate(){
  if(sub&&sb){sb.removeChannel(sub);sub=null}
  room=null;
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
        showTable();
        render(state);
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
}

async function refresh(){
  if(!room)return;
  try{
    const state=await rpc("xidach_get_state",{p_room_id:room});
    render(state);
  }catch(e){
    console.error("Xì Dách refresh error:",e);
    msg(e.message||String(e));
  }
}

function cardHTML(c){
  if(!c||c.rank==='?') return '<div class="card back">?</div>';
  const red=c.suit==='♥'||c.suit==='♦';
  return `<div class="card ${red?'red':''}">${c.rank}${c.suit}</div>`;
}

function render(s){
  if(!s)return;
  $("code").textContent=s.room.code;
  $("phase").textContent=({waiting:"CHỜ CƯỢC",playing:"ĐANG CHƠI",dealer_turn:"LƯỢT NHÀ CÁI",finished:"KẾT QUẢ"})[s.room.status]||s.room.status;
  $("dealerName").textContent=s.dealer.username+(s.dealer.user_id===me.id?" (Bạn)":"");
  $("dealerCards").innerHTML=(s.dealer.cards||[]).map(cardHTML).join('');
  $("dealerScore").textContent=s.dealer.label||"Bài đang úp";

  $("players").innerHTML=(s.players||[]).map(p=>`<div class="seat ${p.is_turn?'active':''}"><b>${p.username}${p.user_id===me.id?' (Bạn)':''}</b><small>${fmt(p.bet)} VNC</small><div class="cards">${(p.cards||[]).map(cardHTML).join('')}</div><div class="score">${p.label||''}</div><div class="result">${p.result||''}</div></div>`).join('');

  const isDealer=s.dealer.user_id===me.id;
  const my=(s.players||[]).find(p=>p.user_id===me.id);
  const turn=s.turn_user_id===me.id;
  const special=["XÌ BÀN","XÌ DÁCH","NGŨ LINH"].includes(my?.label);
  const childCannotStand=!isDealer&&my&&Number(my.score)<=15&&!special;
  const dealerCannotStand=isDealer&&Number(s.dealer.score)<15;

  $("betBox").classList.toggle("hidden",isDealer||s.room.status!=="waiting"||!!my?.bet);
  $("startBtn").classList.toggle("hidden",!isDealer||s.room.status!=="waiting");
  $("newBtn").classList.toggle("hidden",!isDealer||s.room.status!=="finished");
  $("hitBtn").classList.toggle("hidden",!turn||!(s.room.status==='playing'||s.room.status==='dealer_turn'));
  $("standBtn").classList.toggle("hidden",!turn||!(s.room.status==='playing'||s.room.status==='dealer_turn')||dealerCannotStand||childCannotStand);
  $("turnText").textContent=s.message||"";
  refreshBalance().catch(console.error);
}

function subscribe(){
  if(!sb||!room)return;
  if(sub)sb.removeChannel(sub);
  sub=sb.channel('xd-'+room)
    .on('postgres_changes',{event:'*',schema:'public',table:'xidach_rooms',filter:`id=eq.${room}`},refresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'xidach_seats',filter:`room_id=eq.${room}`},refresh)
    .subscribe();
}

$("createBtn").onclick=async()=>{
  try{
    gmsg("");
    room=await rpc("xidach_create_room");
    localStorage.setItem("ls79_xd_room",room);
    showTable();
    await refresh();
  }catch(e){gmsg(e.message||String(e))}
};

$("joinBtn").onclick=async()=>{
  try{
    gmsg("");
    room=await rpc("xidach_join_room",{p_code:$("roomCode").value.trim().toUpperCase()});
    localStorage.setItem("ls79_xd_room",room);
    showTable();
    await refresh();
  }catch(e){gmsg(e.message||String(e))}
};

$("betBtn").onclick=async()=>{try{await rpc("xidach_place_bet",{p_room_id:room,p_amount:Number($("betAmount").value)});await refresh()}catch(e){msg(e.message||String(e))}};
$("startBtn").onclick=async()=>{try{await rpc("xidach_start_round",{p_room_id:room});await refresh()}catch(e){msg(e.message||String(e))}};
$("hitBtn").onclick=async()=>{try{await rpc("xidach_hit",{p_room_id:room});await refresh()}catch(e){msg(e.message||String(e))}};
$("standBtn").onclick=async()=>{try{await rpc("xidach_stand",{p_room_id:room});await refresh()}catch(e){msg(e.message||String(e))}};
$("newBtn").onclick=async()=>{try{await rpc("xidach_new_round",{p_room_id:room});await refresh()}catch(e){msg(e.message||String(e))}};
$("leaveBtn").onclick=async()=>{try{await rpc("xidach_leave_room",{p_room_id:room})}catch(e){console.warn(e)}showGate();location.reload()};

boot();
