const SUPABASE_URL =
  "https://efpfhpwxmzpmmynczbce.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_7pNQIr21sL3EUy0WSqXKwQ_N6_oDWhJ";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ================================
// STATE
// ================================

let currentUser = null;
let currentProfile = null;
let currentRoom = null;
let currentRound = null;

let selectedBet = null;
let countdownTimer = null;

let settlingRoundId = null;
let autoRoundTimer = null;
let creatingNextRound = false;
let lastAnimatedRoundId = null;
let activeDealRoundId = null;
let dealAnimationToken = 0;
let betStatsTimer = null;
let currentShoeState = null;
let lastSeenShoeNumber = null;
let shuffleFxTimer = null;

// V21 — Casino Sound + Dealer Flow + Win/Lose FX
let boAudioContext = null;
let boSoundEnabled = localStorage.getItem("ls79win_baccarat_sound") !== "off";
let boDealerOverlay = null;
let boResultFxTimer = null;
let lastResultFxRoundId = null;
let lastOwnRoundTotals = { player: 0, banker: 0, tie: 0 };

const AUTO_BETTING_SECONDS = 20;
const MIN_BET_AMOUNT = 10000;
const MAX_BET_AMOUNT = 1000000;
const RESULT_DISPLAY_MS = 10000;
// ================================
// ELEMENTS
// ================================

const $ = id => document.getElementById(id);

const boStatus = $("boStatus");
const boBalance = $("boBalance");

const boRoomName = $("boRoomName");
const boRoomCode = $("boRoomCode");

const boRoundNumber = $("boRoundNumber");
const boRoundStatus = $("boRoundStatus");
const boCountdown = $("boCountdown");

const boTableMessage = $("boTableMessage");

const boPlayerScore = $("boPlayerScore");
const boBankerScore = $("boBankerScore");
const boResult = $("boResult");

const boPlayerCards = $("boPlayerCards");
const boBankerCards = $("boBankerCards");
const boRoadHistory = $("boRoadHistory");
const boBigRoad = $("boBigRoad");
const boRoadStats = $("boRoadStats");
const boShoeNumber = $("boShoeNumber");
const boShoeProgress = $("boShoeProgress");
const boShuffleStatus = $("boShuffleStatus");
const boCardShoe = $("boCardShoe");
const boPlayerChipStack = $("boPlayerChipStack");
const boTieChipStack = $("boTieChipStack");
const boBankerChipStack = $("boBankerChipStack");
const boPlayerOwnBet = $("boPlayerOwnBet");
const boTieOwnBet = $("boTieOwnBet");
const boBankerOwnBet = $("boBankerOwnBet");
const boShoePlayerStat = $("boShoePlayerStat");
const boShoeBankerStat = $("boShoeBankerStat");
const boShoeTieStat = $("boShoeTieStat");
const boBigEyeRoad = $("boBigEyeRoad");
const boSmallRoad = $("boSmallRoad");
const boCockroachRoad = $("boCockroachRoad");

const boBetAmount = $("boBetAmount");
const boPlaceBet = $("boPlaceBet");
const boBetMessage = $("boBetMessage");
const boBetPreview = $("boBetPreview");
const boMyRoundBets = $("boMyRoundBets");

const boPlayerBetAmount = $("boPlayerBetAmount");
const boPlayerBetPlayers = $("boPlayerBetPlayers");
const boTieBetAmount = $("boTieBetAmount");
const boTieBetPlayers = $("boTieBetPlayers");
const boBankerBetAmount = $("boBankerBetAmount");
const boBankerBetPlayers = $("boBankerBetPlayers");
const boTableBetAmount = $("boTableBetAmount");
const boTableBetPlayers = $("boTableBetPlayers");

const boBetList = $("boBetList");

const boAdminPanel = $("boAdminPanel");
const boBettingSeconds = $("boBettingSeconds");
const boCreateRound = $("boCreateRound");


// ================================
// HELPERS
// ================================


