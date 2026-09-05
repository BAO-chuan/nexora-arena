
const SUPABASE_URL = "https://efpfhpwxmzpmmynczbce.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const SYMBOLS = {
  CHERRY:{label:"🍒"},
  LEMON:{label:"🍋"},
  BELL:{label:"🔔"},
  STAR:{label:"⭐"},
  BAR:{label:"BAR"},
  SEVEN:{label:"7", cls:"seven"},
  DIAMOND:{label:"💎"}
};
const PAYLINES = [
  [0,1,2,3,4],
  [5,6,7,8,9],
  [10,11,12,13,14],
  [0,6,12,8,4],
  [10,6,2,8,14]
];

let session = null;
let currentBet = 100;
let spinning = false;
let soundOn = true;
let fakeTimer = null;

function fmt(n){ return Number(n||0).toLocaleString("vi-VN"); }
function setMessage(text){ $("slotMessage").textContent = text; }

async function ensureAuth(){
  const {data:{session:s}} = await sb.auth.getSession();
  session = s;
  if(!session){
    location.href = "index.html";
    return false;
  }

  const {data:p,error} = await sb
    .from("profiles")
    .select("username,balance")
    .eq("id",session.user.id)
    .single();

  if(error){
    setMessage("Không tải được tài khoản.");
    return false;
  }

  $("slotUsername").textContent = p.username || "Player";
  $("slotBalance").textContent = `${fmt(p.balance)} VNC`;
  return true;
}

async function refreshBalance(){
  if(!session) return;
  const {data:p} = await sb
    .from("profiles")
    .select("balance")
    .eq("id",session.user.id)
    .single();
  if(p) $("slotBalance").textContent = `${fmt(p.balance)} VNC`;
}

async function refreshJackpot(){
  const {data,error} = await sb
    .from("slot_jackpot")
    .select("amount")
    .eq("id",1)
    .single();

  if(error){
    $("jackpotAmount").textContent = "CHƯA CÀI SQL";
    return;
  }
  $("jackpotAmount").textContent = `${fmt(data.amount)} VNC`;
}

function renderGrid(grid, winningLines=[]){
  const cells = [...document.querySelectorAll(".reel-cell")];
  const winIndexes = new Set();
  winningLines.forEach(w => {
    const line = PAYLINES[(w.line||1)-1] || [];
    for(let i=0;i<Number(w.count||0);i++) winIndexes.add(line[i]);
  });

  cells.forEach((cell,i)=>{
    const sym = SYMBOLS[grid[i]] || {label:"?"};
    cell.textContent = sym.label;
    cell.className = "reel-cell";
    if(sym.cls) cell.classList.add(sym.cls);
    if(winIndexes.has(i)) cell.classList.add("win-cell");
  });
}

function startFakeSpin(){
  const keys = Object.keys(SYMBOLS);
  $("reelGrid").classList.add("spinning");
  fakeTimer = setInterval(()=>{
    const grid = Array.from({length:15},()=>keys[Math.floor(Math.random()*keys.length)]);
    renderGrid(grid);
  },90);
}

function stopFakeSpin(){
  clearInterval(fakeTimer);
  fakeTimer = null;
  $("reelGrid").classList.remove("spinning");
}

function showWin(win,jackpot){
  $("lastWin").textContent = `${fmt(win)} VNC`;
  $("winLabel").textContent = jackpot > 0 ? "🔥 NỔ HŨ 🔥" : "THẮNG";
  $("winAmount").textContent = `${fmt(win)} VNC`;
  $("winOverlay").classList.remove("hidden");
  setTimeout(()=>$("winOverlay").classList.add("hidden"), jackpot > 0 ? 4200 : 2200);
}

async function spin(){
  if(spinning) return;
  spinning = true;
  $("spinBtn").disabled = true;
  [...document.querySelectorAll(".reel-cell")].forEach(c=>c.classList.remove("win-cell"));
  setMessage("Đang quay...");
  startFakeSpin();

  const started = performance.now();
  const {data,error} = await sb.rpc("slot_spin",{p_bet_amount:currentBet});
  const elapsed = performance.now() - started;
  if(elapsed < 950) await new Promise(r=>setTimeout(r,950-elapsed));
  stopFakeSpin();

  if(error){
    spinning = false;
    $("spinBtn").disabled = false;
    setMessage(error.message.includes("insufficient") ? "Số dư VNC không đủ." : `Không thể quay: ${error.message}`);
    await refreshBalance();
    return;
  }

  const grid = data.grid || [];
  const lines = data.lines || [];
  renderGrid(grid,lines);

  $("winningLines").textContent = String(lines.length);
  $("slotBalance").textContent = `${fmt(data.balance)} VNC`;
  $("jackpotAmount").textContent = `${fmt(data.jackpot_amount)} VNC`;

  if(Number(data.win_amount) > 0){
    showWin(data.win_amount,data.jackpot_win);
    setMessage(data.jackpot_win > 0 ? "NỔ HŨ! Bạn nhận toàn bộ hũ VNC." : `Bạn thắng ${fmt(data.win_amount)} VNC!`);
  }else{
    $("lastWin").textContent = "0 VNC";
    setMessage("Chưa trúng. Thử lượt tiếp theo nhé.");
  }

  await loadHistory();
  spinning = false;
  $("spinBtn").disabled = false;
}

async function loadHistory(){
  if(!session) return;
  const {data,error} = await sb
    .from("slot_spins")
    .select("id,bet_amount,win_amount,jackpot_win,created_at")
    .eq("user_id",session.user.id)
    .order("created_at",{ascending:false})
    .limit(8);

  if(error){
    $("spinHistory").innerHTML = '<p class="muted">Chưa đọc được lịch sử. Hãy chạy file SQL của game trước.</p>';
    return;
  }

  if(!data?.length){
    $("spinHistory").innerHTML = '<p class="muted">Chưa có lượt quay nào.</p>';
    return;
  }

  $("spinHistory").innerHTML = data.map(row=>{
    const win = Number(row.win_amount||0);
    const jackpot = Number(row.jackpot_win||0);
    const d = new Date(row.created_at).toLocaleString("vi-VN");
    return `<div class="history-row">
      <div>
        <strong>${jackpot>0 ? "🔥 NỔ HŨ" : "Nổ Hũ 777"}</strong>
        <span>${d} • Cược ${fmt(row.bet_amount)} VNC</span>
      </div>
      <b class="${win>0?"win":""}">${win>0?"+":""}${fmt(win)} VNC</b>
    </div>`;
  }).join("");
}

document.querySelectorAll("#betChips button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    if(spinning) return;
    document.querySelectorAll("#betChips button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentBet = Number(btn.dataset.bet);
    $("currentBet").textContent = `${fmt(currentBet)} VNC`;
  });
});

$("spinBtn").addEventListener("click",spin);
$("refreshBalance").addEventListener("click",async()=>{await refreshBalance();await refreshJackpot();});
$("refreshHistory").addEventListener("click",loadHistory);
$("paytableBtn").addEventListener("click",()=> $("paytableDialog").showModal());
$("soundBtn").addEventListener("click",()=>{
  soundOn = !soundOn;
  $("soundBtn").textContent = soundOn ? "♪" : "×";
});

(async()=>{
  const ok = await ensureAuth();
  if(!ok) return;
  await Promise.all([refreshJackpot(),loadHistory()]);
})();
