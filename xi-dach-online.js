const SUPABASE_URL="https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_KEY="sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const $=x=>document.getElementById(x);
let sb=null,me=null,room=null,sub=null;
const fmt=n=>Number(n||0).toLocaleString("vi-VN");
function msg(t){$("tableMsg").textContent=t||""} function gmsg(t){$("gateMsg").textContent=t||""}
async function rpc(name,args={}){const {data,error}=await sb.rpc(name,args);if(error)throw error;return data}
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
    if(saved){room=saved;showTable();await refresh()}
  }catch(e){
    console.error("Xì Dách boot error:",e);
    gmsg("Lỗi khởi tạo: "+(e?.message||e));
  }
}
async function refreshBalance(){const {data}=await sb.from("profiles").select("balance").eq("id",me.id).single();$("balance").textContent=fmt(data?.balance)+" VNC"}
function showTable(){ $("gate").classList.add("hidden");$("table").classList.remove("hidden");subscribe() }
async function refresh(){if(!room)return;try{const state=await rpc("xidach_get_state",{p_room_id:room});render(state)}catch(e){msg(e.message)}}
function cardHTML(c,hidden=false){if(hidden)return '<div class="card back">?</div>';let red=c.suit==='♥'||c.suit==='♦';return `<div class="card ${red?'red':''}">${c.rank}${c.suit}</div>`}
function render(s){if(!s)return;$("code").textContent=s.room.code;$("phase").textContent=({waiting:"CHỜ CƯỢC",playing:"ĐANG CHƠI",dealer_turn:"LƯỢT NHÀ CÁI",finished:"KẾT QUẢ"})[s.room.status]||s.room.status;$("dealerName").textContent=s.dealer.username+(s.dealer.user_id===me.id?" (Bạn)":"");$("dealerCards").innerHTML=(s.dealer.cards||[]).map((c,i)=>cardHTML(c,s.room.status==='playing'&&i>0)).join('');$("dealerScore").textContent=s.room.status==='playing'?"Bài Nhà Cái đang úp":(s.dealer.label||"");
$("players").innerHTML=s.players.map(p=>`<div class="seat ${p.is_turn?'active':''}"><b>${p.username}${p.user_id===me.id?' (Bạn)':''}</b><small>${fmt(p.bet)} VNC</small><div class="cards">${(p.cards||[]).map(c=>cardHTML(c)).join('')}</div><div class="score">${p.label||''}</div><div class="result">${p.result||''}</div></div>`).join('');
const isDealer=s.dealer.user_id===me.id,my=s.players.find(p=>p.user_id===me.id),turn=s.turn_user_id===me.id;$("betBox").classList.toggle("hidden",isDealer||s.room.status!=="waiting"||!!my?.bet);$("startBtn").classList.toggle("hidden",!isDealer||s.room.status!=="waiting");$("newBtn").classList.toggle("hidden",!isDealer||s.room.status!=="finished");$("hitBtn").classList.toggle("hidden",!turn||!(s.room.status==='playing'||s.room.status==='dealer_turn'));$("standBtn").classList.toggle("hidden",!turn||!(s.room.status==='playing'||s.room.status==='dealer_turn')||(isDealer&&s.dealer.score<15));$("turnText").textContent=s.message||"";refreshBalance()}
function subscribe(){if(sub)sb.removeChannel(sub);sub=sb.channel('xd-'+room).on('postgres_changes',{event:'*',schema:'public',table:'xidach_rooms',filter:`id=eq.${room}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'xidach_seats',filter:`room_id=eq.${room}`},refresh).subscribe()}
$("createBtn").onclick=async()=>{try{let d=await rpc("xidach_create_room");room=d;localStorage.setItem("ls79_xd_room",room);showTable();refresh()}catch(e){gmsg(e.message)}};
$("joinBtn").onclick=async()=>{try{room=await rpc("xidach_join_room",{p_code:$("roomCode").value.trim().toUpperCase()});localStorage.setItem("ls79_xd_room",room);showTable();refresh()}catch(e){gmsg(e.message)}};
$("betBtn").onclick=async()=>{try{await rpc("xidach_place_bet",{p_room_id:room,p_amount:Number($("betAmount").value)});refresh()}catch(e){msg(e.message)}};
$("startBtn").onclick=async()=>{try{await rpc("xidach_start_round",{p_room_id:room});refresh()}catch(e){msg(e.message)}};
$("hitBtn").onclick=async()=>{try{await rpc("xidach_hit",{p_room_id:room});refresh()}catch(e){msg(e.message)}};
$("standBtn").onclick=async()=>{try{await rpc("xidach_stand",{p_room_id:room});refresh()}catch(e){msg(e.message)}};
$("newBtn").onclick=async()=>{try{await rpc("xidach_new_round",{p_room_id:room});refresh()}catch(e){msg(e.message)}};
$("leaveBtn").onclick=async()=>{try{await rpc("xidach_leave_room",{p_room_id:room})}catch{}localStorage.removeItem("ls79_xd_room");location.reload()};
boot();