function ensureV21UI() {
  if (!document.getElementById("boV21Style")) {
    const style = document.createElement("style");
    style.id = "boV21Style";
    style.textContent = `
      .bo-sound-toggle{
        width:34px;height:34px;border-radius:50%;border:1px solid rgba(242,196,90,.35);
        background:linear-gradient(180deg,#1a0607,#090303);color:#ffe39a;
        display:grid;place-items:center;font-size:15px;cursor:pointer;flex:0 0 auto;
        box-shadow:0 5px 16px rgba(0,0,0,.28)
      }
      .bo-sound-toggle.is-off{opacity:.5;filter:grayscale(.5)}
      .bo-dealer-overlay{
        position:absolute;left:50%;top:54px;transform:translate(-50%,-8px);
        z-index:12;pointer-events:none;opacity:0;
        min-width:148px;padding:6px 12px;border-radius:999px;text-align:center;
        border:1px solid rgba(242,196,90,.38);
        background:linear-gradient(180deg,rgba(34,7,8,.96),rgba(8,3,3,.96));
        color:#ffe39a;font-size:9px;font-weight:950;letter-spacing:.8px;
        box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 20px rgba(217,11,22,.12);
        transition:opacity .2s ease,transform .2s ease
      }
      .bo-dealer-overlay.show{opacity:1;transform:translate(-50%,0)}
      .bo-dealer-overlay strong{color:#fff3cf}
      .bo-hand.dealer-focus{
        position:relative;z-index:3;
        filter:drop-shadow(0 0 10px rgba(242,196,90,.26));
        transform:translateY(-2px);
        transition:transform .18s ease,filter .18s ease
      }
      .bo-hand.dealer-focus .bo-hand-label{
        text-shadow:0 0 12px rgba(255,220,120,.65)
      }
      .bo-result-fx{
        position:fixed;left:50%;top:46%;transform:translate(-50%,-50%) scale(.86);
        z-index:9999;min-width:min(82vw,310px);max-width:90vw;
        padding:18px 20px;border-radius:18px;text-align:center;pointer-events:none;
        opacity:0;background:linear-gradient(180deg,rgba(27,5,6,.97),rgba(6,2,2,.98));
        border:1px solid rgba(242,196,90,.46);
        box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 35px rgba(217,11,22,.18);
        transition:opacity .22s ease,transform .28s cubic-bezier(.2,.8,.2,1)
      }
      .bo-result-fx.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
      .bo-result-fx .bo-rfx-kicker{
        color:#cbb783;font-size:9px;font-weight:900;letter-spacing:1.2px
      }
      .bo-result-fx .bo-rfx-title{
        margin-top:4px;color:#ffe39a;font-size:23px;font-weight:1000;letter-spacing:.5px
      }
      .bo-result-fx .bo-rfx-sub{
        margin-top:5px;color:#fff4dc;font-size:11px;font-weight:850
      }
      .bo-result-fx.win{
        box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 44px rgba(242,196,90,.32)
      }
      .bo-result-fx.lose{
        border-color:rgba(217,11,22,.55);
        box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 34px rgba(217,11,22,.26)
      }
      .bo-result-fx.neutral{border-color:rgba(242,196,90,.46)}
      .bo-table.v21-result-player .bo-hand:first-child,
      .bo-table.v21-result-banker .bo-hand:last-child{
        animation:boV21WinnerPulse .72s ease 2
      }
      .bo-table.v21-result-tie .bo-vs{
        animation:boV21WinnerPulse .72s ease 2
      }
      @keyframes boV21WinnerPulse{
        0%,100%{filter:none}
        50%{filter:drop-shadow(0 0 16px rgba(255,211,105,.7));transform:translateY(-3px)}
      }
      @media(prefers-reduced-motion:reduce){
        .bo-dealer-overlay,.bo-result-fx,.bo-hand.dealer-focus{transition:none}
        .bo-table.v21-result-player .bo-hand:first-child,
        .bo-table.v21-result-banker .bo-hand:last-child,
        .bo-table.v21-result-tie .bo-vs{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  const topbar = document.querySelector(".bo-topbar");
  if (topbar && !document.getElementById("boSoundToggle")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "boSoundToggle";
    btn.className = "bo-sound-toggle";
    btn.setAttribute("aria-label", "Bật/tắt âm thanh Baccarat");
    topbar.insertBefore(btn, topbar.querySelector(".bo-wallet") || null);
    btn.addEventListener("click", async () => {
      boSoundEnabled = !boSoundEnabled;
      localStorage.setItem("ls79win_baccarat_sound", boSoundEnabled ? "on" : "off");
      updateSoundButton();
      if (boSoundEnabled) {
        await unlockBaccaratAudio();
        playCasinoSound("chip");
      }
    });
  }
  updateSoundButton();

  const tableInner = document.querySelector(".bo-table-inner");
  if (tableInner && !document.getElementById("boDealerOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "boDealerOverlay";
    overlay.className = "bo-dealer-overlay";
    overlay.innerHTML = `DEALER • <strong>ĐANG CHỜ</strong>`;
    tableInner.appendChild(overlay);
    boDealerOverlay = overlay;
  } else {
    boDealerOverlay = document.getElementById("boDealerOverlay");
  }

  if (!document.getElementById("boResultFx")) {
    const fx = document.createElement("div");
    fx.id = "boResultFx";
    fx.className = "bo-result-fx";
    document.body.appendChild(fx);
  }
}

function updateSoundButton() {
  const btn = document.getElementById("boSoundToggle");
  if (!btn) return;
  btn.textContent = boSoundEnabled ? "🔊" : "🔇";
  btn.classList.toggle("is-off", !boSoundEnabled);
  btn.title = boSoundEnabled ? "Tắt âm thanh" : "Bật âm thanh";
}

async function unlockBaccaratAudio() {
  try {
    if (!boAudioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      boAudioContext = new Ctx();
    }
    if (boAudioContext.state === "suspended") {
      await boAudioContext.resume();
    }
    return boAudioContext;
  } catch (error) {
    console.warn("Audio unavailable:", error);
    return null;
  }
}

function playTone(freq, duration = .08, type = "sine", volume = .03, delay = 0) {
  if (!boSoundEnabled || !boAudioContext || boAudioContext.state !== "running") return;

  const now = boAudioContext.currentTime + delay;
  const osc = boAudioContext.createOscillator();
  const gain = boAudioContext.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);

  osc.connect(gain);
  gain.connect(boAudioContext.destination);
  osc.start(now);
  osc.stop(now + duration + .02);
}

function playCasinoSound(kind) {
  if (!boSoundEnabled) return;

  switch (kind) {
    case "chip":
      playTone(920, .045, "square", .018);
      playTone(1260, .04, "square", .012, .035);
      break;
    case "deal":
      playTone(190, .065, "triangle", .018);
      playTone(135, .09, "sine", .012, .035);
      break;
    case "flip":
      playTone(420, .055, "triangle", .018);
      playTone(760, .065, "sine", .012, .045);
      break;
    case "shuffle":
      playTone(150, .11, "triangle", .016);
      playTone(220, .1, "triangle", .012, .11);
      playTone(170, .1, "triangle", .012, .22);
      break;
    case "win":
      playTone(523.25, .14, "sine", .025);
      playTone(659.25, .14, "sine", .025, .11);
      playTone(783.99, .22, "sine", .03, .22);
      break;
    case "lose":
      playTone(220, .16, "triangle", .018);
      playTone(174.61, .24, "triangle", .018, .12);
      break;
    case "result":
      playTone(392, .12, "sine", .02);
      playTone(523.25, .16, "sine", .02, .1);
      break;
  }
}

function setDealerMessage(message, container = null) {
  ensureV21UI();
  if (boDealerOverlay) {
    boDealerOverlay.innerHTML = `DEALER • <strong>${message}</strong>`;
    boDealerOverlay.classList.add("show");
  }

  document.querySelectorAll(".bo-hand").forEach(hand => {
    hand.classList.remove("dealer-focus");
  });

  if (container) {
    container.closest(".bo-hand")?.classList.add("dealer-focus");
  }
}

function hideDealerMessage(delay = 0) {
  window.setTimeout(() => {
    boDealerOverlay?.classList.remove("show");
    document.querySelectorAll(".bo-hand").forEach(hand => {
      hand.classList.remove("dealer-focus");
    });
  }, delay);
}

function resultLabel(result) {
  if (result === "player") return "PLAYER THẮNG";
  if (result === "banker") return "BANKER THẮNG";
  if (result === "tie") return "HÒA";
  return "KẾT QUẢ";
}

async function showV21ResultFx(round) {
  if (!round || lastResultFxRoundId === round.id) return;
  lastResultFxRoundId = round.id;
  ensureV21UI();

  const fx = document.getElementById("boResultFx");
  const table = document.querySelector(".bo-table");
  if (!fx) return;

  table?.classList.remove("v21-result-player", "v21-result-banker", "v21-result-tie");
  if (["player", "banker", "tie"].includes(round.result)) {
    table?.classList.add(`v21-result-${round.result}`);
  }

  let stake = 0;
  let payout = 0;

  if (currentUser) {
    try {
      const { data, error } = await sb
        .from("baccarat_bets")
        .select("amount,payout")
        .eq("user_id", currentUser.id)
        .eq("round_id", round.id);

      if (!error) {
        (data || []).forEach(bet => {
          stake += Number(bet.amount || 0);
          payout += Number(bet.payout || 0);
        });
      }
    } catch (error) {
      console.warn("V21 result lookup:", error);
    }
  }

  const net = payout - stake;
  let state = "neutral";
  let sub = "Kết quả đã được công bố";

  if (stake > 0 && net > 0) {
    state = "win";
    sub = `THẮNG +${formatVNC(net)} VNC`;
    playCasinoSound("win");
  } else if (stake > 0 && net < 0) {
    state = "lose";
    sub = `THUA ${formatVNC(Math.abs(net))} VNC`;
    playCasinoSound("lose");
  } else {
    playCasinoSound("result");
  }

  fx.className = `bo-result-fx ${state}`;
  fx.innerHTML = `
    <div class="bo-rfx-kicker">LS79win BACCARAT</div>
    <div class="bo-rfx-title">${resultLabel(round.result)}</div>
    <div class="bo-rfx-sub">${sub}</div>
  `;

  clearTimeout(boResultFxTimer);
  requestAnimationFrame(() => fx.classList.add("show"));

  boResultFxTimer = window.setTimeout(() => {
    fx.classList.remove("show");
    table?.classList.remove("v21-result-player", "v21-result-banker", "v21-result-tie");

    window.setTimeout(() => {
      if (!fx.classList.contains("show")) {
        fx.className = "bo-result-fx";
        fx.innerHTML = "";
      }
    }, 320);
  }, 2600);
}

// Unlock WebAudio on the first genuine user gesture — important for iPhone Safari.
["pointerdown", "touchstart", "click"].forEach(eventName => {
  document.addEventListener(eventName, () => {
    if (boSoundEnabled) unlockBaccaratAudio();
  }, { once: true, passive: true });
});

// Casino chip/select feedback without changing existing betting logic.
document.addEventListener("click", event => {
  const target = event.target.closest?.(".bo-chip, .bo-bet-option, [data-bo-amount]");
  if (target) playCasinoSound("chip");
});


function cardHTML(card, extraClass = "") {

  if (!card) return "";


  const suit =
    String(card.suit || "");


  const isRed =
    suit === "♥" ||
    suit === "♦";


  return `
    <div class="bo-card ${isRed ? "red" : ""} ${extraClass}">

      <span class="bo-card-rank">
        ${card.rank || "?"}
      </span>

      <span class="bo-card-suit">
        ${suit}
      </span>

    </div>
  `;
}



function dealCardHTML(card) {
  if (!card) return "";

  const suit = String(card.suit || "");
  const isRed = suit === "♥" || suit === "♦";

  return `
    <div class="bo-deal-card dealing face-down">
      <div class="bo-deal-card-inner">
        <div class="bo-card-back">
          <div class="bo-card-back-mark">LS79</div>
        </div>
        <div class="bo-card-peek bo-card ${isRed ? "red" : ""}">
          <span class="bo-card-rank">${card.rank || "?"}</span>
          <span class="bo-card-suit">${suit}</span>
        </div>
        <div class="bo-card-front bo-card ${isRed ? "red" : ""}">
          <span class="bo-card-rank">${card.rank || "?"}</span>
          <span class="bo-card-suit">${suit}</span>
        </div>
      </div>
    </div>
  `;
}

function renderCards(cards, container) {

  if (!container) return;


  if (
    !Array.isArray(cards) ||
    !cards.length
  ) {

    container.innerHTML = "";

    return;
  }


  container.innerHTML =
    cards
      .map(cardHTML)
      .join("");
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function appendAnimatedCard(card, container, token) {
  if (!card || !container) return;

  const sideName = container === boPlayerCards ? "PLAYER" : "BANKER";
  setDealerMessage(`CHIA CHO ${sideName}`, container);
  playCasinoSound("deal");

  boCardShoe?.classList.add("is-dealing");

  container.insertAdjacentHTML(
    "beforeend",
    dealCardHTML(card)
  );

  const dealt = container.lastElementChild;
  if (!dealt) return;

  // Lá bài bay từ shoe tới cửa chơi và vẫn úp.
  await sleep(520);
  if (token !== dealAnimationToken) return;

  dealt.classList.remove("dealing");
  dealt.classList.add("landed");

  // Dừng ngắn như dealer đặt bài xuống bàn.
  await sleep(300);
  if (token !== dealAnimationToken) return;

  boTableMessage.textContent = "Đang mở bài";
  boResult.textContent = "ĐANG MỞ BÀI...";
  dealt.classList.add("squeeze-ready");

  // Bước 1: hé một góc lá bài.
  await sleep(260);
  if (token !== dealAnimationToken) return;
  dealt.classList.add("squeeze-1");

  // Bước 2: kéo mở thêm, mô phỏng kiểu squeeze Baccarat.
  await sleep(520);
  if (token !== dealAnimationToken) return;
  dealt.classList.remove("squeeze-1");
  dealt.classList.add("squeeze-2");

  // Bước 3: mở gần hết mặt bài.
  await sleep(520);
  if (token !== dealAnimationToken) return;
  dealt.classList.remove("squeeze-2");
  dealt.classList.add("squeeze-3");

  // Cuối cùng lật hẳn mặt bài lên.
  await sleep(420);
  if (token !== dealAnimationToken) return;
  dealt.classList.remove("face-down", "squeeze-ready", "squeeze-3");
  dealt.classList.add("flipping");
  setDealerMessage(`MỞ BÀI ${sideName}`, container);
  playCasinoSound("flip");

  await sleep(680);
  if (token !== dealAnimationToken) return;

  dealt.classList.remove("flipping");
  dealt.classList.add("face-up");
  boCardShoe?.classList.remove("is-dealing");
  hideDealerMessage(180);
}

async function animateFinishedRound(round) {
  if (!round) return;

  const token = ++dealAnimationToken;
  activeDealRoundId = round.id;
  const playerCards = Array.isArray(round.player_cards) ? round.player_cards : [];
  const bankerCards = Array.isArray(round.banker_cards) ? round.banker_cards : [];

  renderCards([], boPlayerCards);
  renderCards([], boBankerCards);

  boPlayerScore.textContent = "—";
  boBankerScore.textContent = "—";
  boResult.textContent = "ĐANG CHIA BÀI...";
  boResult.classList.add("dealing-result");
  document.querySelector(".bo-hands")?.classList.add("is-dealing");
  document.querySelector(".bo-table")?.classList.add("opening-cards");
  boCardShoe?.classList.add("active");
  boTableMessage.textContent = "Đang chia bài";
  ensureV21UI();
  setDealerMessage("BẮT ĐẦU CHIA BÀI");

  const dealOrder = [
    [playerCards[0], boPlayerCards],
    [bankerCards[0], boBankerCards],
    [playerCards[1], boPlayerCards],
    [bankerCards[1], boBankerCards],
    [playerCards[2], boPlayerCards],
    [bankerCards[2], boBankerCards]
  ].filter(([card]) => card);

  for (const [card, container] of dealOrder) {
    if (token !== dealAnimationToken) return;
    boTableMessage.textContent = "Đang chia bài";
    boResult.textContent = "ĐANG CHIA BÀI...";
    await appendAnimatedCard(card, container, token);
    if (token !== dealAnimationToken) return;
    await sleep(260);
  }

  if (token !== dealAnimationToken) return;

  await sleep(1000);
  if (token !== dealAnimationToken) return;

  boPlayerScore.textContent = round.player_score ?? "—";
  boBankerScore.textContent = round.banker_score ?? "—";
  boTableMessage.textContent = "Đã tính điểm";

  await sleep(1000);
  if (token !== dealAnimationToken) return;

  boResult.classList.remove("dealing-result");
  document.querySelector(".bo-hands")?.classList.remove("is-dealing");
  document.querySelector(".bo-table")?.classList.remove("opening-cards");
  boCardShoe?.classList.remove("active", "is-dealing");
  renderResult();
  boTableMessage.textContent = "Ván đã kết thúc";
  setDealerMessage(resultLabel(round.result));
  await showV21ResultFx(round);
  hideDealerMessage(1400);

  if (activeDealRoundId === round.id) {
    activeDealRoundId = null;
  }

  // Chỉ cập nhật cầu sau khi người chơi đã xem xong toàn bộ phần mở bài.
  await loadRoadHistory();

  // Chỉ bắt đầu đếm thời gian sang ván mới sau khi chia bài xong.
  scheduleNextRound(true);
}

function formatVNC(value) {

  return Number(value || 0)
    .toLocaleString("vi-VN");
}


function setStatus(message, type = "") {

  if (!boStatus) return;

  boStatus.textContent = message;

  boStatus.classList.remove(
    "ok",
    "bad"
  );

  if (type) {
    boStatus.classList.add(type);
  }
}


function setBetMessage(message, bad = false) {

  if (!boBetMessage) return;

  boBetMessage.textContent = message;

  boBetMessage.style.color =
    bad ? "#ff9999" : "";
}


// ================================
// AUTH
// ================================

async function initAuth() {

  try {

    const {
      data: { session },
      error
    } = await sb.auth.getSession();

    if (error) throw error;

    if (!session) {

      setStatus(
        "Bạn chưa đăng nhập.",
        "bad"
      );

      setTimeout(() => {

        location.href = "index.html";

      }, 1200);

      return;
    }

    currentUser = session.user;

    await loadProfile();

    await loadRoom();

  } catch (error) {

    console.error(
      "Init auth:",
      error
    );

    setStatus(
      error?.message ||
      "Không thể kết nối.",
      "bad"
    );
  }
}


// ================================
// PROFILE
// ================================

async function loadProfile() {

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select(
      "id,username,role,balance,is_suspended"
    )
    .eq(
      "id",
      currentUser.id
    )
    .single();

  if (error) throw error;

  currentProfile = data;

  boBalance.textContent =
    formatVNC(data.balance);

  if (data.is_suspended) {

    throw new Error(
      "Tài khoản đang bị khóa."
    );
  }

  if (
    data.role === "admin" &&
    boAdminPanel
  ) {

    boAdminPanel.hidden = false;
  }
}


// ================================
// ROOM
// ================================

async function loadRoom() {

  try {

    const {
      data,
      error
    } = await sb
      .from("baccarat_rooms")
      .select("*")
      .eq(
        "room_code",
        "NXR001"
      )
      .single();

    if (error) throw error;

    currentRoom = data;

    boRoomName.textContent =
      data.name === "NEXORA Room 1" ? "LS79win Room 1" : data.name;

    boRoomCode.textContent =
      data.room_code;

    setStatus(
      "Đã kết nối phòng online",
      "ok"
    );

    await loadCurrentRound();
    await loadRoadHistory();

    subscribeRoom();

  } catch (error) {

    console.error(
      "Load room:",
      error
    );

    setStatus(
      error?.message ||
      "Không tìm thấy phòng.",
      "bad"
    );
  }
}


// ================================
// CURRENT ROUND
// ================================

async function loadCurrentRound() {

  if (!currentRoom) return;

  try {

    const {
      data,
      error
    } = await sb
      .from("baccarat_rounds")
      .select("*")
      .eq(
        "room_id",
        currentRoom.id
      )
      .order(
        "round_number",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    currentRound = data || null;

    renderRound();

    await loadMyBets();
    await loadBetStats();
    startBetStatsPolling();

  } catch (error) {

    console.error(
      "Load round:",
      error
    );

    setStatus(
      "Không thể tải ván.",
      "bad"
    );
  }
}


// ================================
// RENDER ROUND
// ================================

function renderRound() {

  boCountdown?.classList.remove("warning", "danger");
  document.querySelector(".bo-room-card")?.classList.remove("bet-closing");
  document.querySelector(".bo-table")?.classList.remove("winner-player", "winner-banker", "winner-tie");

  clearInterval(
    countdownTimer
  );

  if (
    currentRound?.status !== "finished"
  ) {

    clearTimeout(
      autoRoundTimer
    );
  }

  if (currentRound?.status !== "finished") {
    ++dealAnimationToken;
    activeDealRoundId = null;
    boResult?.classList.remove("dealing-result");
    document.querySelector(".bo-hands")?.classList.remove("is-dealing");
    document.querySelector(".bo-table")?.classList.remove("opening-cards");
    boCardShoe?.classList.remove("active", "is-dealing");
  }

  if (!currentRound) {

    boRoundNumber.textContent = "—";

    boRoundStatus.textContent =
      "Chờ ván";

    boCountdown.textContent = "—";

    boPlayerScore.textContent = "—";
    boBankerScore.textContent = "—";

    renderCards([], boPlayerCards);
    renderCards([], boBankerCards);

    boResult.textContent =
      "Chưa có kết quả";

    boTableMessage.textContent =
      "Đang chờ Admin tạo ván";

    updateBetButton();

    return;
  }

  boRoundNumber.textContent =
    "#" + currentRound.round_number;

  const statusMap = {

    betting: "Đang cược",

    locked: "Đã khóa",

    finished: "Kết thúc"

  };

  boRoundStatus.textContent =
    statusMap[
      currentRound.status
    ] ||
    currentRound.status;

  if (
    currentRound.status ===
    "finished"
  ) {

    boCountdown.textContent = "0s";

    const finishedAt = currentRound.finished_at
      ? new Date(currentRound.finished_at).getTime()
      : 0;

    const isFreshResult =
      finishedAt > 0 &&
      Date.now() - finishedAt < 10000;

    const shouldAnimate =
      isFreshResult &&
      lastAnimatedRoundId !== currentRound.id;

    const animationAlreadyRunning =
      activeDealRoundId === currentRound.id;

    if (shouldAnimate) {
      lastAnimatedRoundId = currentRound.id;
      animateFinishedRound(currentRound);
    } else if (!animationAlreadyRunning) {
      ++dealAnimationToken;
      boPlayerScore.textContent =
        currentRound.player_score ?? "—";

      boBankerScore.textContent =
        currentRound.banker_score ?? "—";

      renderCards(
        currentRound.player_cards || [],
        boPlayerCards
      );

      renderCards(
        currentRound.banker_cards || [],
        boBankerCards
      );

      boResult.classList.remove("dealing-result");
      document.querySelector(".bo-hands")?.classList.remove("is-dealing");
      renderResult();

      boTableMessage.textContent =
        "Ván đã kết thúc";
    }

    if (!shouldAnimate && !animationAlreadyRunning) {
      scheduleNextRound(false);
    }

  } else if (
    currentRound.status ===
    "betting"
  ) {

    boPlayerScore.textContent = "—";
    boBankerScore.textContent = "—";

    renderCards([], boPlayerCards);
    renderCards([], boBankerCards);

    boResult.textContent =
      "Đang nhận cược";

    boTableMessage.textContent =
      "Hãy chọn cửa cược";

    startCountdown();

  } else {

    boCountdown.textContent = "—";

    renderCards([], boPlayerCards);
    renderCards([], boBankerCards);

    boTableMessage.textContent =
      "Đang xử lý kết quả";
  }

  updateBetButton();
}

// ================================
// COUNTDOWN
// ================================

function startCountdown() {

  clearInterval(
    countdownTimer
  );


  function tick() {

    if (
      !currentRound ||
      currentRound.status !==
      "betting"
    ) {

      clearInterval(
        countdownTimer
      );

      return;
    }


    const end =
      new Date(
        currentRound.betting_ends_at
      ).getTime();


    const remaining =
      Math.max(
        0,
        Math.ceil(
          (end - Date.now()) /
          1000
        )
      );


    boCountdown.textContent =
      remaining + "s";

    boCountdown.classList.toggle("warning", remaining <= 10 && remaining > 5);
    boCountdown.classList.toggle("danger", remaining <= 5 && remaining > 0);
    document.querySelector(".bo-room-card")?.classList.toggle("bet-closing", remaining <= 5 && remaining > 0);


    if (remaining <= 0) {

  clearInterval(
    countdownTimer
  );

  boRoundStatus.textContent =
    "Hết giờ";

  boTableMessage.textContent =
    "Đang xử lý kết quả...";

  updateBetButton();


  // Chờ thêm một chút để chắc chắn
  // thời gian server đã qua betting_ends_at

  setTimeout(
    settleCurrentRound,
    1200
  );
}
  }
  tick();

  countdownTimer =
    setInterval(
      tick,
      500
    );
}

// ================================
// SETTLE ROUND
// ================================

async function settleCurrentRound() {

  if (!currentRound) return;


  if (
    currentRound.status ===
    "finished"
  ) {

    return;
  }


  if (
    settlingRoundId ===
    currentRound.id
  ) {

    return;
  }


  settlingRoundId =
    currentRound.id;


  try {

    const {
      data,
      error
    } = await sb.rpc(
      "baccarat_settle_round",
      {
        p_round_id:
          currentRound.id
      }
    );


    if (error) throw error;


    console.log(
      "Round settled:",
      data
    );


    await loadCurrentRound();

    await loadProfile();

    await loadMyBets();


  } catch (error) {

    console.error(
      "Settle round:",
      error
    );


    boTableMessage.textContent =
      error?.message ||
      "Không thể xử lý kết quả.";


  } finally {

    settlingRoundId = null;
  }
}
// ================================
// AUTO NEXT ROUND
// ================================

function scheduleNextRound(afterAnimation = false) {

  clearTimeout(
    autoRoundTimer
  );


  if (
    !currentRoom ||
    !currentRound ||
    currentRound.status !== "finished"
  ) {

    return;
  }


  let wait;

  if (afterAnimation) {
    // Giữ kết quả đủ lâu sau khi animation hoàn tất.
    wait = RESULT_DISPLAY_MS;
  } else {
    // Với ván cũ/đã xem rồi, vẫn giữ cơ chế phục hồi auto-loop.
    const finishedAt =
      currentRound.finished_at
        ? new Date(
            currentRound.finished_at
          ).getTime()
        : Date.now();

    const elapsed =
      Date.now() - finishedAt;

    wait = Math.max(
      500,
      RESULT_DISPLAY_MS - elapsed
    );
  }


  boTableMessage.textContent =
    "Ván đã kết thúc • Chuẩn bị ván mới";


  autoRoundTimer =
    setTimeout(
      createNextRound,
      wait
    );
}


async function createNextRound() {

  if (
    !currentRoom ||
    creatingNextRound
  ) {

    return;
  }


  creatingNextRound = true;


  try {

    const {
      error
    } = await sb.rpc(
      "baccarat_create_next_round",
      {
        p_room_id:
          currentRoom.id,

        p_betting_seconds:
          AUTO_BETTING_SECONDS
      }
    );


    if (error) throw error;


    await loadCurrentRound();


    // Có thể request đến sớm hơn
    // mốc 5 giây của server.
    // Nếu round vẫn finished thì thử lại.

    if (
      currentRound?.status ===
      "finished"
    ) {

      clearTimeout(
        autoRoundTimer
      );

      autoRoundTimer =
        setTimeout(
          createNextRound,
          1200
        );
    }


  } catch (error) {

    console.error(
      "Create next round:",
      error
    );


    // Lỗi mạng tạm thời:
    // thử lại sau vài giây.

    clearTimeout(
      autoRoundTimer
    );

    autoRoundTimer =
      setTimeout(
        createNextRound,
        3000
      );


  } finally {

    creatingNextRound = false;
  }
}

// ================================
// RESULT
// ================================

function renderResult() {

  if (!currentRound?.result) {

    boResult.textContent =
      "Chưa có kết quả";

    return;
  }


  const resultMap = {

    player: "PLAYER THẮNG",

    banker: "BANKER THẮNG",

    tie: "HÒA"

  };


  boResult.textContent =
    resultMap[
      currentRound.result
    ] ||
    currentRound.result;

  const table = document.querySelector(".bo-table");
  table?.classList.remove("winner-player", "winner-banker", "winner-tie");
  table?.classList.add(`winner-${currentRound.result}`);
}


// ================================
// SELECT BET
// ================================

document
  .querySelectorAll(
    "[data-bet-on]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        selectedBet =
          button.dataset.betOn;

        document
          .querySelectorAll(
            "[data-bet-on]"
          )
          .forEach(b => {

            b.classList.remove(
              "active"
            );
          });


        button.classList.add(
          "active"
        );

        setBetMessage("");

        updateBetButton();
      }
    );
  });


// ================================
// QUICK AMOUNT
// ================================

document
  .querySelectorAll("[data-bo-amount]")
  .forEach(button => {
    button.addEventListener("click", () => {
      const chip = Number(button.dataset.boAmount || 0);
      const current = Math.max(0, Math.floor(Number(boBetAmount.value || 0)));
      const next = Math.min(MAX_BET_AMOUNT, current + chip);

      boBetAmount.value = next;

      button.classList.remove("chip-tap");
      void button.offsetWidth;
      button.classList.add("chip-tap");
      setTimeout(() => button.classList.remove("chip-tap"), 340);

      if (current + chip > MAX_BET_AMOUNT) {
        setBetMessage(
          `Tối đa ${formatVNC(MAX_BET_AMOUNT)} VNC mỗi lần cược.`,
          true
        );
      } else {
        setBetMessage("");
      }

      updateBetButton();
    });
  });

document
  .querySelector("[data-bo-clear]")
  ?.addEventListener("click", () => {
    boBetAmount.value = "";
    setBetMessage("");
    updateBetButton();
  });


boBetAmount?.addEventListener(
  "input",
  updateBetButton
);


function updateBetPreview() {
  if (!boBetPreview) return;

  const labels = { player: "PLAYER", banker: "BANKER", tie: "TIE" };
  const amount = Math.floor(Number(boBetAmount?.value || 0));

  if (!selectedBet) {
    boBetPreview.textContent = "Chọn PLAYER, TIE hoặc BANKER để đặt cược.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    boBetPreview.textContent = `Bạn đang chọn ${labels[selectedBet]} • nhập số VNC muốn cược`;
    return;
  }

  boBetPreview.textContent =
    `Bạn đang cược: ${labels[selectedBet]} • ${formatVNC(amount)} VNC`;
}

// ================================
// BET BUTTON STATE
// ================================

function updateBetButton() {

  if (!boPlaceBet) return;
  updateBetPreview();


  const amount =
    Number(
      boBetAmount?.value || 0
    );


  const bettingOpen =
    currentRound &&
    currentRound.status ===
      "betting" &&
    new Date(
      currentRound.betting_ends_at
    ).getTime() >
      Date.now();


  const ready =
    bettingOpen &&
    selectedBet &&
    Number.isFinite(amount) &&
    amount >= MIN_BET_AMOUNT &&
    amount <= MAX_BET_AMOUNT;


  boPlaceBet.disabled =
    !ready;


  if (!selectedBet) {

    boPlaceBet.textContent =
      "CHỌN CỬA CƯỢC";

    return;
  }


  const labels = {

    player: "PLAYER",

    banker: "BANKER",

    tie: "TIE"

  };


  boPlaceBet.textContent =
    `CƯỢC ${labels[selectedBet]}`;
}


// ================================
// PLACE BET
// ================================

boPlaceBet?.addEventListener(
  "click",
  async () => {

    if (
      !currentRound ||
      !selectedBet
    ) return;


    const amount =
      Math.floor(
        Number(
          boBetAmount.value
        )
      );


    if (
      !Number.isFinite(amount) ||
      amount < MIN_BET_AMOUNT ||
      amount > MAX_BET_AMOUNT
    ) {

      setBetMessage(
        `Mỗi lần cược từ ${formatVNC(MIN_BET_AMOUNT)} đến ${formatVNC(MAX_BET_AMOUNT)} VNC.`,
        true
      );

      return;
    }


    boPlaceBet.disabled = true;

    setBetMessage(
      "Đang gửi cược..."
    );


    try {

      const {
        error
      } = await sb.rpc(
        "baccarat_place_bet",
        {

          p_round_id:
            currentRound.id,

          p_bet_on:
            selectedBet,

          p_amount:
            amount
        }
      );


      if (error) throw error;


      setBetMessage(
        `✓ Đã cược ${formatVNC(amount)} VNC`
      );

      const placedSide = selectedBet;
      const placedButton = document.querySelector(`[data-bet-on="${placedSide}"]`);
      placedButton?.classList.remove("chip-land");
      void placedButton?.offsetWidth;
      placedButton?.classList.add("chip-land");
      setTimeout(() => placedButton?.classList.remove("chip-land"), 800);


      boBetAmount.value = "";

      selectedBet = null;


      document
        .querySelectorAll(
          "[data-bet-on]"
        )
        .forEach(button => {

          button.classList.remove(
            "active"
          );
        });


      await loadProfile();

      await loadMyBets();
      await loadBetStats();

      updateBetButton();


    } catch (error) {

      console.error(
        "Place bet:",
        error
      );

      setBetMessage(
        error?.message ||
        "Không thể đặt cược.",
        true
      );

      updateBetButton();
    }
  }
);


// ================================
// LIVE BET STATS
// ================================

function resetBetStatsUI() {
  const zeroAmount = "0 VNC";
  const zeroPlayers = "0 người";

  if (boPlayerBetAmount) boPlayerBetAmount.textContent = zeroAmount;
  if (boPlayerBetPlayers) boPlayerBetPlayers.textContent = zeroPlayers;
  if (boTieBetAmount) boTieBetAmount.textContent = zeroAmount;
  if (boTieBetPlayers) boTieBetPlayers.textContent = zeroPlayers;
  if (boBankerBetAmount) boBankerBetAmount.textContent = zeroAmount;
  if (boBankerBetPlayers) boBankerBetPlayers.textContent = zeroPlayers;
  if (boTableBetAmount) boTableBetAmount.textContent = zeroAmount;
  if (boTableBetPlayers) boTableBetPlayers.textContent = zeroPlayers;
}

function setBetStat(amountEl, playersEl, stats) {
  const amount = Number(stats?.amount || 0);
  const players = Number(stats?.players || 0);

  if (amountEl) {
    amountEl.textContent = `${formatVNC(amount)} VNC`;
  }

  if (playersEl) {
    playersEl.textContent = `${players} người`;
  }
}

async function loadBetStats() {
  if (!currentRound) {
    resetBetStatsUI();
    return;
  }

  try {
    const { data, error } = await sb.rpc(
      "baccarat_get_bet_stats",
      { p_round_id: currentRound.id }
    );

    if (error) throw error;

    const stats = data || {};

    setBetStat(
      boPlayerBetAmount,
      boPlayerBetPlayers,
      stats.player
    );

    setBetStat(
      boTieBetAmount,
      boTieBetPlayers,
      stats.tie
    );

    setBetStat(
      boBankerBetAmount,
      boBankerBetPlayers,
      stats.banker
    );

    if (boTableBetAmount) {
      boTableBetAmount.textContent =
        `${formatVNC(Number(stats.total_amount || 0))} VNC`;
    }

    if (boTableBetPlayers) {
      boTableBetPlayers.textContent =
        `${Number(stats.total_players || 0)} người`;
    }
  } catch (error) {
    console.error("Load bet stats:", error);
  }
}

function startBetStatsPolling() {
  clearInterval(betStatsTimer);
  betStatsTimer = null;

  if (
    !currentRound ||
    currentRound.status !== "betting"
  ) {
    return;
  }

  betStatsTimer = setInterval(
    loadBetStats,
    1500
  );
}

// ================================
// MY BETS
// ================================

async function loadMyBets() {

  if (
    !currentUser ||
    !boBetList
  ) return;


  try {

    let query = sb
      .from("baccarat_bets")
      .select(
        "id,round_id,bet_on,amount,payout,created_at"
      )
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(20);


    if (currentRound) {

      query = query.eq(
        "round_id",
        currentRound.id
      );
    }


    const {
      data,
      error
    } = await query;


    if (error) throw error;


    const roundTotals = { player: 0, banker: 0, tie: 0 };
    (data || []).forEach(bet => {
      if (roundTotals[bet.bet_on] !== undefined) {
        roundTotals[bet.bet_on] += Number(bet.amount || 0);
      }
    });

    if (boMyRoundBets) {
      boMyRoundBets.innerHTML = `
        <span>PLAYER <b>${formatVNC(roundTotals.player)}</b></span>
        <span>TIE <b>${formatVNC(roundTotals.tie)}</b></span>
        <span>BANKER <b>${formatVNC(roundTotals.banker)}</b></span>
      `;
    renderOwnRoundBets(roundTotals);
    lastOwnRoundTotals = { ...roundTotals };
    }

    if (
      !data ||
      !data.length
    ) {

      boBetList.innerHTML =
        '<p class="bo-muted">Chưa có cược trong ván này.</p>';

      return;
    }


    const labels = {

      player: "PLAYER",

      banker: "BANKER",

      tie: "TIE"

    };


    boBetList.innerHTML =
      data.map(bet => {

        const time =
          new Date(
            bet.created_at
          ).toLocaleTimeString(
            "vi-VN"
          );


        return `
          <div class="bo-bet-row">

            <div>

              <strong>
                ${labels[bet.bet_on] || bet.bet_on}
              </strong>

              <span>
                ${time}
              </span>

            </div>

            <strong>
              ${formatVNC(bet.amount)} VNC
            </strong>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Load bets:",
      error
    );

    boBetList.innerHTML =
      '<p class="bo-muted">Không thể tải cược.</p>';
  }
}


