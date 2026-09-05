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

const AUTO_BETTING_SECONDS = 30;
const RESULT_DISPLAY_MS = 5000;
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

const boBetAmount = $("boBetAmount");
const boPlaceBet = $("boPlaceBet");
const boBetMessage = $("boBetMessage");

const boBetList = $("boBetList");

const boAdminPanel = $("boAdminPanel");
const boBettingSeconds = $("boBettingSeconds");
const boCreateRound = $("boCreateRound");


// ================================
// HELPERS
// ================================

function formatNXC(value) {

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
    formatNXC(data.balance);

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
      data.name;

    boRoomCode.textContent =
      data.room_code;

    setStatus(
      "Đã kết nối phòng online",
      "ok"
    );

    await loadCurrentRound();

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

  clearInterval(
    countdownTimer
  );

  if (!currentRound) {

    boRoundNumber.textContent = "—";

    boRoundStatus.textContent =
      "Chờ ván";

    boCountdown.textContent = "—";

    boPlayerScore.textContent = "—";
    boBankerScore.textContent = "—";

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

    boPlayerScore.textContent =
      currentRound.player_score ?? "—";

    boBankerScore.textContent =
      currentRound.banker_score ?? "—";

    renderResult();

    boTableMessage.textContent =
      "Ván đã kết thúc";

  } else if (
    currentRound.status ===
    "betting"
  ) {

    boPlayerScore.textContent = "—";
    boBankerScore.textContent = "—";

    boResult.textContent =
      "Đang nhận cược";

    boTableMessage.textContent =
      "Hãy chọn cửa cược";

    startCountdown();

  } else {

    boCountdown.textContent = "—";

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

function scheduleNextRound() {

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


  const finishedAt =
    currentRound.finished_at
      ? new Date(
          currentRound.finished_at
        ).getTime()
      : Date.now();


  const elapsed =
    Date.now() - finishedAt;


  const wait =
    Math.max(
      500,
      RESULT_DISPLAY_MS - elapsed
    );


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
  .querySelectorAll(
    "[data-bo-amount]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        boBetAmount.value =
          button.dataset.boAmount;

        updateBetButton();
      }
    );
  });


boBetAmount?.addEventListener(
  "input",
  updateBetButton
);


// ================================
// BET BUTTON STATE
// ================================

function updateBetButton() {

  if (!boPlaceBet) return;


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
    amount > 0;


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
      amount <= 0
    ) {

      setBetMessage(
        "Số NXC không hợp lệ.",
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
        `✓ Đã cược ${formatNXC(amount)} NXC`
      );


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
              ${formatNXC(bet.amount)} NXC
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
