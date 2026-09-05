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
let dealAnimationToken = 0;
let betStatsTimer = null;
let currentShoeState = null;
let lastSeenShoeNumber = null;
let shuffleFxTimer = null;

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

  await sleep(680);
  if (token !== dealAnimationToken) return;

  dealt.classList.remove("flipping");
  dealt.classList.add("face-up");
  boCardShoe?.classList.remove("is-dealing");
}

async function animateFinishedRound(round) {
  if (!round) return;

  const token = ++dealAnimationToken;
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

    if (shouldAnimate) {
      lastAnimatedRoundId = currentRound.id;
      animateFinishedRound(currentRound);
    } else {
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

    if (!shouldAnimate) {
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
      .select("round_number,result")
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
      return;
    }

    const rounds = [...data].reverse();
    const recentRounds = rounds.slice(-30);

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

    renderBigRoad(rounds);

  } catch (error) {
    console.error("Load road history:", error);
    boRoadHistory.innerHTML =
      '<p class="bo-road-empty">Không thể tải lịch sử.</p>';
    if (boBigRoad) {
      boBigRoad.innerHTML =
        '<p class="bo-road-empty">Không thể tải đại lộ.</p>';
    }
  }
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