$("boRefreshBets")
  ?.addEventListener(
    "click",
    loadMyBets
  );


// ================================
// ADMIN CREATE ROUND
// ================================

boCreateRound?.addEventListener(
  "click",
  async () => {

    if (
      !currentRoom ||
      currentProfile?.role !==
        "admin"
    ) return;


    const seconds =
      Math.floor(
        Number(
          boBettingSeconds.value
        )
      );


    if (
      !Number.isFinite(seconds) ||
      seconds < 5 ||
      seconds > 120
    ) {

      alert(
        "Thời gian phải từ 5 đến 120 giây."
      );

      return;
    }


    boCreateRound.disabled = true;

    boCreateRound.textContent =
      "ĐANG TẠO...";


    try {

      const {
        error
      } = await sb.rpc(
        "admin_create_baccarat_round",
        {

          p_room_id:
            currentRoom.id,

          p_betting_seconds:
            seconds
        }
      );


      if (error) throw error;


      await loadCurrentRound();


    } catch (error) {

      console.error(
        "Create round:",
        error
      );

      alert(
        error?.message ||
        "Không thể tạo ván."
      );

    } finally {

      boCreateRound.disabled = false;

      boCreateRound.textContent =
        "+ TẠO VÁN MỚI";
    }
  }
);


// ================================
// BACCARAT ROAD HISTORY
// ================================

function buildBigRoad(rounds) {
  const cells = [];
  let lastBase = null;
  let row = 0;
  let col = -1;
  const occupied = new Set();
  let pendingTies = 0;

  for (const round of rounds) {
    const result = round.result;

    if (result === "tie") {
      if (cells.length) {
        cells[cells.length - 1].ties += 1;
      } else {
        pendingTies += 1;
      }
      continue;
    }

    if (result !== "player" && result !== "banker") continue;

    if (lastBase === null || result !== lastBase) {
      col += 1;
      row = 0;
      while (occupied.has(`${row}:${col}`)) col += 1;
    } else {
      const downKey = `${row + 1}:${col}`;
      if (row < 5 && !occupied.has(downKey)) {
        row += 1;
      } else {
        col += 1;
        while (occupied.has(`${row}:${col}`)) col += 1;
      }
    }

    const cell = {
      row,
      col,
      result,
      ties: pendingTies,
      roundNumber: round.round_number
    };

    pendingTies = 0;
    cells.push(cell);
    occupied.add(`${row}:${col}`);
    lastBase = result;
  }

  return cells;
}

function renderBigRoad(rounds) {
  if (!boBigRoad) return;

  const cells = buildBigRoad(rounds);

  if (!cells.length) {
    boBigRoad.innerHTML =
      '<p class="bo-road-empty">Chưa có dữ liệu đại lộ.</p>';
    return;
  }

  boBigRoad.innerHTML = cells.map(cell => {
    const label = cell.result === "player" ? "P" : "B";
    const tieBadge = cell.ties > 0
      ? `<span class="tie-badge">${cell.ties}</span>`
      : "";

    return `
      <div
        class="bo-big-dot ${cell.result}"
        style="grid-row:${cell.row + 1};grid-column:${cell.col + 1}"
        title="Ván #${cell.roundNumber}"
      >
        ${label}${tieBadge}
      </div>
    `;
  }).join("");

  const scroller = boBigRoad.parentElement;
  if (scroller) {
    requestAnimationFrame(() => {
      scroller.scrollLeft = scroller.scrollWidth;
    });
  }
}

async function loadRoadHistory() {
  if (!currentRoom || !boRoadHistory) return;

  try {
    const shoe = await loadShoeState({ animate: true });
    const lastShuffleRound =
      Number(shoe?.last_shuffle_round_number || 0);

    let query = sb
      .from("baccarat_rounds")
      .select("id,round_number,result")
      .eq("room_id", currentRoom.id)
      .eq("status", "finished");

    if (lastShuffleRound > 0) {
      query = query.gt("round_number", lastShuffleRound);
    }

    const { data, error } = await query
      .order("round_number", { ascending: false })
      .limit(80);

    if (error) throw error;

    if (!data || !data.length) {
      boRoadHistory.innerHTML =
        '<p class="bo-road-empty">Chưa có lịch sử ván.</p>';

      if (boBigRoad) {
        boBigRoad.innerHTML =
          '<p class="bo-road-empty">Chưa có dữ liệu đại lộ.</p>';
      }

      if (boRoadStats) boRoadStats.textContent = "P 0 · B 0 · T 0";
      if (boShoePlayerStat) boShoePlayerStat.textContent = "0";
      if (boShoeBankerStat) boShoeBankerStat.textContent = "0";
      if (boShoeTieStat) boShoeTieStat.textContent = "0";

      renderDerivedRoad(boBigEyeRoad, [], 1);
      renderDerivedRoad(boSmallRoad, [], 2);
      renderDerivedRoad(boCockroachRoad, [], 3);
      return;
    }

    // Giữ kín kết quả ván đang chia/lật bài khỏi các bảng cầu.
    const hiddenRoundId = activeDealRoundId;

    const rounds = [...data]
      .filter(round => {
        if (!hiddenRoundId) return true;

        if (round.id) {
          return round.id !== hiddenRoundId;
        }

        return !(
          currentRound &&
          currentRound.id === hiddenRoundId &&
          Number(round.round_number) === Number(currentRound.round_number)
        );
      })
      .reverse();

    // Bead Road keeps more of the current shoe visible.
    const recentRounds = rounds.slice(-72);

    boRoadHistory.innerHTML = recentRounds.map(round => {
      let className = "road-tie";
      let label = "T";

      if (round.result === "player") {
        className = "road-player";
        label = "P";
      } else if (round.result === "banker") {
        className = "road-banker";
        label = "B";
      }

      return `<div class="bo-road-dot ${className}" title="Ván #${round.round_number}">${label}</div>`;
    }).join("");

    const counts = rounds.reduce((acc, round) => {
      if (round.result === "player") acc.player += 1;
      else if (round.result === "banker") acc.banker += 1;
      else if (round.result === "tie") acc.tie += 1;
      return acc;
    }, { player:0, banker:0, tie:0 });

    if (boRoadStats) {
      boRoadStats.textContent =
        `P ${counts.player} · B ${counts.banker} · T ${counts.tie}`;
    }

    // V22.2: the three counters above the road now reflect the
    // currently visible shoe instead of staying stuck at 0.
    if (boShoePlayerStat) boShoePlayerStat.textContent = String(counts.player);
    if (boShoeBankerStat) boShoeBankerStat.textContent = String(counts.banker);
    if (boShoeTieStat) boShoeTieStat.textContent = String(counts.tie);

    renderBigRoad(rounds);

    // Keep all road tabs populated whenever history refreshes.
    renderDerivedRoad(boBigEyeRoad, rounds, 1);
    renderDerivedRoad(boSmallRoad, rounds, 2);
    renderDerivedRoad(boCockroachRoad, rounds, 3);

  } catch (error) {
    console.error("Load road history:", error);
    boRoadHistory.innerHTML =
      '<p class="bo-road-empty">Không thể tải lịch sử.</p>';
    if (boBigRoad) {
      boBigRoad.innerHTML =
        '<p class="bo-road-empty">Không thể tải đại lộ.</p>';
    }

    if (boShoePlayerStat) boShoePlayerStat.textContent = "—";
    if (boShoeBankerStat) boShoeBankerStat.textContent = "—";
    if (boShoeTieStat) boShoeTieStat.textContent = "—";
  }
}



function chipLabel(amount) {
  if (amount >= 1000000) return `${Math.floor(amount / 1000000)}M`;
  if (amount >= 1000) return `${Math.floor(amount / 1000)}K`;
  return String(amount);
}

function chipClass(amount) {
  if (amount >= 1000000) return "c1m";
  if (amount >= 500000) return "c500";
  if (amount >= 100000) return "c100";
  if (amount >= 50000) return "c50";
  return "c10";
}

function renderOwnChipStack(container, total) {
  if (!container) return;
  container.innerHTML = "";
  if (!total) return;

  const denoms = [1000000, 500000, 100000, 50000, 10000];
  let remaining = total;
  const chips = [];

  for (const denom of denoms) {
    while (remaining >= denom && chips.length < 5) {
      chips.push(denom);
      remaining -= denom;
    }
  }

  if (!chips.length) chips.push(Math.min(total, 10000));

  chips.slice(-5).forEach((amount, index) => {
    const chip = document.createElement("span");
    chip.className = `bo-mini-chip ${chipClass(amount)}`;
    chip.textContent = chipLabel(amount);
    chip.style.setProperty("--chip-i", index);
    container.appendChild(chip);
  });
}

function renderOwnRoundBets(totals = {}) {
  const player = Number(totals.player || 0);
  const tie = Number(totals.tie || 0);
  const banker = Number(totals.banker || 0);

  if (boPlayerOwnBet) boPlayerOwnBet.textContent = `Bạn: ${formatVNC(player)} VNC`;
  if (boTieOwnBet) boTieOwnBet.textContent = `Bạn: ${formatVNC(tie)} VNC`;
  if (boBankerOwnBet) boBankerOwnBet.textContent = `Bạn: ${formatVNC(banker)} VNC`;

  renderOwnChipStack(boPlayerChipStack, player);
  renderOwnChipStack(boTieChipStack, tie);
  renderOwnChipStack(boBankerChipStack, banker);
}

function renderDerivedRoad(container, items, offset) {
  if (!container) return;
  container.innerHTML = "";

  const decisive = items.filter(x => x.result === "player" || x.result === "banker");
  if (decisive.length <= offset) {
    container.innerHTML = '<p class="bo-road-empty">Chưa đủ dữ liệu.</p>';
    return;
  }

  decisive.slice(offset).forEach((item, index) => {
    const prev = decisive[index];
    const same = prev && prev.result === item.result;
    const dot = document.createElement("span");
    dot.className = `bo-derived-dot ${same ? "red" : "blue"}`;
    dot.title = same ? "Đỏ" : "Xanh";
    container.appendChild(dot);
  });
}

function setupRoadTypeTabs() {
  document.querySelectorAll("[data-road-type]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-road-type]").forEach(x => x.classList.remove("active"));
      document.querySelectorAll("[data-road-panel]").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-road-panel="${btn.dataset.roadType}"]`)?.classList.add("active");
    });
  });
}

async function loadShoeState({ animate = false } = {}) {
  if (!currentRoom) return null;

  try {
    const { data, error } = await sb.rpc(
      "baccarat_get_shoe_state",
      { p_room_id: currentRoom.id }
    );

    if (error) throw error;

    const state = Array.isArray(data) ? data[0] : data;
    if (!state) return null;

    const previous = lastSeenShoeNumber;
    currentShoeState = state;
    lastSeenShoeNumber = Number(state.shoe_number);

    if (boShoeNumber) {
      boShoeNumber.textContent = `#${state.shoe_number}`;
    }

    if (boShoeProgress) {
      boShoeProgress.textContent =
        `${state.rounds_played}/${state.target_rounds}`;
    }

    if (boShuffleStatus) {
      boShuffleStatus.textContent = "Đang chơi";
      boShuffleStatus.classList.remove("is-shuffling");
    }

    if (
      animate &&
      previous !== null &&
      Number(state.shoe_number) > Number(previous)
    ) {
      playShuffleEffect();
    }

    return state;
  } catch (error) {
    console.error("Load shoe state:", error);
    if (boShoeProgress) boShoeProgress.textContent = "—";
    return null;
  }
}

function playShuffleEffect() {
  clearTimeout(shuffleFxTimer);
  playCasinoSound("shuffle");
  setDealerMessage("ĐANG XÀO BÀI");

  const table = document.querySelector(".bo-table");
  table?.classList.add("is-shuffling");

  if (boShuffleStatus) {
    boShuffleStatus.textContent = "ĐANG XÀO BÀI";
    boShuffleStatus.classList.add("is-shuffling");
  }

  if (boTableMessage) {
    boTableMessage.textContent = "Đang xào bài • Bắt đầu bộ bài mới";
  }

  shuffleFxTimer = setTimeout(() => {
    table?.classList.remove("is-shuffling");
    if (boShuffleStatus) {
      boShuffleStatus.textContent = "Bộ bài mới";
      boShuffleStatus.classList.remove("is-shuffling");
    }
  }, 2800);
}

// ================================
// SUPABASE REALTIME
// ================================

function subscribeRoom() {

  if (!currentRoom) return;


  sb.channel(
    "baccarat-room-" +
    currentRoom.id
  )

  .on(
    "postgres_changes",
    {

      event: "*",

      schema: "public",

      table: "baccarat_rounds",

      filter:
        `room_id=eq.${currentRoom.id}`

    },

    async () => {

      await loadCurrentRound();

      await loadProfile();

      await loadMyBets();
      await loadBetStats();
      startBetStatsPolling();

      await loadRoadHistory();

    }
  )

  .subscribe(status => {

    console.log(
      "Realtime:",
      status
    );

  });
}


// ================================
// REFRESH ON RETURN
// ================================

window.addEventListener(
  "pageshow",
  async () => {

    if (!currentUser) return;

    try {

      await loadProfile();

      await loadCurrentRound();

    } catch (error) {

      console.error(
        "Pageshow refresh:",
        error
      );
    }
  }
);


document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      document.visibilityState !==
        "visible" ||
      !currentUser
    ) return;


    try {

      await loadProfile();

      await loadCurrentRound();

    } catch (error) {

      console.error(
        "Visibility refresh:",
        error
      );
    }
  }
);


// ================================
// START
// ================================

ensureV21UI();
initAuth();


// ================================
// V14 COMPACT TABS
// ================================
function setBaccaratTab(tabName) {
  document.querySelectorAll("[data-bo-tab]").forEach(button => {
    const active = button.dataset.boTab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll("[data-bo-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.boPanel === tabName);
  });
}

document.querySelectorAll("[data-bo-tab]").forEach(button => {
  button.addEventListener("click", () => setBaccaratTab(button.dataset.boTab));
});

setupRoadTypeTabs();
